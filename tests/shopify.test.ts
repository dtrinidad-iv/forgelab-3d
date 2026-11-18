import { describe, expect, it, vi } from 'vitest'
import { mockVariantTable } from '~/commerce/catalogMap'
import { CSV_HEADERS, shopifyProductRows, shopifyProductsCsv } from '~/commerce/shopify/productsCsv'
import { createShopifyCart, quoteShopify } from '~/commerce/shopify/service'
import { createStorefrontFetch, type StorefrontFetch } from '~/commerce/shopify/storefront'
import { CommerceError } from '~/commerce/types'
import { stockFor } from '~/config/inventory'

const allSkus = [...mockVariantTable().values()].map((v) => v.sku)
const order = { schema: 'forgelab.order/v1', model: 'm', selections: { frame: 'aero-carbon', size: 'm', paint: 'gloss-black', groupset: 'shimano-demo', wheels: 'carbon-climbing', handlebar: 'alloy-compact', stem: 'alloy-stem', barTape: 'tape-black', saddle: 'saddle-race' }, currency: 'USD', shipTo: { country: 'US', region: 'TX' } }

/** Fake Storefront API: every catalog SKU priced at 100 in `currency`, with gid ids. */
function fakeStore({ currency = 'USD', drop = [] as string[], soldOut = [] as string[] } = {}) {
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = []
  const storefront: StorefrontFetch = async <T,>(query: string, variables: Record<string, unknown> = {}) => {
    calls.push({ query, variables })
    if (query.includes('ForgeLabCatalog')) {
      const nodes = allSkus.filter((s) => !drop.includes(s)).map((sku, i) => ({ id: `gid://shopify/ProductVariant/${1000 + i}`, sku, title: 'V', availableForSale: !soldOut.includes(sku), price: { amount: '100.0', currencyCode: currency } }))
      return { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ title: 'P', variants: { nodes } }] } } as T
    }
    const input = variables.input as { lines: Array<{ merchandiseId: string; attributes: unknown[] }>; attributes: unknown[] }
    return {
      cartCreate: {
        cart: {
          id: 'gid://shopify/Cart/abc',
          checkoutUrl: 'https://forgelab-test.myshopify.com/cart/c/abc',
          attributes: input.attributes,
          cost: { subtotalAmount: { amount: '900.0', currencyCode: currency }, totalAmount: { amount: '900.0', currencyCode: currency } },
          lines: { nodes: input.lines.toReversed().map((l, i) => ({ id: `line-${i}`, quantity: 1, attributes: l.attributes, cost: { totalAmount: { amount: '100.0', currencyCode: currency } }, merchandise: { id: l.merchandiseId, sku: 'SKU', title: i ? 'M' : 'Default Title', product: { title: 'Prod' } } })) },
        },
        userErrors: [],
        warnings: [],
      },
    } as T
  }
  return { storefront, calls }
}

describe('Shopify product CSV', () => {
  const rows = shopifyProductRows()

  it('contains every purchasable SKU exactly once, with current Shopify column names', () => {
    expect(rows.map((r) => r.SKU).sort()).toEqual([...allSkus].sort())
    expect(shopifyProductsCsv().split('\n')[0]).toBe(CSV_HEADERS.join(','))
  })

  it('carries catalog prices and demo stock; paint is untracked', () => {
    for (const r of rows) {
      expect(Number(r.Price)).toBe(mockVariantTable().get(`mock://variant/${r.SKU}`)!.price.amount)
      const stock = stockFor(r.SKU!)
      expect(r['Inventory quantity']).toBe(stock === null ? '' : String(stock))
    }
    expect(rows.find((r) => r.SKU === 'FL-FRAME-TITANIUM-XS')!['Inventory quantity']).toBe('0')
  })

  it('option values are unique within each product (Shopify rejects duplicates)', () => {
    const byHandle = new Map<string, string[]>()
    for (const r of rows) byHandle.set(r['URL handle']!, [...(byHandle.get(r['URL handle']!) ?? []), r['Option1 value']!])
    for (const values of byHandle.values()) expect(new Set(values).size).toBe(values.length)
  })
})

describe('Shopify service (fake Storefront API)', () => {
  it('validates like the mock store, then prices every line from Shopify by SKU', async () => {
    const { storefront, calls } = fakeStore({ currency: 'USD' })
    const quote = await quoteShopify(order, storefront)
    expect(quote.source).toBe('shopify')
    expect(quote.lines.every((l) => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(l.variantId))).toBe(true)
    expect(quote.total).toEqual({ amount: 100 * quote.lines.length, currencyCode: 'USD' })
    expect(calls[0]!.variables.country).toBe('US') // priced for the destination's market
  })

  it('uses Shopify availability and the market currency Shopify returns', async () => {
    const quote = await quoteShopify({ ...order, currency: 'CAD', shipTo: { country: 'CA', region: 'ON' } }, fakeStore({ currency: 'CAD', soldOut: ['FL-WHEELS-CARBON-CLIMBING'] }).storefront)
    expect(quote.total.currencyCode).toBe('CAD')
    expect(quote.lines.find((l) => l.sku === 'FL-WHEELS-CARBON-CLIMBING')!.available).toBe(false)
  })

  it('a market the store cannot serve is reported as a shipping restriction, not "out of stock"', async () => {
    await expect(quoteShopify(order, fakeStore({ soldOut: allSkus }).storefront)).rejects.toMatchObject({ code: 'restricted', message: expect.stringMatching(/doesn't ship to US/) })
  })

  it('refuses tampered builds before calling Shopify, and explains a missing import', async () => {
    const { storefront, calls } = fakeStore()
    await expect(quoteShopify({ ...order, selections: { ...order.selections, wheels: 'gold' } }, storefront)).rejects.toThrow(/Unknown options/)
    expect(calls).toHaveLength(0)
    await expect(quoteShopify(order, fakeStore({ drop: ['FL-FRAME-AERO-CARBON-M'] }).storefront)).rejects.toThrow(/forgelab-products\.csv/)
    await expect(quoteShopify({ ...order, uniqueCover: 'p-abc123def456' }, storefront)).rejects.toThrow(/not synced to the Shopify store/)
  })

  it('creates the cart in Shopify — only real variant ids, Shopify does the pricing', async () => {
    const { storefront, calls } = fakeStore()
    const lines = [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1, attributes: [{ key: '_forgelab_build', value: 'FLB-1' }] }, { merchandiseId: 'gid://shopify/ProductVariant/2', quantity: 1, attributes: [] }]
    const cart = await createShopifyCart({ lines, attributes: [{ key: 'forgelab_ship_to', value: 'GB' }], currency: 'GBP' }, storefront)
    expect(cart.checkoutUrl).toMatch(/^https:\/\/.*myshopify\.com\//)
    expect(cart.lines.map((l) => l.merchandiseId)).toEqual(lines.map((l) => l.merchandiseId)) // build order kept
    expect(cart.lines.map((l) => l.title)).toEqual(['Prod — M', 'Prod'])
    expect(calls[0]!.variables.country).toBe('GB')
    expect((calls[0]!.variables.input as { buyerIdentity: unknown }).buyerIdentity).toEqual({ countryCode: 'GB' })

    for (const bad of [{ lines: [{ merchandiseId: 'mock://variant/X', quantity: 1 }] }, { lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 3 }] }, { lines: [] }, { lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1, attributes: [{ key: 'x', value: 'y'.repeat(999) }] }] }]) {
      await expect(createShopifyCart(bad, storefront)).rejects.toBeInstanceOf(CommerceError)
    }
  })

  it('reports lines Shopify dropped (sold out) instead of a partial cart', async () => {
    const storefront: StorefrontFetch = async <T,>() =>
      ({ cartCreate: { cart: { id: 'c', checkoutUrl: 'u', attributes: [], cost: { subtotalAmount: { amount: '0', currencyCode: 'USD' }, totalAmount: { amount: '0', currencyCode: 'USD' } }, lines: { nodes: [] } }, userErrors: [], warnings: [{ message: 'Merchandise out of stock' }] } }) as T
    await expect(createShopifyCart({ lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] }, storefront)).rejects.toThrow(/out of stock/)
  })
})

describe('Storefront client', () => {
  it('sends the private token + buyer IP server-side and never echoes them in errors', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: 'Access denied' }] }), { status: 200 }))
    const sf = createStorefrontFetch({ domain: 'forgelab-test.myshopify.com', privateToken: 'secret-token', buyerIp: '203.0.113.7', fetchImpl: fetchImpl as unknown as typeof fetch })
    const err = await sf('{ shop { name } }').catch((e: Error) => e)
    expect(String(err)).toMatch(/Access denied/)
    expect(String(err)).not.toMatch(/secret-token/)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://forgelab-test.myshopify.com/api/2026-10/graphql.json')
    expect(init.headers).toMatchObject({ 'Shopify-Storefront-Private-Token': 'secret-token', 'Shopify-Storefront-Buyer-IP': '203.0.113.7' })
  })

  it('rejects anything but a myshopify.com domain', () => {
    expect(() => createStorefrontFetch({ domain: 'evil.example.com/x', privateToken: 't' })).toThrow(/myshopify\.com/)
  })
})
