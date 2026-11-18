import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberCheckout, takePendingCheckout } from '~/composables/usePendingCheckout'

describe('resume checkout after the Shopify password page', () => {
  beforeEach(() => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('returns the remembered Shopify checkout once', () => {
    rememberCheckout('https://shop.myshopify.com/cart/c/abc?key=1')
    expect(takePendingCheckout()).toBe('https://shop.myshopify.com/cart/c/abc?key=1')
    expect(takePendingCheckout()).toBeNull()
  })

  it('ignores stale or non-Shopify URLs (no open redirect)', () => {
    rememberCheckout('https://evil.example.com/phish')
    expect(takePendingCheckout()).toBeNull()
    rememberCheckout('javascript:alert(1)')
    expect(takePendingCheckout()).toBeNull()
    vi.spyOn(Date, 'now').mockReturnValueOnce(0)
    rememberCheckout('https://shop.myshopify.com/cart/c/abc')
    expect(takePendingCheckout()).toBeNull() // written at t=0 → older than an hour
  })
})
