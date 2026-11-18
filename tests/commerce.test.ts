import { describe, expect, it } from 'vitest'
import { addConfigurationToCart, toOrderConfiguration } from '~/commerce/addToCart'
import { buildIdFor } from '~/commerce/catalogMap'
import { createMockCart, quoteOrder } from '~/commerce/mock/service'
import { createShopifyCommerceProvider } from '~/commerce/shopify/provider'
import { CommerceError, type CommerceProvider } from '~/commerce/types'
import { sanitizeConfiguration } from '~/utils/configuration'
import { calculatePrice } from '~/utils/pricing'

/** Provider that calls the server-side service directly (same code the Nitro routes run). */
const inProcess: CommerceProvider = {
  id: 'mock',
  label: 'test',
  quote: async (c) => quoteOrder(JSON.parse(JSON.stringify(c))),
  catalog: { resolveVariants: async (c) => quoteOrder(c).lines },
  cart: { createCart: async (lines, attributes, currency) => createMockCart(JSON.parse(JSON.stringify({ lines, attributes, currency })), 1) },
  checkout: { isDemo: true, checkoutUrl: (cart) => cart.checkoutUrl },
}

const complete = sanitizeConfiguration({ selections: { size: 'l', paint: 'custom' }, customPaint: { color: '#1f6feb', finish: 'metallic' } })
const order = toOrderConfiguration(complete, 'forgelab-road-bike')

describe('trusted quote (server-side)', () => {
  it('prices from the server catalog and matches the configurator total', () => {
    const quote = quoteOrder(order)
    expect(quote.complete && quote.valid).toBe(true)
    expect(quote.total.amount).toBe(calculatePrice(complete.selections).total)
    expect(quote.lines.map((l) => l.sku)).toContain('FL-FRAME-AERO-CARBON-L') // frame + size = one variant
    expect(quote.lines.find((l) => l.groups.includes('paint'))!.attributes).toEqual([
      { key: 'Paint colour', value: '#1F6FEB' },
      { key: 'Paint finish', value: 'metallic' },
    ])
  })

  it('ignores any price the browser tries to send', () => {
    const tampered = { ...order, total: 1, selections: { ...order.selections }, price: 1 }
    expect(quoteOrder(tampered).total.amount).toBe(quoteOrder(order).total.amount)
  })

  it('rejects unknown or tampered option ids instead of silently fixing them', () => {
    expect(() => quoteOrder({ ...order, selections: { ...order.selections, wheels: 'free-wheels' } })).toThrow(/Unknown options: wheels=free-wheels/)
    expect(() => quoteOrder({ ...order, schema: 'v0' })).toThrow(CommerceError)
    expect(() => quoteOrder({ ...order, customPaint: { color: 'red', finish: 'gloss' } })).toThrow(/Custom paint/)
  })

  it('reports incomplete and incompatible builds', () => {
    const incomplete = quoteOrder({ ...order, selections: { ...order.selections, size: null } })
    expect(incomplete.complete).toBe(false)
    expect(incomplete.lines).toEqual([])
    expect(quoteOrder({ ...order, selections: { ...order.selections, handlebar: 'carbon-aero' } }).valid).toBe(false)
  })

  it('build ids are deterministic per configuration', () => {
    expect(quoteOrder(order).buildId).toBe(buildIdFor(complete.selections, { color: '#1F6FEB', finish: 'metallic' }))
    expect(quoteOrder({ ...order, selections: { ...order.selections, size: 'm' } }).buildId).not.toBe(quoteOrder(order).buildId)
  })
})

describe('multi-currency (server-side conversion, demo rates)', () => {
  it('prices every line in the requested currency; total is the sum of rounded lines', () => {
    const usd = quoteOrder(order)
    const jpy = quoteOrder({ ...order, currency: 'JPY' })
    expect(jpy.total.currencyCode).toBe('JPY')
    expect(jpy.lines.every((l) => l.price.currencyCode === 'JPY')).toBe(true)
    expect(jpy.total.amount).toBe(jpy.lines.reduce((s, l) => s + l.price.amount, 0))
    expect(Math.abs(jpy.total.amount - usd.total.amount * 154)).toBeLessThan(jpy.lines.length) // rounding only
  })

  it('rejects unsupported currencies', () => {
    expect(() => quoteOrder({ ...order, currency: 'BTC' })).toThrow(/Unsupported currency/)
  })

  it('cart and quote agree in the same currency', async () => {
    const { quote, cart } = await addConfigurationToCart(inProcess, { ...order, currency: 'EUR' })
    expect(cart.cost.total).toEqual(quote.total)
    expect(cart.cost.total.currencyCode).toBe('EUR')
  })
})

describe('inventory (server re-checks stock)', () => {
  it('marks sold-out SKUs unavailable and refuses the cart', async () => {
    const soldOut = { ...order, selections: { ...order.selections, barTape: 'tape-gel' } }
    const quote = quoteOrder(soldOut)
    expect(quote.lines.find((l) => l.sku === 'FL-BARTAPE-TAPE-GEL')?.available).toBe(false)
    await expect(addConfigurationToCart(inProcess, soldOut)).rejects.toMatchObject({ code: 'unavailable', message: expect.stringMatching(/Gel Comfort/) })
  })

  it('frame stock is per size', () => {
    expect(quoteOrder({ ...order, selections: { ...order.selections, frame: 'titanium', size: 'xs' } }).lines[0]!.available).toBe(false)
    expect(quoteOrder({ ...order, selections: { ...order.selections, frame: 'titanium', size: 'm' } }).lines[0]!.available).toBe(true)
  })
})

describe('region shipping rules (server-enforced, demo rule)', () => {
  const forged = { ...order, selections: { ...order.selections, paint: 'forged-pattern' } }
  it('blocks the restricted finish for California and New York only', async () => {
    expect(quoteOrder({ ...forged, shipTo: { country: 'US', region: 'CA' } }).shippingIssues.map((i) => i.ruleId)).toEqual(['forged-finish-regions'])
    expect(quoteOrder({ ...forged, shipTo: { country: 'US', region: 'TX' } }).shippingIssues).toEqual([])
    expect(quoteOrder({ ...order, shipTo: { country: 'US', region: 'CA' } }).shippingIssues).toEqual([]) // other finishes ship
    await expect(addConfigurationToCart(inProcess, { ...forged, shipTo: { country: 'US', region: 'NY' } })).rejects.toMatchObject({ code: 'restricted' })
  })

  it('validates destinations', () => {
    expect(() => quoteOrder({ ...order, shipTo: { country: 'XX' } })).toThrow(/don't ship/)
    expect(() => quoteOrder({ ...order, shipTo: { country: 'US' } })).toThrow(/choose a state/)
    expect(quoteOrder({ ...order, shipTo: { country: 'GB' } }).shipTo).toEqual({ country: 'GB', region: null })
  })

  it('records the destination on the cart', async () => {
    const { cart } = await addConfigurationToCart(inProcess, { ...order, shipTo: { country: 'CA', region: 'BC' } })
    expect(cart.attributes).toContainEqual({ key: 'forgelab_ship_to', value: 'CA-BC' })
  })
})

describe('cart (server-side pricing by variant id)', () => {
  it('prices lines from the variant table and refuses unknown variants', () => {
    const cart = createMockCart({ lines: [{ merchandiseId: 'mock://variant/FL-WHEELS-CARBON-DEEP', quantity: 1, attributes: [] }] })
    expect(cart.cost.total.amount).toBe(800)
    expect(() => createMockCart({ lines: [{ merchandiseId: 'mock://variant/FAKE', quantity: 1, attributes: [] }] })).toThrow(/Unknown variant/)
    expect(() => createMockCart({ lines: [] })).toThrow(/no lines/)
  })
})

describe('addConfigurationToCart workflow', () => {
  it('quote → cart with one line per variant, build attributes and a checkout url', async () => {
    const { quote, cart } = await addConfigurationToCart(inProcess, order)
    expect(cart.lines).toHaveLength(quote.lines.length)
    expect(cart.cost.total.amount).toBe(quote.total.amount)
    expect(cart.lines.every((l) => l.attributes.some((a) => a.key === '_forgelab_build' && a.value === quote.buildId))).toBe(true)
    expect(cart.attributes).toContainEqual({ key: 'forgelab_build', value: quote.buildId })
    expect(inProcess.checkout.checkoutUrl(cart)).toMatch(/^#demo-checkout\//)
  })

  it('refuses incomplete and incompatible builds before creating a cart', async () => {
    await expect(addConfigurationToCart(inProcess, { ...order, selections: { ...order.selections, size: null } })).rejects.toMatchObject({ code: 'incomplete' })
    await expect(addConfigurationToCart(inProcess, { ...order, selections: { ...order.selections, wheels: 'alloy' } })).rejects.toMatchObject({ code: 'incompatible' })
  })

  it('the Shopify provider hands off to Shopify-hosted checkout (not the demo screen)', () => {
    const shopify = createShopifyCommerceProvider()
    expect(shopify.id).toBe('shopify')
    expect(shopify.checkout.isDemo).toBe(false)
    expect(shopify.checkout.checkoutUrl({ checkoutUrl: 'https://x.myshopify.com/cart/c/1' } as Parameters<typeof shopify.checkout.checkoutUrl>[0])).toBe('https://x.myshopify.com/cart/c/1')
  })
})
