/**
 * Minimal Storefront API client (server-side only — uses the PRIVATE token).
 * No SDK: one typed fetch. https://shopify.dev/docs/api/storefront
 */
import { CommerceError } from '../types'

export const SHOPIFY_API_VERSION = '2026-10'
const DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/

export type StorefrontFetch = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>

export interface StorefrontOptions {
  domain: string
  privateToken: string
  /** Buyer's IP, forwarded as Shopify recommends for private-token requests. */
  buyerIp?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export function createStorefrontFetch({ domain, privateToken, buyerIp, fetchImpl = fetch, timeoutMs = 10_000 }: StorefrontOptions): StorefrontFetch {
  if (!DOMAIN.test(domain)) throw new CommerceError('Shopify store domain must look like "name.myshopify.com".', 'network')
  const url = `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`

  return async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    let res: Response
    try {
      res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Shopify-Storefront-Private-Token': privateToken,
          ...(buyerIp ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}),
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch {
      throw new CommerceError('Could not reach the Shopify store.', 'network')
    }
    // Never echo response bodies/headers into errors (they can include request details).
    if (!res.ok) throw new CommerceError(`Shopify responded with HTTP ${res.status}.`, 'network')
    const json = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> }
    if (json.errors?.length) throw new CommerceError(`Shopify: ${json.errors[0]?.message ?? 'query failed'}`, 'network')
    if (!json.data) throw new CommerceError('Shopify returned no data.', 'network')
    return json.data
  }
}
