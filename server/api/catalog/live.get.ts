import type { LiveCatalog } from '~/commerce/liveCatalog'
import { loadLiveCatalog } from '~/commerce/shopify/service'
import { CommerceError } from '~/commerce/types'

/** How long a market's prices/stock are reused before asking Shopify again. */
const TTL_MS = 60_000
/** If Shopify is briefly unreachable, keep showing the last known values for this long. */
const STALE_MS = 10 * 60_000

const cache = new Map<string, { at: number; value: Promise<LiveCatalog> }>()

/**
 * GET /api/catalog/live?country=US — Shopify's live price + stock per SKU for the configurator.
 * Returns null in demo mode (the configurator then shows the code's catalog prices and demo stock).
 */
export default defineEventHandler(async (event): Promise<LiveCatalog | null> => {
  if (!usesShopify(event)) return null
  const country = String(getQuery(event).country ?? 'US').toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) throw createError({ statusCode: 400, statusMessage: 'Invalid country.' })
  setHeader(event, 'Cache-Control', 'no-store')

  const now = Date.now()
  const hit = cache.get(country)
  if (hit && now - hit.at < TTL_MS) return hit.value

  const value = loadLiveCatalog(requireShopifyStorefront(event), country)
  cache.set(country, { at: now, value })
  try {
    return await value
  } catch (err) {
    // Don't cache failures; fall back to the last good answer if it's recent.
    if (hit && now - hit.at < STALE_MS) {
      cache.set(country, hit)
      return hit.value
    }
    cache.delete(country)
    if (err instanceof CommerceError) throw createError({ statusCode: err.code === 'network' ? 502 : 400, statusMessage: err.message, data: { code: err.code } })
    throw err
  }
})
