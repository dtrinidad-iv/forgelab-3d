/**
 * Commerce abstractions. The configurator only talks to these interfaces, so the mock provider
 * can be replaced by a Shopify Storefront API provider without touching the configurator.
 * Shapes intentionally mirror the Storefront cart model (variant ids, line attributes, checkoutUrl).
 * See docs/shopify-integration.md.
 */
import type { CurrencyCode } from '~/config/currency'
import type { ShippingIssue, ShipTo } from '~/config/shipping'
import type { GroupId, PaintSpec } from '~/types/configurator'
import type { CompatibilityIssue } from '~/utils/compatibility'

export interface Money {
  amount: number
  currencyCode: string
}

export interface Attribute {
  key: string
  value: string
}

/** What the browser sends to commerce. Contains NO prices — the server decides those. */
export interface OrderConfiguration {
  schema: 'forgelab.order/v1'
  model: string
  selections: Partial<Record<GroupId, string | null>>
  customPaint?: PaintSpec | null
  /** Presentment currency (server converts; Shopify: derived from the buyer's country/market). */
  currency?: CurrencyCode
  /** Destination for region rules (Shopify: the delivery address in checkout). */
  shipTo?: ShipTo
  /** One-of-a-kind saddle cover id; the server looks up its price and availability. */
  uniqueCover?: string | null
}

/** A purchasable variant a configuration maps to (Shopify: a ProductVariant). */
export interface ComponentVariant {
  /** Configurator groups covered by this variant (frame + size share one variant). */
  groups: GroupId[]
  sku: string
  /** Shopify: `gid://shopify/ProductVariant/...`. Mock: `mock://variant/...`. */
  variantId: string
  title: string
  price: Money
  available: boolean
  /** Line attributes (e.g. custom paint colour). Do NOT change price in Shopify. */
  attributes: Attribute[]
}

/** Server-validated, server-priced offer for a configuration. */
export interface Quote {
  source: 'mock-server' | 'shopify'
  buildId: string
  complete: boolean
  valid: boolean
  missing: GroupId[]
  issues: CompatibilityIssue[]
  /** Region rules that block shipping this build to `shipTo` (empty = shippable). */
  shippingIssues: ShippingIssue[]
  shipTo: ShipTo | null
  lines: ComponentVariant[]
  total: Money
  quotedAt: string
}

export interface CartLineInput {
  merchandiseId: string
  quantity: number
  attributes: Attribute[]
}

export interface CartLine {
  id: string
  merchandiseId: string
  sku: string
  title: string
  quantity: number
  attributes: Attribute[]
  cost: Money
}

export interface Cart {
  id: string
  lines: CartLine[]
  attributes: Attribute[]
  cost: { subtotal: Money; total: Money }
  /** Where the customer completes payment (Shopify-hosted checkout). */
  checkoutUrl: string
}

export interface ProductCatalogProvider {
  /** Resolve selections to purchasable variants with authoritative prices and availability. */
  resolveVariants(config: OrderConfiguration): Promise<ComponentVariant[]>
}

export interface CartProvider {
  createCart(lines: CartLineInput[], attributes: Attribute[], currency?: CurrencyCode): Promise<Cart>
}

export interface CheckoutProvider {
  /** Returns the URL to send the customer to. Mock providers return an in-app demo URL. */
  checkoutUrl(cart: Cart): string
  readonly isDemo: boolean
}

export interface CommerceProvider {
  readonly id: 'mock' | 'shopify'
  readonly label: string
  readonly catalog: ProductCatalogProvider
  readonly cart: CartProvider
  readonly checkout: CheckoutProvider
  /** Trusted validation + pricing of a configuration (server-side). */
  quote(config: OrderConfiguration): Promise<Quote>
}

export class CommerceError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid-configuration' | 'incomplete' | 'incompatible' | 'unavailable' | 'restricted' | 'network' | 'not-implemented',
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'CommerceError'
  }
}
