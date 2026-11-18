import { liveFrameSizePrice, liveOptionPrice } from '~/commerce/liveCatalog'
import { destinationOf } from '~/config/shipping'
import type { GroupId } from '~/types/configurator'
import { findOption } from '~/utils/configuration'
import { formatMoney } from '~/utils/money'
import { calculatePrice, type PriceBreakdown } from '~/utils/pricing'

/**
 * Reactive pricing for the configurator. DISPLAY ONLY — the commerce server re-prices every cart.
 *
 * Prices come from Shopify's live catalog when it's loaded (useLiveCatalog), else from the code's
 * catalog (USD). Shown in the display currency: used as-is when Shopify priced the market in that
 * currency, otherwise converted at the fixed demo rates (Shopify's USD → EUR, etc.).
 */
export function usePricing() {
  const { selections } = useConfigurator()
  const { currency, convert } = useCurrency()
  const { selected: cover } = usePieces()
  const { live: liveCatalog, failed: liveFailed } = useLiveCatalog()

  const breakdown = computed<PriceBreakdown>(() =>
    calculatePrice(selections.value, cover.value ? [{ id: cover.value.id, name: cover.value.name, price: cover.value.price }] : []),
  )
  /** USD catalog total (code prices; not Shopify's). */
  const total = computed(() => breakdown.value.total)

  /** Live catalog we can show in the display currency (same currency, or USD we can convert). */
  const live = computed(() => {
    const l = liveCatalog.value
    return l && (l.currencyCode === currency.value || l.currencyCode === 'USD') ? l : null
  })
  const fromLive = (amount: number) => (live.value!.currencyCode === currency.value ? amount : convert(amount))

  /** An option's price in the display currency (frame = cheapest size; size = premium over it). */
  function optionPrice(group: GroupId, optionId: string): number {
    const l = live.value ? liveOptionPrice(live.value, group, optionId, selections.value) : null
    return l !== null ? fromLive(l) : convert(findOption(group, optionId)?.price ?? 0)
  }

  const formatAmount = (amount: number) => formatMoney(amount, currency.value)
  /** "Included" for free options, else the formatted display price. */
  function formatOption(group: GroupId, optionId: string): string {
    const p = optionPrice(group, optionId)
    return p === 0 ? 'Included' : formatAmount(p)
  }

  /**
   * Total in the display currency, computed like the commerce server: frame + size form one
   * variant, every variant is priced (and converted/rounded) on its own, then summed — so it
   * equals the cart total when the cart is priced in the same currency.
   */
  const displayTotal = computed(() => {
    const s = selections.value
    const lines = breakdown.value.lines
    const usd = (g: GroupId) => lines.find((l) => l.group === g)?.price ?? 0
    const frameSizeLive = live.value ? liveFrameSizePrice(live.value, s) : null
    const frameSize =
      frameSizeLive !== null
        ? fromLive(frameSizeLive)
        : findOption('frame', s.frame) && findOption('size', s.size)
          ? convert(usd('frame') + usd('size'))
          : (s.frame && findOption('frame', s.frame) ? optionPrice('frame', s.frame) : 0) + (s.size && findOption('size', s.size) ? optionPrice('size', s.size) : 0)
    const others = lines
      .filter((l) => l.group !== 'frame' && l.group !== 'size')
      .reduce((sum, l) => sum + (l.group === 'uniqueCover' ? convert(l.price) : optionPrice(l.group, l.optionId)), 0)
    return Math.round((frameSize + others) * 100) / 100
  })

  /** Where the displayed prices come from, for the small print next to totals. */
  const priceSource = computed(() => {
    const l = live.value
    if (!l) return { live: false, label: liveFailed.value ? 'Catalog prices (Shopify unreachable)' : 'Demo pricing', note: '' }
    const converted = l.currencyCode !== currency.value
    return {
      live: true,
      label: converted ? `Live Shopify prices (${l.currencyCode}) · demo exchange rate` : 'Live Shopify prices',
      note: l.servesMarket ? '' : `The store doesn't sell to ${destinationOf(l.country)?.name ?? l.country} yet`,
    }
  })

  return { breakdown, total, displayTotal, optionPrice, formatOption, formatAmount, priceSource }
}
