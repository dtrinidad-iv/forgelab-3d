import { addConfigurationToCart, toOrderConfiguration } from '~/commerce/addToCart'
import { getCommerceProvider } from '~/commerce'
import { type Cart, CommerceError, type Quote } from '~/commerce/types'
import { FORGELAB_ROAD_BIKE } from '~/config/assetMap'
import { CURRENCIES } from '~/config/currency'
import { destinationOf, type ShipTo } from '~/config/shipping'

/** form = choosing a destination; working = server is validating/pricing. */
type Status = 'idle' | 'form' | 'working' | 'ready' | 'error'

export const PACKING_SLIP_KEY = 'forgelab-packing-slip'

/** Add-to-cart state. Talks only to the CommerceProvider interface. */
export function useCommerce() {
  const config = useRuntimeConfig()
  const { configuration } = useConfigurator()
  const { displayTotal: clientTotal } = usePricing()
  const { currency } = useCurrency()

  const status = useState<Status>('commerce-status', () => 'idle')
  const open = useState<boolean>('commerce-open', () => false)
  const quote = useState<Quote | null>('commerce-quote', () => null)
  const cart = useState<Cart | null>('commerce-cart', () => null)
  const error = useState<string>('commerce-error', () => '')
  const errorCode = useState<CommerceError['code'] | ''>('commerce-error-code', () => '')
  // Destination defaults to the display currency's country.
  const shipTo = useState<ShipTo>('commerce-ship-to', () => ({ country: CURRENCIES[currency.value].country, region: null }))
  /** Once the customer picks a destination we keep it; until then it follows the display currency. */
  const shipToChosen = useState<boolean>('commerce-ship-to-chosen', () => false)

  const provider = getCommerceProvider(config.public.commerceProvider as string)

  /** Opens the cart dialog at the "ship to" step. */
  function openCart() {
    open.value = true
    status.value = 'form'
    error.value = ''
    errorCode.value = ''
    finishRestricted.value = false
    cart.value = null
    if (!shipToChosen.value || !destinationOf(shipTo.value.country)) shipTo.value = { country: CURRENCIES[currency.value].country, region: null }
  }

  const finishRestricted = ref(false)

  async function addToCart() {
    open.value = true
    status.value = 'working'
    error.value = ''
    errorCode.value = ''
    cart.value = null
    try {
      const order = toOrderConfiguration(configuration.value, FORGELAB_ROAD_BIKE.id, currency.value, { ...shipTo.value })
      const result = await addConfigurationToCart(provider, order)
      quote.value = result.quote
      cart.value = result.cart
      status.value = 'ready'
    } catch (err) {
      error.value = err instanceof CommerceError || err instanceof Error ? err.message : 'Something went wrong.'
      errorCode.value = err instanceof CommerceError ? err.code : ''
      // A product rule (e.g. a finish) blocks this region → offer "Change finish"; otherwise only the destination can change.
      finishRestricted.value = err instanceof CommerceError && err.code === 'restricted' && Array.isArray(err.details) && err.details.length > 0
      status.value = 'error'
    }
  }

  /** Opens a printable packing slip / bill of materials for the current cart in a new tab. */
  function openPackingSlip() {
    if (!cart.value || !quote.value) return
    const data = { cart: cart.value, quote: quote.value, shipTo: quote.value.shipTo, createdAt: new Date().toISOString() }
    try {
      // localStorage (not sessionStorage): a tab opened with noopener doesn't inherit sessionStorage.
      localStorage.setItem(PACKING_SLIP_KEY, JSON.stringify(data))
    } catch {
      // Storage unavailable (blocked): the slip page explains what happened.
    }
    window.open('/packing-slip', '_blank', 'noopener')
  }

  const close = () => (open.value = false)

  return { provider, status, open, quote, cart, error, errorCode, finishRestricted, shipTo, shipToChosen, clientTotal, openCart, addToCart, openPackingSlip, close }
}
