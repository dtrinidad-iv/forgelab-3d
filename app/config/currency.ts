/**
 * Display currencies. Catalog prices are USD; other currencies use FIXED DEMO RATES (not live FX).
 * The commerce server converts with the same table, so carts are priced server-side in the
 * customer's currency. With Shopify, prices come from Markets via the buyer's `country`
 * (each currency maps to a country below) instead of this table.
 */
export type CurrencyCode = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'JPY'

export interface CurrencyDef {
  code: CurrencyCode
  /** Units of this currency per 1 USD (demo rate). */
  rate: number
  locale: string
  /** Country used for Shopify `@inContext(country:)` / shipping default. */
  country: string
  label: string
}

export const DEMO_RATES_NOTE = 'Demo exchange rates (fixed), for illustration only'

export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  USD: { code: 'USD', rate: 1, locale: 'en-US', country: 'US', label: 'USD $' },
  // en-US formats CAD as "CA$" — unambiguous next to USD (en-CA would show a bare "$").
  CAD: { code: 'CAD', rate: 1.38, locale: 'en-US', country: 'CA', label: 'CAD $' },
  EUR: { code: 'EUR', rate: 0.92, locale: 'en-IE', country: 'DE', label: 'EUR €' },
  GBP: { code: 'GBP', rate: 0.79, locale: 'en-GB', country: 'GB', label: 'GBP £' },
  JPY: { code: 'JPY', rate: 154, locale: 'en-US', country: 'JP', label: 'JPY ¥' },
}

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[]
export const BASE_CURRENCY: CurrencyCode = 'USD'

export const isCurrencyCode = (v: unknown): v is CurrencyCode => typeof v === 'string' && v in CURRENCIES
