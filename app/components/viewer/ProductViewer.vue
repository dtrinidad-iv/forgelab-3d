<script setup lang="ts">
/**
 * ProductViewer — reusable Three.js viewer (client-only; wrap in <ClientOnly>).
 *
 * Loads the model described by `assetMap`, resolves logical components through the
 * asset-mapping layer, and reports missing parts. If the file doesn't exist it falls back
 * to a clearly labelled TEMPORARY placeholder; if it exists but fails, it shows an error.
 *
 * Three.js objects live in plain variables on purpose — Vue proxies break Three internals.
 */
import { type Object3D, Vector3 } from 'three'
import { FORGELAB_ROAD_BIKE, type ModelAssetMap } from '~/config/assetMap'
import { type AssetMappingResult, resolveAssetMap } from '~/utils/three/assetMapping'
import { createScene, type ViewerContext, WebGLUnavailableError } from '~/utils/three/createScene'
import { disposeObject3D } from '~/utils/three/dispose'
import { formatReport, inspectModel } from '~/utils/three/inspectModel'
import { type CameraView, frameObject, loadModel, ModelNotFoundError } from '~/utils/three/loadModel'
import { createPlaceholderBike } from '~/utils/three/placeholder'

type ViewerStatus = 'loading' | 'ready' | 'placeholder' | 'error'

const props = withDefaults(defineProps<{ assetMap?: ModelAssetMap; autoRotate?: boolean }>(), {
  assetMap: () => FORGELAB_ROAD_BIKE,
  autoRotate: false,
})

const emit = defineEmits<{
  loaded: [payload: { placeholder: boolean; mapping: AssetMappingResult | null }]
  error: [error: Error]
}>()

const container = ref<HTMLDivElement | null>(null)
const status = ref<ViewerStatus>('loading')
const progress = ref(0)
const errorMessage = ref('')
const canRetry = ref(true)
const missingComponents = ref<string[]>([])

let ctx: ViewerContext | null = null
let modelRoot: Object3D | null = null
let mapping: AssetMappingResult | null = null
let home: CameraView | null = null
let frameId = 0
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

function zoom(factor: number) {
  if (!ctx) return
  const { camera, controls } = ctx
  const offset = camera.position.clone().sub(controls.target)
  const distance = Math.min(Math.max(offset.length() * factor, controls.minDistance), controls.maxDistance)
  animateTo(controls.target.clone().add(offset.setLength(distance)), controls.target, 350)
}

// ---- Render loop / sizing ----
function renderLoop(now = performance.now()) {
  if (!ctx || disposed) return
  frameId = requestAnimationFrame(renderLoop)
  if (document.hidden) return
  stepTween(now)
  ctx.controls.update()
  ctx.renderer.render(ctx.scene, ctx.camera)
}

function resize() {
  if (!ctx || !container.value) return
  const { clientWidth: w, clientHeight: h } = container.value
  if (w === 0 || h === 0) return
  ctx.camera.aspect = w / h
  ctx.camera.updateProjectionMatrix()
  ctx.renderer.setSize(w, h, false)
}

function setModel(object: Object3D) {
  if (!ctx) return
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
    const model = await loadModel(props.assetMap.url, (r) => (progress.value = r), signal)
    if (disposed || signal.aborted) {
      disposeObject3D(model)
      return
    }
    setModel(model)
    mapping = resolveAssetMap(model, props.assetMap)
    missingComponents.value = mapping.missing
    reportInDev(model, mapping)
    status.value = 'ready'
    emit('loaded', { placeholder: false, mapping })
  } catch (err) {
    if (disposed || signal.aborted) return
    if (err instanceof ModelNotFoundError) {
      setModel(createPlaceholderBike())
      mapping = null
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
  // Manual interaction cancels any running camera animation.
  ctx.controls.addEventListener('start', () => (tween = null))
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  resize()
  renderLoop()
  load()
})

watch(() => props.assetMap.url, () => load())
watch(
  () => props.autoRotate,
  (v) => ctx && (ctx.controls.autoRotate = v),
)

onBeforeUnmount(() => {
  disposed = true
  abort?.abort()
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  resizeObserver = null

  if (!ctx) return
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
  getMapping: () => mapping,
  resetView,
  zoom,
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

    <!-- View controls -->
    <div
      v-if="status === 'ready' || status === 'placeholder'"
      class="absolute bottom-4 right-4 flex items-center gap-3 sm:bottom-6 sm:right-6"
    >
      <p class="pointer-events-none hidden text-[0.7rem] uppercase tracking-[0.14em] text-graphite-400 xl:block">
        Drag to rotate · Scroll to zoom
      </p>
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
