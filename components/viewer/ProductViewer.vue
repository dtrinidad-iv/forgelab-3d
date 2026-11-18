<script setup lang="ts">
/**
 * ProductViewer — reusable Three.js viewer (client-only; wrap in <ClientOnly>).
 *
 * Tries to load `modelUrl`. If the file doesn't exist yet, it falls back to a clearly
 * labelled TEMPORARY placeholder. If the file exists but fails to load, it shows an
 * error state with retry. All GPU resources are released on unmount.
 *
 * Three.js objects are kept in plain (non-reactive) variables on purpose:
 * wrapping them in Vue proxies breaks Three internals and hurts performance.
 */
import type { Object3D } from 'three'
import { createScene, WebGLUnavailableError, type ViewerContext } from '~/lib/three/createScene'
import { disposeObject3D } from '~/lib/three/dispose'
import { frameObject, loadModel, ModelNotFoundError } from '~/lib/three/loadModel'
import { createPlaceholderBike } from '~/lib/three/placeholder'

type ViewerStatus = 'loading' | 'ready' | 'placeholder' | 'error'

const props = withDefaults(defineProps<{ modelUrl?: string; autoRotate?: boolean }>(), {
  modelUrl: '/models/bicycle/road-bike.glb',
  autoRotate: false,
})

const emit = defineEmits<{
  loaded: [payload: { placeholder: boolean }]
  error: [error: Error]
}>()

const container = ref<HTMLDivElement | null>(null)
const status = ref<ViewerStatus>('loading')
const progress = ref(0)
const errorMessage = ref('')
const canRetry = ref(true)

let ctx: ViewerContext | null = null
let modelRoot: Object3D | null = null
let frameId = 0
let resizeObserver: ResizeObserver | null = null
let abort: AbortController | null = null
let disposed = false

function renderLoop() {
  if (!ctx || disposed) return
  frameId = requestAnimationFrame(renderLoop)
  if (document.hidden) return
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
  frameObject(object, ctx.camera, ctx.controls)
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
    const model = await loadModel(props.modelUrl, (r) => (progress.value = r), signal)
    if (disposed || signal.aborted) {
      disposeObject3D(model)
      return
    }
    setModel(model)
    status.value = 'ready'
    emit('loaded', { placeholder: false })
  } catch (err) {
    if (disposed || signal.aborted) return
    if (err instanceof ModelNotFoundError) {
      setModel(createPlaceholderBike())
      status.value = 'placeholder'
      emit('loaded', { placeholder: true })
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
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container.value)
  resize()
  renderLoop()
  load()
})

watch(() => props.modelUrl, () => load())
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
  disposeObject3D(ctx.ground)
  ctx.scene.environment?.dispose()
  ctx.pmrem.dispose()
  ctx.controls.dispose()
  ctx.renderer.dispose()
  ctx.renderer.forceContextLoss()
  ctx.renderer.domElement.remove()
  ctx = null
})

/** Exposed for future component-replacement work (needs the real GLB with named nodes). */
defineExpose({ getModelRoot: () => modelRoot, reload: load })
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

    <!-- Placeholder notice -->
    <div
      v-if="status === 'placeholder'"
      class="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-dashed border-forge/60 bg-white/80 px-3 py-1.5 text-[0.7rem] font-medium text-forge-600 backdrop-blur sm:right-6 sm:top-5"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-forge" aria-hidden="true" />
      Temporary placeholder · road-bike.glb not found
    </div>

    <p
      v-if="status === 'ready' || status === 'placeholder'"
      class="pointer-events-none absolute bottom-4 right-4 hidden text-[0.7rem] uppercase tracking-[0.14em] text-graphite-400 sm:block sm:bottom-6 sm:right-6"
    >
      Drag to rotate · Scroll to zoom
    </p>
  </div>
</template>
