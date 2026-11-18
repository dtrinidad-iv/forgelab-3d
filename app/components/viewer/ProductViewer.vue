<script setup lang="ts">
/**
 * ProductViewer — reusable Three.js viewer (client-only; wrap in <ClientOnly>).
 *
 * Loads the model described by `assetMap`, resolves logical components through the
 * asset-mapping layer, and applies `target` (paint + component variants) via ConfiguratorScene.
 * Emits `visual-status` with what ACTUALLY changed per group — the UI relies on it to stay honest.
 * If the file doesn't exist it falls back to a clearly labelled TEMPORARY placeholder.
 *
 * Three.js objects live in plain variables on purpose — Vue proxies break Three internals.
 */
import { type Object3D, Vector3 } from 'three'
import { FORGELAB_ROAD_BIKE, type ModelAssetMap } from '~/config/assetMap'
import { GROUPS } from '~/config/catalog'
import type { GroupId } from '~/types/configurator'
import { ConfiguratorScene, MissingAssetError, type VisualStatus, type VisualTarget } from '~/utils/three/configuratorScene'
import { type AssetMappingResult, resolveAssetMap } from '~/utils/three/assetMapping'
import { createScene, type ViewerContext, WebGLUnavailableError } from '~/utils/three/createScene'
import { disposeObject3D } from '~/utils/three/dispose'
import { AR_UNAVAILABLE_HASH, exportUsdz, isAndroid, openQuickLook, sceneViewerIntent, supportsQuickLook } from '~/utils/three/ar'
import { ExplodedView } from '~/utils/three/explodedView'
import { LIGHTING_PRESETS, type LightingPresetId, LightingRig } from '~/utils/three/lighting'
import { formatReport, inspectModel } from '~/utils/three/inspectModel'
import { type CameraView, frameObject, loadModel, ModelNotFoundError } from '~/utils/three/loadModel'
import { createPlaceholderBike } from '~/utils/three/placeholder'

type ViewerStatus = 'loading' | 'ready' | 'placeholder' | 'error'

const props = withDefaults(
  defineProps<{
    assetMap?: ModelAssetMap
    target?: VisualTarget
    autoRotate?: boolean
    /** Path of a server-built GLB of the current build (Android Scene Viewer needs a public URL). */
    arModelPath?: string
  }>(),
  {
  assetMap: () => FORGELAB_ROAD_BIKE,
  autoRotate: false,
  arModelPath: undefined,
  },
)

const emit = defineEmits<{
  loaded: [payload: { placeholder: boolean; mapping: AssetMappingResult | null }]
  error: [error: Error]
  'visual-status': [statuses: Partial<Record<GroupId, VisualStatus>>]
}>()

const container = ref<HTMLDivElement | null>(null)
const status = ref<ViewerStatus>('loading')
const progress = ref(0)
const errorMessage = ref('')
const canRetry = ref(true)
const missingComponents = ref<string[]>([])
const isExploded = ref(false)
const lighting = ref<LightingPresetId>('studio')
// ---- AR state ----
const arQuickLook = ref(false) // iOS AR Quick Look available
const arAndroid = ref(false) // Android → Google Scene Viewer
const usdzReady = ref(false)
const arError = ref('')
let arErrorTimer: ReturnType<typeof setTimeout> | undefined
function showArError(message: string) {
  arError.value = message
  clearTimeout(arErrorTimer)
  arErrorTimer = setTimeout(() => (arError.value = ''), 8000)
}
const statuses = ref<Partial<Record<GroupId, VisualStatus>>>({})
const updating = computed(() =>
  (Object.entries(statuses.value) as [GroupId, VisualStatus][])
    .filter(([, s]) => s.state === 'loading')
    .map(([g]) => GROUPS[g].label.toLowerCase()),
)
watch(statuses, (v) => emit('visual-status', { ...v }), { deep: true })

let ctx: ViewerContext | null = null
let modelRoot: Object3D | null = null
let mapping: AssetMappingResult | null = null
let configurator: ConfiguratorScene | null = null
let exploded: ExplodedView | null = null
let rig: LightingRig | null = null
/** Last target handed to the scene (plain copy, used to diff). */
let appliedTarget: VisualTarget | null = null
let home: CameraView | null = null
let usdz: Uint8Array | null = null
let usdzTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | null = null
let abort: AbortController | null = null
let disposed = false

// ---- Camera tween (reset / zoom buttons) ----
interface Tween {
  fromPos: Vector3
  toPos: Vector3
  fromTarget: Vector3
  toTarget: Vector3
  start: number
  duration: number
}
let tween: Tween | null = null

function animateTo(position: Vector3, target: Vector3, duration = 650) {
  if (!ctx) return
  tween = {
    fromPos: ctx.camera.position.clone(),
    toPos: position.clone(),
    fromTarget: ctx.controls.target.clone(),
    toTarget: target.clone(),
    start: performance.now(),
    duration,
  }
}

function stepTween(now: number) {
  if (!ctx || !tween) return
  const t = Math.min((now - tween.start) / tween.duration, 1)
  const e = 1 - Math.pow(1 - t, 3)
  ctx.camera.position.lerpVectors(tween.fromPos, tween.toPos, e)
  ctx.controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e)
  if (t >= 1) tween = null
}

function resetView() {
  if (home) animateTo(home.position, home.target)
}

function setLighting(id: LightingPresetId) {
  lighting.value = id
  rig?.set(id)
}

/** Exploded assembly toggle; pulls the camera back so the spread-out parts stay in frame. */
function toggleExploded() {
  if (!exploded) return
  isExploded.value = !isExploded.value
  exploded.set(isExploded.value)
  zoom(isExploded.value ? 1.35 : 1 / 1.35)
}

function zoom(factor: number) {
  if (!ctx) return
  const { camera, controls } = ctx
  const offset = camera.position.clone().sub(controls.target)
  const distance = Math.min(Math.max(offset.length() * factor, controls.minDistance), controls.maxDistance)
  animateTo(controls.target.clone().add(offset.setLength(distance)), controls.target, 350)
}

// ---- Render loop / sizing ----
function renderLoop(now: number) {
  if (!ctx || disposed || document.hidden) return
  stepTween(now)
  configurator?.update(now)
  exploded?.update(now)
  rig?.update(now)
  ctx.controls.update()
  ctx.renderer.render(ctx.scene, ctx.camera)
}

// ---- AR: iOS Quick Look (USDZ of the current build, prepared ahead so the tap opens it directly) ----
function scheduleUsdz() {
  if (!arQuickLook.value || !modelRoot || status.value !== 'ready') return
  usdzReady.value = false
  clearTimeout(usdzTimer)
  usdzTimer = setTimeout(async () => {
    const model = modelRoot
    if (!model) return
    try {
      usdz = await exportUsdz(model)
      if (model === modelRoot) usdzReady.value = true
    } catch (err) {
      console.error('[ProductViewer] USDZ export failed:', err)
      showArError("AR couldn't be prepared for this build.")
    }
  }, 900)
}

function openAR() {
  if (arQuickLook.value) {
    if (usdz && usdzReady.value) openQuickLook(usdz) // synchronous inside the tap (Safari requirement)
    else showArError('AR is still being prepared — try again in a moment.')
    return
  }
  if (arAndroid.value) {
    if (!props.arModelPath) return showArError('AR is not available for this model.')
    const page = window.location.href.split('#')[0]!
    const model = new URL(props.arModelPath, window.location.origin).toString()
    window.location.href = sceneViewerIntent(model, page + AR_UNAVAILABLE_HASH, 'ForgeLab — your build')
  }
}

function resize() {
  if (!ctx || !container.value) return
  const { clientWidth: w, clientHeight: h } = container.value
  if (w === 0 || h === 0) return
  ctx.camera.aspect = w / h
  ctx.camera.updateProjectionMatrix()
  ctx.renderer.setSize(w, h, false)
}

// ---- Configuration → 3D ----
const cloneTarget = (t: VisualTarget): VisualTarget => JSON.parse(JSON.stringify(t))

/**
 * Component files are loaded through the same loader as the main model, via a shared cache so a
 * prefetched file is never downloaded twice (ConfiguratorScene receives the same promise).
 */
const componentCache = new Map<string, Promise<Object3D>>()
function loadComponent(url: string): Promise<Object3D> {
  let p = componentCache.get(url)
  if (!p) {
    p = loadModel(url).catch((err) => {
      componentCache.delete(url) // allow a retry
      if (err instanceof ModelNotFoundError) throw new MissingAssetError(`Missing 3D asset: ${url}`)
      throw err
    })
    componentCache.set(url, p)
  }
  return p
}

/** Start downloading the part files the current target needs, in parallel with the base model. */
function prefetchComponents(target: VisualTarget | undefined) {
  if (!target) return
  for (const [group, visual] of Object.entries(props.assetMap.visuals) as [GroupId, NonNullable<ModelAssetMap['visuals'][GroupId]>][]) {
    if (visual.kind !== 'component') continue
    const option = target.variants[group]
    if (!option || option === props.assetMap.bakedVariants[group]) continue
    const url = visual.variants[option]
    if (url) loadComponent(url).catch(() => {}) // errors are reported when the scene applies it
  }
}

function setGroupStatus(group: GroupId, status: VisualStatus) {
  statuses.value = { ...statuses.value, [group]: status }
}

/** Applies only the groups that changed since the last call. */
function applyTarget(next: VisualTarget | undefined, animate = true): Promise<unknown> {
  if (!configurator || !next) return Promise.resolve()
  const scene = configurator
  const prev = appliedTarget
  appliedTarget = cloneTarget(next)
  const jobs: Promise<unknown>[] = []

  if (!prev || JSON.stringify(prev.paint) !== JSON.stringify(next.paint)) {
    setGroupStatus('paint', scene.applyPaint(next.paint, animate))
  }
  const jobByGroup = new Map<GroupId, Promise<unknown>>()
  const derived: GroupId[] = []
  for (const group of Object.keys(next.variants) as GroupId[]) {
    const option = next.variants[group] ?? null
    const visual = props.assetMap.visuals[group]
    if (visual?.kind === 'derived') {
      derived.push(group)
      continue
    }
    if (prev && (prev.variants[group] ?? null) === option && statuses.value[group]) continue
    if (visual?.kind === 'component' && option && scene.shownVariant(group) !== option) {
      setGroupStatus(group, { state: 'loading', kind: 'component' })
    }
    const job = scene.setVariant(group, option).then((result) => {
      // Ignore results for selections the customer has already changed again.
      if (configurator === scene && (appliedTarget?.variants[group] ?? null) === option) setGroupStatus(group, result)
    })
    jobByGroup.set(group, job)
    jobs.push(job)
  }
  // Derived groups (size) report only after their source group (frame) has actually been mounted.
  for (const group of derived) {
    const visual = props.assetMap.visuals[group]
    if (visual?.kind !== 'derived') continue
    const option = next.variants[group] ?? null
    if (jobByGroup.has(visual.from)) setGroupStatus(group, { state: 'loading', kind: 'component' })
    jobs.push(
      (jobByGroup.get(visual.from) ?? Promise.resolve()).then(async () => {
        const result = await scene.setVariant(group, option)
        if (configurator === scene && (appliedTarget?.variants[group] ?? null) === option) setGroupStatus(group, result)
      }),
    )
  }
  return Promise.all(jobs)
}

function markPlaceholderStatuses() {
  const groups = new Set<GroupId>(['paint', ...((Object.keys(props.target?.variants ?? {}) as GroupId[]))])
  statuses.value = Object.fromEntries(
    [...groups].map((g) => [g, { state: 'unsupported', message: 'Placeholder model — selections are not shown in 3D.' } satisfies VisualStatus]),
  )
}

async function disposeConfigurator() {
  const scene = configurator
  configurator = null
  appliedTarget = null
  await scene?.dispose()
}

function setModel(object: Object3D) {
  if (!ctx) return
  void disposeConfigurator()
  if (modelRoot) disposeObject3D(modelRoot)
  modelRoot = object
  ctx.scene.add(object)
  home = frameObject(object, ctx.camera, ctx.controls)
}

function reportInDev(model: Object3D, result: AssetMappingResult) {
  if (!import.meta.dev) return
  console.groupCollapsed(`[ForgeLab] Model inspection — ${props.assetMap.url}`)
  console.log(formatReport(inspectModel(model), props.assetMap.id))
  console.log('Mapped components:', result.found)
  if (result.missing.length) console.warn('Missing components:', result.missing)
  if (result.missingMaterials.length) console.warn('Missing materials:', result.missingMaterials)
  console.groupEnd()
}

async function load() {
  if (!ctx) return
  abort?.abort()
  abort = new AbortController()
  const { signal } = abort

  status.value = 'loading'
  progress.value = 0
  errorMessage.value = ''

  try {
    prefetchComponents(props.target)
    const model = await loadModel(props.assetMap.url, (r) => (progress.value = r), signal)
    if (disposed || signal.aborted) {
      disposeObject3D(model)
      return
    }
    setModel(model)
    mapping = resolveAssetMap(model, props.assetMap)
    missingComponents.value = mapping.missing
    reportInDev(model, mapping)
    configurator = new ConfiguratorScene(model, props.assetMap, loadComponent)
    exploded = Object.keys(props.assetMap.explode).length ? new ExplodedView(model, props.assetMap.explode) : null
    isExploded.value = false
    // Apply the saved/current configuration before revealing the model.
    await applyTarget(props.target, false)
    if (disposed || signal.aborted) return
    status.value = 'ready'
    // Catch selections made while the model was loading.
    void applyTarget(props.target).then(scheduleUsdz)
    emit('loaded', { placeholder: false, mapping })
  } catch (err) {
    if (disposed || signal.aborted) return
    if (err instanceof ModelNotFoundError) {
      setModel(createPlaceholderBike())
      mapping = null
      exploded = null
      isExploded.value = false
      markPlaceholderStatuses()
      status.value = 'placeholder'
      emit('loaded', { placeholder: true, mapping: null })
      return
    }
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[ProductViewer] Failed to load model:', error)
    errorMessage.value = error.message
    status.value = 'error'
    emit('error', error)
  }
}

onMounted(() => {
  if (!container.value) return
  try {
    ctx = createScene(container.value)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    canRetry.value = !(err instanceof WebGLUnavailableError)
    errorMessage.value = error.message
    status.value = 'error'
    emit('error', error)
    return
  }

  ctx.controls.autoRotate = props.autoRotate
  rig = new LightingRig(ctx)
  arQuickLook.value = supportsQuickLook()
  arAndroid.value = !arQuickLook.value && isAndroid()
  // Coming back from an Android intent that couldn't open Scene Viewer.
  if (window.location.hash === AR_UNAVAILABLE_HASH) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    showArError("AR couldn't open: Google's Scene Viewer isn't available on this device (it needs the Google app and ARCore).")
  }
  // Manual interaction cancels any running camera animation.
  ctx.controls.addEventListener('start', () => (tween = null))
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  resize()
  ctx.renderer.setAnimationLoop(renderLoop)
  load()
})

watch(() => props.assetMap.url, () => load())
watch(
  () => props.target,
  (next) => {
    if (status.value === 'ready') void applyTarget(next).then(scheduleUsdz)
    else if (status.value === 'placeholder') markPlaceholderStatuses()
  },
  { deep: true },
)
watch(
  () => props.autoRotate,
  (v) => ctx && (ctx.controls.autoRotate = v),
)

onBeforeUnmount(() => {
  disposed = true
  abort?.abort()
  clearTimeout(usdzTimer)
  clearTimeout(arErrorTimer)
  ctx?.renderer.setAnimationLoop(null)
  resizeObserver?.disconnect()
  resizeObserver = null

  if (!ctx) return
  void disposeConfigurator()
  exploded = null
  rig = null
  componentCache.clear()
  if (modelRoot) disposeObject3D(modelRoot)
  modelRoot = null
  mapping = null
  disposeObject3D(ctx.ground)
  ctx.scene.environment?.dispose()
  ctx.pmrem.dispose()
  ctx.controls.dispose()
  ctx.renderer.dispose()
  ctx.renderer.forceContextLoss()
  ctx.renderer.domElement.remove()
  ctx = null
})

/** Exposed for the component-replacement / material layers (Phase 3). */
defineExpose({
  getModelRoot: () => modelRoot,
  getMapping: () => configurator?.getMapping() ?? mapping,
  resetView,
  zoom,
  toggleExploded,
  setLighting,
  openAR,
  reload: load,
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="container" class="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />

    <!-- Loading -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-500"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="status === 'loading'" class="absolute inset-0 grid place-items-center" role="status">
        <div class="flex flex-col items-center gap-3">
          <span class="h-8 w-8 animate-spin rounded-full border-2 border-bone-300 border-t-ink" />
          <span class="tabular text-xs uppercase tracking-[0.14em] text-graphite">
            Loading model{{ progress > 0 ? ` · ${Math.round(progress * 100)}%` : '' }}
          </span>
        </div>
      </div>
    </Transition>

    <!-- Error -->
    <div v-if="status === 'error'" class="absolute inset-0 grid place-items-center p-6" role="alert">
      <div class="max-w-sm rounded-2xl border border-bone-300 bg-white/90 p-6 text-center backdrop-blur">
        <p class="font-display text-lg font-semibold">The 3D preview couldn't load</p>
        <p class="mt-1 text-sm text-graphite">{{ errorMessage }}</p>
        <button
          v-if="canRetry"
          type="button"
          class="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-bone hover:bg-ink-700"
          @click="load"
        >
          Try again
        </button>
      </div>
    </div>

    <!-- AR errors are always visible (never fail silently) -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-300" leave-to-class="opacity-0">
      <div
        v-if="arError"
        class="absolute inset-x-3 top-16 z-10 mx-auto max-w-md rounded-2xl bg-ink/90 px-4 py-3 text-sm text-bone shadow-lg sm:top-20"
        role="alert"
      >
        {{ arError }}
      </div>
    </Transition>

    <!-- Lighting presets -->
    <div
      v-if="status === 'ready' || status === 'placeholder'"
      role="radiogroup"
      aria-label="Lighting"
      class="absolute left-3 top-3 flex rounded-full border border-bone-300 bg-white/80 p-0.5 text-[0.7rem] font-medium backdrop-blur sm:left-6 sm:top-5 lg:left-10"
    >
      <button
        v-for="preset in LIGHTING_PRESETS"
        :key="preset.id"
        type="button"
        role="radio"
        :aria-checked="lighting === preset.id"
        class="rounded-full px-2.5 py-1 transition-colors duration-200 sm:px-3"
        :class="lighting === preset.id ? 'bg-ink text-bone' : 'text-graphite hover:text-ink'"
        @click="setLighting(preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Asset provenance / placeholder notice -->
    <div class="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1.5 sm:right-6 sm:top-5">
      <div
        v-if="status === 'placeholder'"
        class="flex items-center gap-2 rounded-full border border-dashed border-forge/60 bg-white/80 px-3 py-1.5 text-[0.7rem] font-medium text-forge-600 backdrop-blur"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-forge" aria-hidden="true" />
        Temporary placeholder · model file not found
      </div>
      <div
        v-else-if="status === 'ready'"
        class="rounded-full bg-white/70 px-3 py-1.5 text-[0.68rem] font-medium text-graphite backdrop-blur"
        :title="assetMap.source.license"
      >
        {{ assetMap.source.label }}
      </div>
      <div
        v-if="status === 'ready' && missingComponents.length"
        class="rounded-full bg-forge-100 px-3 py-1.5 text-[0.68rem] font-medium text-forge-600"
        :title="missingComponents.join(', ')"
      >
        {{ missingComponents.length }} component{{ missingComponents.length > 1 ? 's' : '' }} not in model
      </div>
    </div>

    <!-- Component loading -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-300"
      leave-to-class="opacity-0"
    >
      <div
        v-if="updating.length"
        class="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/90 px-3.5 py-1.5 text-[0.7rem] font-medium text-bone sm:top-5"
        role="status"
      >
        <span class="h-3 w-3 animate-spin rounded-full border border-bone/40 border-t-bone" aria-hidden="true" />
        Updating {{ updating.join(', ') }}…
      </div>
    </Transition>

    <!-- View controls -->
    <div
      v-if="status === 'ready' || status === 'placeholder'"
      class="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-6 sm:right-6 sm:gap-3"
    >
      <p class="pointer-events-none hidden text-[0.7rem] uppercase tracking-[0.14em] text-graphite-400 2xl:block">
        Drag to rotate · Scroll to zoom
      </p>
      <button
        v-if="status === 'ready' && (arQuickLook || arAndroid)"
        type="button"
        class="flex h-10 items-center gap-2 rounded-full bg-forge px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-forge-600 disabled:opacity-60"
        :disabled="arQuickLook && !usdzReady"
        title="View this exact build in your space at real size"
        @click="openAR"
      >
        <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
          <path d="M8 1.8l5.4 3.1v6.2L8 14.2l-5.4-3.1V4.9L8 1.8zM2.8 5L8 8l5.2-3M8 8v6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
        </svg>
        <span class="sm:hidden">{{ arQuickLook && !usdzReady ? '…' : 'AR' }}</span>
        <span class="hidden sm:inline">{{ arQuickLook && !usdzReady ? 'Preparing AR…' : 'View in AR' }}</span>
      </button>
      <button
        v-if="status === 'ready'"
        type="button"
        class="flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium backdrop-blur transition-colors duration-200"
        :class="isExploded ? 'border-ink bg-ink text-bone' : 'border-bone-300 bg-white/80 text-ink hover:bg-bone-200'"
        :aria-pressed="isExploded"
        title="Exploded assembly view"
        @click="toggleExploded"
      >
        <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
          <path d="M6 6L2.5 2.5M2.5 2.5h2.8M2.5 2.5v2.8M10 6l3.5-3.5M13.5 2.5h-2.8M13.5 2.5v2.8M6 10l-3.5 3.5M2.5 13.5h2.8M2.5 13.5v-2.8M10 10l3.5 3.5M13.5 13.5h-2.8M13.5 13.5v-2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="hidden sm:inline">{{ isExploded ? 'Assemble' : 'Explode' }}</span>
      </button>
      <div class="flex overflow-hidden rounded-full border border-bone-300 bg-white/80 backdrop-blur">
        <button type="button" class="viewer-btn" aria-label="Zoom out" title="Zoom out" @click="zoom(1.25)">
          <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
        <button type="button" class="viewer-btn border-x border-bone-300" aria-label="Zoom in" title="Zoom in" @click="zoom(0.8)">
          <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true"><path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
        <button type="button" class="viewer-btn" aria-label="Reset view" title="Reset view" @click="resetView">
          <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
            <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.75M2.8 2.6v2.9h2.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-btn {
  @apply grid h-10 w-10 place-items-center text-ink transition-colors duration-200 hover:bg-bone-200 focus:outline-none focus-visible:bg-bone-200;
}
</style>
