<script setup lang="ts">
const { steps, stepIndex, goTo } = useConfigurator()

const scroller = ref<HTMLElement | null>(null)

// Keep the active step visible in the horizontally scrolling mobile nav.
watch(stepIndex, async (i) => {
  await nextTick()
  const el = scroller.value?.querySelector<HTMLElement>(`[data-step="${i}"]`)
  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})
</script>

<template>
  <nav aria-label="Configuration steps">
    <ol ref="scroller" class="no-scrollbar flex gap-1 overflow-x-auto">
      <li v-for="(step, i) in steps" :key="step.id" :data-step="i" class="shrink-0">
        <button
          type="button"
          class="group flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors duration-300 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-forge"
          :class="
            i === stepIndex
              ? 'bg-ink text-bone'
              : i < stepIndex
                ? 'text-ink hover:bg-bone-200'
                : 'text-graphite hover:bg-bone-200 hover:text-ink'
          "
          :aria-current="i === stepIndex ? 'step' : undefined"
          @click="goTo(i)"
        >
          <span
            class="tabular grid h-5 w-5 place-items-center rounded-full text-[0.68rem] font-semibold transition-colors"
            :class="
              i === stepIndex
                ? 'bg-forge text-white'
                : i < stepIndex
                  ? 'bg-ink text-bone'
                  : 'bg-bone-300 text-graphite'
            "
          >
            <svg v-if="i < stepIndex" viewBox="0 0 12 12" class="h-2.5 w-2.5" aria-hidden="true">
              <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="font-medium">{{ step.label }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>
