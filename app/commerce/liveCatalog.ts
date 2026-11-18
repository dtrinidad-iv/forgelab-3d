/**
 * LIVE CATALOG — Shopify's current price and stock for every SKU, as the configurator displays them.
 *
 * Built on the server (server/api/catalog/live.get.ts → shopify/service.ts `loadLiveCatalog`) and
 * cached for a minute, so a price or stock change in Shopify admin shows up in the cards, the total
 * and the stock badges without a deploy. The code keeps only what Shopify doesn't know: names,
 * specs, 3D mapping and compatibility (app/config). Still DISPLAY ONLY — every cart is re-priced
 * from Shopify by the commerce server.
 *
 * Pure functions: no Vue, no fetch.
 */
import { CATALOG } from '~/config/catalog'
import type { GroupId, Selections } from '~/types/configurator'
import { componentSku, frameSku } from './catalogMap'

export interface LiveVariant {
  /** Price in `LiveCatalog.currencyCode`. */
  price: number
  /** Units for sale; null = not tracked (or unknown for this market); 0 = sold out. */
  stock: number | null
}

export interface LiveCatalog {
  source: 'shopify'
  /** Currency Shopify priced this market in (the store's currency unless Markets set another). */
  currencyCode: string
  /** Market (country) the prices and stock are for. */
  country: string
  /** False when the store sells nothing to `country` (no market / shipping) — stock is then unknown. */
  servesMarket: boolean
  fetchedAt: string
  /** Keyed by SKU (app/commerce/catalogMap.ts). */
  variants: Record<string, LiveVariant>
}

/** Shopify variant → displayed stock. With "deny" overselling, "for sale with 0 units" means untracked. */
export function liveStock(v: { availableForSale: boolean; quantityAvailable?: number | null }): number | null {
  if (!v.availableForSale) return 0
  return typeof v.quantityAvailable === 'number' && v.quantityAvailable > 0 ? v.quantityAvailable : null
}

const cents = (n: number) => Math.round(n * 100) / 100

/** Cheapest size of a frame (the frame card's "from" price). */
function frameBase(live: LiveCatalog, frameId: string): number | null {
  const prices = CATALOG.size.map((s) => live.variants[frameSku(frameId, s.id)]?.price).filter((p): p is number => typeof p === 'number')
  return prices.length ? Math.min(...prices) : null
}

/**
 * An option's live price in `live.currencyCode`, or null when Shopify has no matching variant.
 * Frame + size are ONE Shopify variant, so the frame shows its cheapest size and each size shows
 * its premium over that — frame row + size row always add up to the variant's price.
 */
export function liveOptionPrice(live: LiveCatalog, group: GroupId, optionId: string, selections: Selections): number | null {
  if (group === 'frame') return frameBase(live, optionId)
  if (group === 'size') {
    if (!selections.frame) return null
    const variant = live.variants[frameSku(selections.frame, optionId)]
    const base = frameBase(live, selections.frame)
    return variant && base !== null ? cents(variant.price - base) : null
  }
  return live.variants[componentSku(group, optionId)]?.price ?? null
}

/** Price of the selected frame + size variant, or null when either is missing. */
export function liveFrameSizePrice(live: LiveCatalog, selections: Selections): number | null {
  if (!selections.frame || !selections.size) return null
  return live.variants[frameSku(selections.frame, selections.size)]?.price ?? null
}
