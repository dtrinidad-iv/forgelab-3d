import { postCommerce } from '../http'
import type { Cart, CommerceProvider, Quote } from '../types'

/**
 * Browser side of the Shopify provider. It talks to the SAME server routes as the mock store; when
 * NUXT_PUBLIC_COMMERCE_PROVIDER=shopify those routes price the build from the Shopify Storefront API
 * and create a real Shopify cart (private token stays on the server). Checkout = Shopify-hosted.
 */
export function createShopifyCommerceProvider(): CommerceProvider {
  return {
    id: 'shopify',
    label: 'Shopify store (Storefront API)',
    quote: (config) => postCommerce<Quote>('/api/commerce/quote', config),
    catalog: { resolveVariants: async (config) => (await postCommerce<Quote>('/api/commerce/quote', config)).lines },
    cart: { createCart: (lines, attributes, currency) => postCommerce<Cart>('/api/commerce/cart', { lines, attributes, currency }) },
    checkout: { isDemo: false, checkoutUrl: (cart) => cart.checkoutUrl },
  }
}
