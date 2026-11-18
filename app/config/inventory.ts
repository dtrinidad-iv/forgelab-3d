/**
 * DEMO stock per purchasable SKU (see app/commerce/catalogMap.ts for SKU format).
 * Frame + size is one SKU, so a frame can be sold out in one size only. Paint is made to order
 * (not tracked). With Shopify this comes from ProductVariant.quantityAvailable instead.
 */
export const DEMO_STOCK: Record<string, number> = {
  'FL-FRAME-TITANIUM-XS': 0,
  'FL-FRAME-STEEL-XL': 1,
  'FL-FRAME-AERO-CARBON-XL': 2,
  'FL-GROUPSET-CAMPAGNOLO-DEMO': 3,
  'FL-WHEELS-CARBON-DEEP': 2,
  'FL-BARTAPE-TAPE-GEL': 0,
  'FL-SADDLE-SADDLE-SHORT': 2,
}

/** Stock for SKUs not listed above. */
export const DEFAULT_STOCK = 12

/** Show "Only N left" at or below this level. */
export const LOW_STOCK_THRESHOLD = 3

/** null = not tracked (made to order). */
export function stockFor(sku: string): number | null {
  if (sku.startsWith('FL-PAINT-')) return null
  return DEMO_STOCK[sku] ?? DEFAULT_STOCK
}
