import { CURRENCIES, type CurrencyCode } from '~/config/currency'

/** USD → currency, rounded to whole units (prices are shown without cents). */
export function convertFromUsd(usd: number, currency: CurrencyCode): number {
  return Math.round(usd * CURRENCIES[currency].rate)
}

const formatters = new Map<CurrencyCode, Intl.NumberFormat>()
export function formatMoney(amount: number, currency: CurrencyCode): string {
  let f = formatters.get(currency)
  if (!f) {
    f = new Intl.NumberFormat(CURRENCIES[currency].locale, { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 })
    formatters.set(currency, f)
  }
  return f.format(amount)
}
