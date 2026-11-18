import { CURRENCIES, type CurrencyCode } from '~/config/currency'

/** USD → currency, rounded to whole units (prices are shown without cents). */
export function convertFromUsd(usd: number, currency: CurrencyCode): number {
  return Math.round(usd * CURRENCIES[currency].rate)
}

const formatters = new Map<string, Intl.NumberFormat>()
/** Whole amounts without cents ("$1,900"); amounts with cents (e.g. a Shopify price of 19.99) keep them. */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  const digits = Number.isInteger(amount) ? 0 : 2
  const key = `${currency}:${digits}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(CURRENCIES[currency].locale, { style: 'currency', currency, maximumFractionDigits: digits, minimumFractionDigits: digits })
    formatters.set(key, f)
  }
  return f.format(amount)
}
