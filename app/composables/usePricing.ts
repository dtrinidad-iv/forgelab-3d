import { calculatePrice, type PriceBreakdown } from '~/utils/pricing'

/** Reactive wrapper around the pure pricing engine (`utils/pricing.ts`). */
export function usePricing() {
  const { selections } = useConfigurator()

  const breakdown = computed<PriceBreakdown>(() => calculatePrice(selections.value))
  const total = computed(() => breakdown.value.total)

  return { breakdown, total }
}
