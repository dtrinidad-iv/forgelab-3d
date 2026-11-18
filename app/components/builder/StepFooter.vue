<script setup lang="ts">
import { GROUPS } from '~/config/catalog'

const { steps, stepIndex, isFirst, isLast, next, prev, currentMissing, showValidation } = useConfiguratorSteps()
const { total, breakdown } = usePricing()
const { errors } = useCompatibility()
const { addToCart, status: cartStatus } = useCommerce()
const canCheckout = computed(() => breakdown.value.missing.length === 0 && errors.value.length === 0)

const nextLabel = computed(() => {
  const upcoming = steps[stepIndex.value + 1]
  return upcoming ? `Next: ${upcoming.label}` : ''
})

const hint = computed(() => {
  if (showValidation.value && currentMissing.value.length) {
    return `Select ${currentMissing.value.map((g) => GROUPS[g].label.toLowerCase()).join(', ')} to continue`
  }
  if (isLast.value) {
    if (breakdown.value.missing.length) return `${breakdown.value.missing.length} required selection${breakdown.value.missing.length > 1 ? 's' : ''} missing`
    if (errors.value.length) return `Resolve ${errors.value.length} compatibility issue${errors.value.length > 1 ? 's' : ''} before checkout`
  }
  return ''
})
</script>

<template>
  <div>
    <p v-if="hint" class="mb-2 text-right text-xs font-medium text-forge-600" role="status">{{ hint }}</p>

    <div class="flex items-center gap-3">
      <!-- Running total (the configuration column's footer on desktop, bottom bar on mobile) -->
      <div class="mr-auto">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
        <PriceDisplay :value="total" />
      </div>

      <button
        type="button"
        class="h-12 rounded-full border border-bone-300 px-5 text-sm font-medium transition-all duration-300 ease-premium hover:border-ink disabled:pointer-events-none disabled:opacity-0"
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

      <!-- Goes through the CommerceProvider (mock today, Shopify later); server validates + prices. -->
      <button
        v-else
        type="button"
        :disabled="!canCheckout || cartStatus === 'working'"
        class="h-12 rounded-full bg-forge px-6 text-sm font-medium text-white transition-colors hover:bg-forge-600 disabled:cursor-not-allowed disabled:opacity-60"
        @click="addToCart"
      >
        {{ cartStatus === 'working' ? 'Adding…' : 'Add to cart' }}
      </button>
    </div>
  </div>
</template>
