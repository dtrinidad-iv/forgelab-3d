import { createMockCommerceProvider } from './mock/provider'
import { createShopifyCommerceProvider } from './shopify/provider'
import type { CommerceProvider } from './types'

/** Selected by `runtimeConfig.public.commerceProvider` (NUXT_PUBLIC_COMMERCE_PROVIDER). */
export function getCommerceProvider(kind: string): CommerceProvider {
  return kind === 'shopify' ? createShopifyCommerceProvider() : createMockCommerceProvider()
}
