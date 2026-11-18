import { BASE_CURRENCY, CURRENCIES, CURRENCY_CODES, type CurrencyCode, isCurrencyCode } from '~/config/currency'
import { convertFromUsd, formatMoney } from '~/utils/money'

/** Display currency (cookie-persisted, SSR-safe). Catalog prices are USD; this converts for display. */
export function useCurrency() {
  const cookie = useCookie<string>('forgelab_currency', { default: () => BASE_CURRENCY, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })
  const currency = computed<CurrencyCode>(() => (isCurrencyCode(cookie.value) ? cookie.value : BASE_CURRENCY))

  const setCurrency = (code: CurrencyCode) => (cookie.value = code)
  const convert = (usd: number) => convertFromUsd(usd, currency.value)
  /** Format a USD catalog amount in the display currency. */
  const format = (usd: number) => formatMoney(convert(usd), currency.value)

  return { currency, currencies: CURRENCY_CODES.map((c) => CURRENCIES[c]), setCurrency, convert, format }
}
