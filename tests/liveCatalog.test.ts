import { describe, expect, it } from 'vitest'
import { mockVariantTable } from '~/commerce/catalogMap'
import { type LiveCatalog, liveFrameSizePrice, liveOptionPrice, liveStock } from '~/commerce/liveCatalog'
import { CATALOG_STOCK_QUERY, loadLiveCatalog } from '~/commerce/shopify/service'
import type { StorefrontFetch } from '~/commerce/shopify/storefront'
import { CommerceError } from '~/commerce/types'
import { sanitizeConfiguration } from '~/utils/configuration'

const allSkus = [...mockVariantTable().values()].map((v) => v.sku)

type FakeVariant = { availableForSale?: boolean; quantityAvailable?: number | null; amount?: string; currencyCode?: string }
/** Fake Storefront: every catalog SKU at 100 USD, 5 in stock, unless overridden per SKU. */
function fakeStore(overrides: Record<string, FakeVariant> = {}, base: FakeVariant = {}) {
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = []
  const storefront: StorefrontFetch = async <T,>(query: string, variables: Record<string, unknown> = {}) => {
    calls.push({ query, variables })
    const nodes = allSkus.map((sku, i) => {
      const v = { availableForSale: true, quantityAvailable: 5, amount: '100.0', currencyCode: 'USD', ...base, ...overrides[sku] }
      return { id: `gid://shopify/ProductVariant/${i}`, sku, title: 'V', availableForSale: v.availableForSale, quantityAvailable: v.quantityAvailable, price: { amount: v.amount, currencyCode: v.currencyCode } }
    })
    return { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ title: 'P', variants: { nodes } }] } } as T
  }
  return { storefront, calls }
}

describe('live catalog from Shopify (server)', () => {
  it('maps every SKU to Shopify price and stock for the market, asking for quantityAvailable', async () => {
    const { storefront, calls } = fakeStore({
      'FL-WHEELS-CARBON-DEEP': { amount: '849.5', quantityAvailable: 2 },
      'FL-FRAME-TITANIUM-XS': { availableForSale: false, quantityAvailable: 0 },
      'FL-PAINT-CUSTOM': { quantityAvailable: 0 }, // untracked: for sale with 0 units
    })
    const live = await loadLiveCatalog(storefront, 'GB', new Date('2026-11-18T12:00:00Z'))
    expect(calls[0]!.query).toBe(CATALOG_STOCK_QUERY)
    expect(calls[0]!.variables.country).toBe('GB')
    expect(live).toMatchObject({ source: 'shopify', currencyCode: 'USD', country: 'GB', servesMarket: true, fetchedAt: '2026-11-18T12:00:00.000Z' })
    expect(Object.keys(live.variants).sort()).toEqual([...allSkus].sort())
    expect(live.variants['FL-WHEELS-CARBON-DEEP']).toEqual({ price: 849.5, stock: 2 })
    expect(live.variants['FL-FRAME-TITANIUM-XS']!.stock).toBe(0)
    expect(live.variants['FL-PAINT-CUSTOM']!.stock).toBeNull()
  })

  it('a market the store does not sell to has unknown stock, not "sold out"', async () => {
    const live = await loadLiveCatalog(fakeStore({}, { availableForSale: false, quantityAvailable: 0 }).storefront, 'JP')
    expect(live.servesMarket).toBe(false)
    expect(Object.values(live.variants).every((v) => v.stock === null)).toBe(true)
  })

  it('rejects bad countries, empty stores and mixed currencies', async () => {
    await expect(loadLiveCatalog(fakeStore().storefront, 'usa')).rejects.toBeInstanceOf(CommerceError)
    await expect(loadLiveCatalog(fakeStore({ 'FL-WHEELS-ALLOY': { currencyCode: 'EUR' } }).storefront, 'US')).rejects.toThrow(/mixed currencies/)
    const empty: StorefrontFetch = async <T,>() => ({ products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } }) as T
    await expect(loadLiveCatalog(empty, 'US')).rejects.toThrow(/no products/)
  })
})

describe('live catalog → displayed prices (client)', () => {
  const variants: LiveCatalog['variants'] = Object.fromEntries(allSkus.map((s) => [s, { price: 100, stock: 5 }]))
  variants['FL-FRAME-STEEL-S'] = { price: 1250, stock: 5 }
  variants['FL-FRAME-STEEL-M'] = { price: 1250, stock: 5 }
  variants['FL-FRAME-STEEL-XL'] = { price: 1299.99, stock: 1 }
  for (const s of ['XS', 'L']) variants[`FL-FRAME-STEEL-${s}`] = { price: 1250, stock: 5 }
  const live: LiveCatalog = { source: 'shopify', currencyCode: 'USD', country: 'US', servesMarket: true, fetchedAt: '', variants }
  const sel = (s: Record<string, string>) => sanitizeConfiguration({ selections: s }).selections

  it('frame shows its cheapest size; sizes show their premium; together they equal the variant', () => {
    const s = sel({ frame: 'steel', size: 'xl' })
    expect(liveOptionPrice(live, 'frame', 'steel', s)).toBe(1250)
    expect(liveOptionPrice(live, 'size', 'm', s)).toBe(0)
    expect(liveOptionPrice(live, 'size', 'xl', s)).toBe(49.99)
    expect(liveFrameSizePrice(live, s)).toBe(1299.99)
    expect(liveOptionPrice(live, 'frame', 'steel', s)! + liveOptionPrice(live, 'size', 'xl', s)!).toBe(liveFrameSizePrice(live, s))
  })

  it('components use their own variant; unknown SKUs and size-without-frame fall back (null)', () => {
    expect(liveOptionPrice(live, 'wheels', 'alloy', sel({}))).toBe(100)
    expect(liveOptionPrice(live, 'size', 'm', { ...sel({}), frame: null })).toBeNull()
    expect(liveFrameSizePrice(live, { ...sel({ frame: 'steel' }), size: null })).toBeNull()
    const { 'FL-WHEELS-ALLOY': _gone, ...rest } = variants
    expect(liveOptionPrice({ ...live, variants: rest }, 'wheels', 'alloy', sel({}))).toBeNull()
  })

  it('stock: not for sale = 0, tracked units as-is, for sale without units = untracked', () => {
    expect(liveStock({ availableForSale: false, quantityAvailable: 7 })).toBe(0)
    expect(liveStock({ availableForSale: true, quantityAvailable: 3 })).toBe(3)
    expect(liveStock({ availableForSale: true, quantityAvailable: 0 })).toBeNull()
    expect(liveStock({ availableForSale: true })).toBeNull()
  })
})
