import { CommerceError, type CommerceProvider } from '../types'

/**
 * Shopify Storefront API provider — NOT IMPLEMENTED in the MVP (no Shopify dependencies installed).
 *
 * Planned implementation (docs/shopify-integration.md):
 *  - quote():           server route re-validates the configuration, maps it to real variant GIDs
 *                       (catalogMap), and reads authoritative prices/availability from Shopify.
 *  - cart.createCart(): server route calls the Storefront `cartCreate` mutation with one line per
 *                       variant + line attributes (build id, custom paint). Uses the PRIVATE
 *                       Storefront token server-side only.
 *  - checkout:          redirect to `cart.checkoutUrl` (Shopify-hosted checkout).
 */
export function createShopifyCommerceProvider(): CommerceProvider {
  const notReady = (): never => {
    throw new CommerceError('Shopify integration is not implemented yet — see docs/shopify-integration.md.', 'not-implemented')
  }
  return {
    id: 'shopify',
    label: 'Shopify (not implemented)',
    quote: async () => notReady(),
    catalog: { resolveVariants: async () => notReady() },
    cart: { createCart: async () => notReady() },
    checkout: { isDemo: false, checkoutUrl: (cart) => cart.checkoutUrl },
  }
}
