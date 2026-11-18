import { type Cart, CommerceError, type CommerceProvider, type Quote } from '../types'

interface FetchErrorLike {
  message?: string
  data?: { statusMessage?: string; message?: string; data?: { code?: CommerceError['code'] } }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  try {
    // Our own POST routes; typed by the caller (Nitro's route-based inference can't see generic T).
    return (await $fetch(url, { method: 'POST', body: body as Record<string, unknown> })) as T
  } catch (err) {
    const e = err as FetchErrorLike
    throw new CommerceError(e.data?.statusMessage ?? e.data?.message ?? e.message ?? 'Commerce request failed.', e.data?.data?.code ?? 'network')
  }
}

/**
 * Browser-side mock provider. All validation and pricing happen in the Nitro routes
 * (`server/api/commerce/*`) — the browser never supplies prices.
 */
export function createMockCommerceProvider(): CommerceProvider {
  return {
    id: 'mock',
    label: 'Demo store (mock commerce provider)',
    quote: (config) => post<Quote>('/api/commerce/quote', config),
    catalog: { resolveVariants: async (config) => (await post<Quote>('/api/commerce/quote', config)).lines },
    cart: { createCart: (lines, attributes) => post<Cart>('/api/commerce/cart', { lines, attributes }) },
    checkout: { isDemo: true, checkoutUrl: (cart) => cart.checkoutUrl },
  }
}
