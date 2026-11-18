import { postCommerce } from '../http'
import type { Cart, CommerceProvider, Quote } from '../types'

/**
 * Browser-side mock provider. All validation and pricing happen in the Nitro routes
 * (`server/api/commerce/*`) — the browser never supplies prices.
 */
export function createMockCommerceProvider(): CommerceProvider {
  return {
    id: 'mock',
    label: 'Demo store (mock commerce provider)',
    quote: (config) => postCommerce<Quote>('/api/commerce/quote', config),
    catalog: { resolveVariants: async (config) => (await postCommerce<Quote>('/api/commerce/quote', config)).lines },
    cart: { createCart: (lines, attributes, currency) => postCommerce<Cart>('/api/commerce/cart', { lines, attributes, currency }) },
    checkout: { isDemo: true, checkoutUrl: (cart) => cart.checkoutUrl },
  }
}
