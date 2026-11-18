/**
 * Shopify commerce SERVICE — runs on the server (Nitro routes in server/api/commerce).
 *
 * quote:  the build is validated exactly like the mock store (strict option ids, compatibility,
 *         region rules) and then EVERY line is priced from Shopify — variant id, price, currency
 *         and availability come from the Storefront API, matched by SKU (catalogMap).
 * cart:   only real `gid://shopify/ProductVariant/…` ids are accepted; Shopify prices the cart
 *         (`cartCreate`) and hosts checkout. Browser prices are never used.
 */
import { CURRENCIES, type CurrencyCode, isCurrencyCode } from '~/config/currency'
import { quoteOrder } from '../mock/service'
import { type Attribute, type Cart, type CartLineInput, CommerceError, type ComponentVariant, type Money, type OrderConfiguration, type Quote } from '../types'
import type { StorefrontFetch } from './storefront'

interface MoneyV2 {
  amount: string
  currencyCode: string
}

export interface ShopifyVariant {
  id: string
  sku: string
  title: string
  productTitle: string
  availableForSale: boolean
  price: Money
}

const money = (m: MoneyV2): Money => ({ amount: Number(m.amount), currencyCode: m.currencyCode })
const COUNTRY = /^[A-Z]{2}$/
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/

export const CATALOG_QUERY = /* GraphQL */ `
  query ForgeLabCatalog($country: CountryCode, $cursor: String) @inContext(country: $country) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        title
        variants(first: 100) { nodes { id sku title availableForSale price { amount currencyCode } } }
      }
    }
  }
`

/** Every variant in the store with a SKU, priced for `country` (Shopify Markets decide the currency). */
export async function loadShopifyVariants(storefront: StorefrontFetch, country: string): Promise<Map<string, ShopifyVariant>> {
  type Page = {
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{ title: string; variants: { nodes: Array<{ id: string; sku: string | null; title: string; availableForSale: boolean; price: MoneyV2 }> } }>
    }
  }
  const out = new Map<string, ShopifyVariant>()
  let cursor: string | null = null
  for (let page = 0; page < 10; page++) {
    const data: Page = await storefront<Page>(CATALOG_QUERY, { country, cursor })
    for (const product of data.products.nodes) {
      for (const v of product.variants.nodes) {
        if (v.sku) out.set(v.sku, { id: v.id, sku: v.sku, title: v.title, productTitle: product.title, availableForSale: v.availableForSale, price: money(v.price) })
      }
    }
    if (!data.products.pageInfo.hasNextPage) break
    cursor = data.products.pageInfo.endCursor
  }
  return out
}

/** Country whose Shopify market prices the build: the destination, else the chosen currency's home. */
export function pricingCountry(currency: unknown, shipToCountry?: string | null): string {
  if (shipToCountry && COUNTRY.test(shipToCountry)) return shipToCountry
  return CURRENCIES[isCurrencyCode(currency) ? currency : ('USD' as CurrencyCode)].country
}

export async function quoteShopify(input: unknown, storefront: StorefrontFetch, now = new Date()): Promise<Quote> {
  const raw = (input ?? {}) as Partial<OrderConfiguration>
  if (raw.uniqueCover) {
    throw new CommerceError('One-of-a-kind covers are not synced to the Shopify store yet — choose the standard cover to check out with Shopify.', 'unavailable')
  }
  // Same strict validation, compatibility and region rules as the mock store (its USD prices are discarded).
  const base = quoteOrder(input, now)
  if (!base.complete || !base.valid || base.shippingIssues.length) return { ...base, source: 'shopify' }

  const country = pricingCountry(raw.currency, base.shipTo?.country)
  const variants = await loadShopifyVariants(storefront, country)
  const missing = base.lines.filter((l) => !variants.has(l.sku)).map((l) => l.sku)
  if (missing.length) {
    throw new CommerceError(
      `The Shopify store is missing ${missing.length} product variant(s) (e.g. ${missing[0]}). Import shopify/forgelab-products.csv and make the products available to the Headless channel.`,
      'unavailable',
      missing,
    )
  }

  const lines: ComponentVariant[] = base.lines.map((l) => {
    const v = variants.get(l.sku)!
    return { ...l, variantId: v.id, price: v.price, available: v.availableForSale }
  })
  // Nothing sellable at all = the store has no stock location/shipping for this market (not "sold out").
  if (lines.length > 1 && lines.every((l) => !l.available)) {
    throw new CommerceError(`This store doesn't ship to ${country} yet. Choose another destination.`, 'restricted')
  }
  const currencyCode = lines[0]?.price.currencyCode ?? base.total.currencyCode
  if (lines.some((l) => l.price.currencyCode !== currencyCode)) throw new CommerceError('Shopify returned mixed currencies.', 'network')
  const total = Math.round(lines.reduce((sum, l) => sum + l.price.amount, 0) * 100) / 100
  return { ...base, source: 'shopify', lines, total: { amount: total, currencyCode } }
}

const CART_MUTATION = /* GraphQL */ `
  mutation ForgeLabCart($input: CartInput!, $country: CountryCode) @inContext(country: $country) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        attributes { key value }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        lines(first: 50) {
          nodes {
            id
            quantity
            attributes { key value }
            cost { totalAmount { amount currencyCode } }
            merchandise { ... on ProductVariant { id sku title product { title } } }
          }
        }
      }
      userErrors { field message code }
      warnings { code message }
    }
  }
`

function cleanAttributes(input: unknown, max: number): Attribute[] {
  if (input === undefined) return []
  if (!Array.isArray(input) || input.length > max) throw new CommerceError('Invalid attributes.', 'invalid-configuration')
  return input.map((a) => {
    const { key, value } = (a ?? {}) as Partial<Attribute>
    if (typeof key !== 'string' || typeof value !== 'string' || !key || key.length > 64 || value.length > 255) {
      throw new CommerceError('Invalid attribute.', 'invalid-configuration')
    }
    return { key, value }
  })
}

/** Validates the browser's cart request and creates the cart in Shopify (which prices it). */
export async function createShopifyCart(input: unknown, storefront: StorefrontFetch): Promise<Cart> {
  const body = (input ?? {}) as { lines?: unknown; attributes?: unknown; currency?: unknown }
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 30) throw new CommerceError('Cart lines are missing.', 'invalid-configuration')
  const lines: CartLineInput[] = body.lines.map((l) => {
    const { merchandiseId, quantity, attributes } = (l ?? {}) as Partial<CartLineInput>
    if (typeof merchandiseId !== 'string' || !VARIANT_GID.test(merchandiseId)) throw new CommerceError('Unknown product variant.', 'invalid-configuration')
    if (quantity !== 1) throw new CommerceError('Each component is sold once per build.', 'invalid-configuration')
    return { merchandiseId, quantity: 1, attributes: cleanAttributes(attributes, 10) }
  })
  const attributes = cleanAttributes(body.attributes, 10)
  const shipTo = attributes.find((a) => a.key === 'forgelab_ship_to')?.value.slice(0, 2)
  const country = pricingCountry(body.currency, shipTo)

  type Result = {
    cartCreate: {
      cart: null | {
        id: string
        checkoutUrl: string
        attributes: Attribute[]
        cost: { subtotalAmount: MoneyV2; totalAmount: MoneyV2 }
        lines: { nodes: Array<{ id: string; quantity: number; attributes: Attribute[]; cost: { totalAmount: MoneyV2 }; merchandise: { id: string; sku: string | null; title: string; product: { title: string } } }> }
      }
      userErrors: Array<{ message: string; code?: string | null }>
      warnings: Array<{ message: string; code?: string | null }>
    }
  }
  const { cartCreate } = await storefront<Result>(CART_MUTATION, { country, input: { lines, attributes, buyerIdentity: { countryCode: country } } })
  if (cartCreate.userErrors.length || !cartCreate.cart) {
    throw new CommerceError(`Shopify: ${cartCreate.userErrors.map((e) => e.message).join(' ') || 'cart could not be created.'}`, 'unavailable', cartCreate.userErrors)
  }
  const cart = cartCreate.cart
  const order = (id: string) => lines.findIndex((l) => l.merchandiseId === id)
  // Shopify drops lines it cannot sell (e.g. sold out) and reports a warning instead of failing.
  if (cart.lines.nodes.length !== lines.length) {
    throw new CommerceError(`Shopify could not add every component: ${cartCreate.warnings.map((w) => w.message).join(' ') || 'some items are unavailable.'}`, 'unavailable', cartCreate.warnings)
  }
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    attributes: cart.attributes,
    cost: { subtotal: money(cart.cost.subtotalAmount), total: money(cart.cost.totalAmount) },
    // Shopify lists the newest line first; keep the build's order (frame first) like the quote.
    lines: [...cart.lines.nodes].sort((a, b) => order(a.merchandise.id) - order(b.merchandise.id)).map((n) => ({
      id: n.id,
      merchandiseId: n.merchandise.id,
      sku: n.merchandise.sku ?? '',
      title: n.merchandise.title === 'Default Title' ? n.merchandise.product.title : `${n.merchandise.product.title} — ${n.merchandise.title}`,
      quantity: n.quantity,
      attributes: n.attributes,
      cost: money(n.cost.totalAmount),
    })),
  }
}
