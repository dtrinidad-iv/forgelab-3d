import type { H3Event } from 'h3'
import { createStorefrontFetch, type StorefrontFetch } from '~/commerce/shopify/storefront'

/** True when the deployment sells through Shopify (NUXT_PUBLIC_COMMERCE_PROVIDER=shopify). */
export const usesShopify = (event: H3Event) => useRuntimeConfig(event).public.commerceProvider === 'shopify'

/** Server-only Storefront client (private token), or null when the store isn't configured. */
export function useShopifyStorefront(event: H3Event): StorefrontFetch | null {
  const config = useRuntimeConfig(event)
  const domain = String(config.public.shopifyStoreDomain ?? '')
  const privateToken = String(config.shopifyStorefrontPrivateToken ?? '')
  if (!domain || !privateToken) return null
  return createStorefrontFetch({ domain, privateToken, buyerIp: getRequestIP(event, { xForwardedFor: true }) })
}

export function requireShopifyStorefront(event: H3Event): StorefrontFetch {
  const storefront = useShopifyStorefront(event)
  if (!storefront) throw createError({ statusCode: 503, statusMessage: 'The Shopify store is not configured on this server.', data: { code: 'network' } })
  return storefront
}
