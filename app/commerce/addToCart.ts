import { GROUPS } from '~/config/catalog'
import type { Configuration } from '~/types/configurator'
import { findOption } from '~/utils/configuration'
import { type Cart, CommerceError, type CommerceProvider, type OrderConfiguration, type Quote } from './types'

/** Browser → commerce payload. Deliberately carries no prices. */
export function toOrderConfiguration(config: Configuration, model: string): OrderConfiguration {
  const custom = findOption('paint', config.selections.paint)?.paint?.custom
  return { schema: 'forgelab.order/v1', model, selections: { ...config.selections }, customPaint: custom ? { ...config.customPaint } : null }
}

/**
 * The checkout workflow, provider-agnostic:
 *  1. trusted quote (server validates + prices)  2. refuse incomplete/incompatible builds
 *  3. create cart with one line per variant + build attributes  4. caller redirects to checkoutUrl
 */
export async function addConfigurationToCart(provider: CommerceProvider, order: OrderConfiguration): Promise<{ quote: Quote; cart: Cart }> {
  const quote = await provider.quote(order)
  if (!quote.complete) {
    throw new CommerceError(`Missing selections: ${quote.missing.map((g) => GROUPS[g].label).join(', ')}`, 'incomplete', quote.missing)
  }
  if (!quote.valid) throw new CommerceError('This build has compatibility issues.', 'incompatible', quote.issues)
  if (quote.lines.some((l) => !l.available)) throw new CommerceError('Some components are unavailable.', 'unavailable')

  const cart = await provider.cart.createCart(
    quote.lines.map((l) => ({
      merchandiseId: l.variantId,
      quantity: 1,
      // Underscore-prefixed keys are conventionally hidden from customers at checkout.
      attributes: [{ key: '_forgelab_build', value: quote.buildId }, ...l.attributes],
    })),
    [
      { key: 'forgelab_build', value: quote.buildId },
      { key: 'forgelab_model', value: order.model },
    ],
  )
  return { quote, cart }
}
