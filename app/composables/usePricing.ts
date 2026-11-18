import { calculatePrice, type PriceBreakdown } from '~/utils/pricing'

/** Reactive wrapper around the pure pricing engine (`utils/pricing.ts`). */
export function usePricing() {
  const { selections } = useConfigurator()
  const { convert } = useCurrency()
  const { selected: cover } = usePieces()

  const breakdown = computed<PriceBreakdown>(() =>
    calculatePrice(selections.value, cover.value ? [{ id: cover.value.id, name: cover.value.name, price: cover.value.price }] : []),
  )
  /** USD (catalog currency). */
  const total = computed(() => breakdown.value.total)

  /**
   * Total in the display currency, computed EXACTLY like the commerce server does: frame + size form
   * one variant, every variant is converted and rounded, then summed. So the configurator total
   * always equals the server-priced cart total (no rounding drift).
   */
  const displayTotal = computed(() => {
    const lines = breakdown.value.lines
    const frameSize = lines.filter((l) => l.group === 'frame' || l.group === 'size').reduce((s, l) => s + l.price, 0)
    const others = lines.filter((l) => l.group !== 'frame' && l.group !== 'size')
    return convert(frameSize) + others.reduce((s, l) => s + convert(l.price), 0)
  })

  return { breakdown, total, displayTotal }
}
