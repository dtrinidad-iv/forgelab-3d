/**
 * Maps configurator selections to purchasable variants.
 *
 * Mock mapping: deterministic SKUs (`FL-FRAME-AERO-CARBON-M`) and `mock://variant/...` ids.
 * For Shopify, replace `variantIdFor` with a lookup table / metafield sync of real
 * `gid://shopify/ProductVariant/...` ids (see docs/shopify-integration.md).
 *
 * Frame + size become ONE variant (a frame product with size variants), like a real store.
 */
import { CATALOG, CURRENCY, GROUPS } from '~/config/catalog'
import type { GroupId, PaintSpec, Selections } from '~/types/configurator'
import { findOption } from '~/utils/configuration'
import { stockFor } from '~/config/inventory'
import type { ComponentVariant } from './types'

const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-')

export const variantIdFor = (sku: string) => `mock://variant/${sku}`

/** SKU for a frame + size combination (one purchasable variant). */
export const frameSku = (frameId: string, sizeId: string) => `FL-FRAME-${slug(frameId)}-${slug(sizeId)}`
/** SKU for any other component option. */
export const componentSku = (group: GroupId, optionId: string) => `FL-${slug(group)}-${slug(optionId)}`

/** Every purchasable mock variant, keyed by variant id (the server prices carts from this). */
export function mockVariantTable(): Map<string, Omit<ComponentVariant, 'attributes' | 'available'>> {
  const table = new Map<string, Omit<ComponentVariant, 'attributes' | 'available'>>()
  const add = (groups: GroupId[], sku: string, title: string, amount: number) =>
    table.set(variantIdFor(sku), { groups, sku, variantId: variantIdFor(sku), title, price: { amount, currencyCode: CURRENCY } })

  for (const frame of CATALOG.frame) {
    for (const size of CATALOG.size) add(['frame', 'size'], frameSku(frame.id, size.id), `${frame.name} frameset — ${size.name}`, frame.price + size.price)
  }
  for (const group of Object.keys(CATALOG) as GroupId[]) {
    if (group === 'frame' || group === 'size') continue
    for (const o of CATALOG[group]) add([group], componentSku(group, o.id), `${GROUPS[group].label}: ${o.name}`, o.price)
  }
  return table
}

/** Variants for a (validated) selection set. Assumes all required groups are selected. */
export function resolveMockVariants(selections: Selections, customPaint: PaintSpec | null): ComponentVariant[] {
  const table = mockVariantTable()
  const out: ComponentVariant[] = []
  const push = (sku: string, attributes: ComponentVariant['attributes'] = []) => {
    const v = table.get(variantIdFor(sku))
    if (v) out.push({ ...v, available: stockFor(sku) !== 0, attributes })
  }

  const frame = findOption('frame', selections.frame)
  const size = findOption('size', selections.size)
  if (frame && size) push(frameSku(frame.id, size.id))

  for (const group of Object.keys(CATALOG) as GroupId[]) {
    if (group === 'frame' || group === 'size') continue
    const o = findOption(group, selections[group])
    if (!o) continue
    const attrs = group === 'paint' && o.paint?.custom && customPaint
      ? [{ key: 'Paint colour', value: customPaint.color }, { key: 'Paint finish', value: customPaint.finish }]
      : []
    push(componentSku(group, o.id), attrs)
  }
  return out
}

/** Short, deterministic id for a configuration (used to group cart lines into one build). */
export function buildIdFor(selections: Selections, customPaint: PaintSpec | null): string {
  const text = JSON.stringify([selections, customPaint])
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `FLB-${(h >>> 0).toString(36).toUpperCase().padStart(7, '0')}`
}
