/**
 * Hand-off back from Shopify. A Shopify dev store shows its password page before checkout and then
 * lands on the store home, which the store's theme redirects back here with `?from=shopify`
 * (docs/shopify-integration.md). We remember the checkout the buyer opened so they can resume it.
 */
const KEY = 'forgelab-pending-checkout'
const MAX_AGE_MS = 60 * 60 * 1000

export function rememberCheckout(url: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ url, at: Date.now() }))
  } catch {
    /* storage blocked: the buyer can still press Add to cart again */
  }
}

/** One-shot: returns the remembered checkout URL (if recent and on Shopify) and forgets it. */
export function takePendingCheckout(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    if (!raw) return null
    const { url, at } = JSON.parse(raw) as { url?: unknown; at?: unknown }
    if (typeof url !== 'string' || typeof at !== 'number' || Date.now() - at > MAX_AGE_MS) return null
    const host = new URL(url).hostname
    return url.startsWith('https://') && (host.endsWith('.myshopify.com') || host.endsWith('.shopify.com')) ? url : null
  } catch {
    return null
  }
}
