<script setup lang="ts">
const { steps, stepIndex, goTo, canVisit, isStepComplete } = useConfiguratorSteps()
const { stepHasError } = useCompatibility()

const scroller = ref<HTMLElement | null>(null)

// Keep the active step visible in the horizontally scrolling mobile nav.
watch(stepIndex, async (i) => {
  await nextTick()
  const el = scroller.value?.querySelector<HTMLElement>(`[data-step="${i}"]`)
  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})

/** Progress over the selection steps (Review excluded). */
const progress = computed(() => {
  const selectable = steps.filter((s) => s.id !== 'review')
  const done = selectable.filter((s) => isStepComplete(steps.indexOf(s))).length
  return { done, total: selectable.length, pct: Math.round((done / selectable.length) * 100) }
})

type State = 'current' | 'complete' | 'available' | 'locked'
function stateOf(i: number): State {
  if (i === stepIndex.value) return 'current'
  if (!canVisit(i)) return 'locked'
  return isStepComplete(i) ? 'complete' : 'available'
}
</script>

<template>
  <nav aria-label="Configuration steps">
    <ol ref="scroller" class="no-scrollbar flex gap-1 overflow-x-auto lg:grid lg:grid-cols-7 lg:overflow-visible">
      <li v-for="(step, i) in steps" :key="step.id" :data-step="i" class="shrink-0">
        <button
          type="button"
          class="group relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors duration-300 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-forge disabled:cursor-not-allowed lg:w-full lg:flex-col lg:gap-1.5 lg:rounded-xl lg:px-1 lg:py-2.5 lg:text-[0.72rem]"
          :class="{
            'bg-ink text-bone': stateOf(i) === 'current',
            'text-ink hover:bg-bone-200': stateOf(i) === 'complete',
            'text-graphite hover:bg-bone-200 hover:text-ink': stateOf(i) === 'available',
            'text-graphite-300': stateOf(i) === 'locked',
          }"
          :disabled="stateOf(i) === 'locked'"
          :aria-current="stateOf(i) === 'current' ? 'step' : undefined"
          :aria-label="`Step ${i + 1}: ${step.label}${isStepComplete(i) ? ' (complete)' : ''}${stepHasError(step) ? ' (compatibility issue)' : ''}`"
          @click="goTo(i)"
        >
          <span
            class="tabular grid h-5 w-5 place-items-center rounded-full text-[0.68rem] font-semibold transition-colors"
            :class="{
              'bg-forge text-white': stateOf(i) === 'current',
              'bg-ink text-bone': stateOf(i) === 'complete',
              'bg-bone-300 text-graphite': stateOf(i) === 'available',
              'border border-bone-300 text-graphite-300': stateOf(i) === 'locked',
            }"
          >
            <svg v-if="stateOf(i) === 'complete'" viewBox="0 0 12 12" class="h-2.5 w-2.5" aria-hidden="true">
              <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="font-medium lg:leading-none">{{ step.label }}</span>
          <span v-if="stepHasError(step)" class="-ml-0.5 h-1.5 w-1.5 rounded-full bg-forge lg:absolute lg:right-2 lg:top-2 lg:ml-0" aria-hidden="true" />
        </button>
      </li>
    </ol>

    <!-- Progress -->
    <div class="mt-2 flex items-center gap-3 px-1 lg:mt-3">
      <div class="h-1 flex-1 overflow-hidden rounded-full bg-bone-300" role="progressbar" :aria-valuenow="progress.done" :aria-valuemin="0" :aria-valuemax="progress.total" aria-label="Steps completed">
        <div class="h-full rounded-full bg-forge transition-[width] duration-500 ease-premium" :style="{ width: `${progress.pct}%` }" />
      </div>
      <span class="tabular shrink-0 text-[0.7rem] font-medium text-graphite">{{ progress.done }}/{{ progress.total }} complete</span>
    </div>
  </nav>
</template>
