import { addConfigurationToCart, toOrderConfiguration } from '~/commerce/addToCart'
import { getCommerceProvider } from '~/commerce'
import { type Cart, CommerceError, type Quote } from '~/commerce/types'
import { FORGELAB_ROAD_BIKE } from '~/config/assetMap'

type Status = 'idle' | 'working' | 'ready' | 'error'

/** Add-to-cart state. Talks only to the CommerceProvider interface. */
export function useCommerce() {
  const config = useRuntimeConfig()
  const { configuration } = useConfigurator()
  const { total: clientTotal } = usePricing()

  const status = useState<Status>('commerce-status', () => 'idle')
  const open = useState<boolean>('commerce-open', () => false)
  const quote = useState<Quote | null>('commerce-quote', () => null)
  const cart = useState<Cart | null>('commerce-cart', () => null)
  const error = useState<string>('commerce-error', () => '')

  const provider = getCommerceProvider(config.public.commerceProvider as string)

  async function addToCart() {
    open.value = true
    status.value = 'working'
    error.value = ''
    cart.value = null
    try {
      const result = await addConfigurationToCart(provider, toOrderConfiguration(configuration.value, FORGELAB_ROAD_BIKE.id))
      quote.value = result.quote
      cart.value = result.cart
      status.value = 'ready'
    } catch (err) {
      error.value = err instanceof CommerceError || err instanceof Error ? err.message : 'Something went wrong.'
      status.value = 'error'
    }
  }

  const close = () => (open.value = false)

  return { provider, status, open, quote, cart, error, clientTotal, addToCart, close }
}
