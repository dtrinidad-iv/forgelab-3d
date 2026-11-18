<script setup lang="ts">
const { steps, stepIndex, isFirst, isLast, next, prev, totalPrice } = useConfigurator()

const nextLabel = computed(() => {
  const upcoming = steps[stepIndex.value + 1]
  return upcoming ? `Next: ${upcoming.label}` : 'Complete build'
})
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Mobile-only compact price -->
    <div class="mr-auto lg:hidden">
      <p class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
      <PriceDisplay :value="totalPrice" />
    </div>

    <button
      type="button"
      class="h-12 rounded-full border border-bone-300 px-5 text-sm font-medium transition-all duration-300 ease-premium hover:border-ink disabled:pointer-events-none disabled:opacity-0 lg:mr-auto"
      :disabled="isFirst"
      @click="prev"
    >
      <span class="hidden sm:inline">Previous</span>
      <span class="sm:hidden" aria-label="Previous">←</span>
    </button>

    <button
      v-if="!isLast"
      type="button"
      class="group flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bone transition-all duration-300 ease-premium hover:bg-ink-700"
      @click="next"
    >
      {{ nextLabel }}
      <span class="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </button>

    <!-- Checkout is out of scope for now; CTA is intentionally disabled. -->
    <button
      v-else
      type="button"
      disabled
      title="Checkout is not implemented yet"
      class="h-12 cursor-not-allowed rounded-full bg-forge px-6 text-sm font-medium text-white opacity-60"
    >
      Complete build
    </button>
  </div>
</template>
