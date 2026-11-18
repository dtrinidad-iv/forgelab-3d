/**
 * Shopify product import (CSV, current column names — help.shopify.com "Product CSV columns").
 * Generated from the SAME catalog, SKUs (catalogMap) and demo stock (config/inventory) the
 * configurator uses, so the Shopify provider can match every line by SKU.
 *
 *  - one product per frame, with a "Size" option (frame + size = one variant, like the mock store)
 *  - one product per other component group, one variant per option
 * Prices are in the store currency (set the store to USD before importing).
 */
import { CATALOG, GROUPS } from '~/config/catalog'
import { stockFor } from '~/config/inventory'
import type { CatalogOption, GroupId } from '~/types/configurator'
import { componentSku, frameSku } from '../catalogMap'

export const SHOPIFY_PRODUCT_TAG = 'forgelab-demo'

export const CSV_HEADERS = [
  'Title',
  'URL handle',
  'Description',
  'Vendor',
  'Type',
  'Tags',
  'Published on online store',
  'Status',
  'SKU',
  'Option1 name',
  'Option1 value',
  'Price',
  'Charge tax',
  'Inventory tracker',
  'Inventory quantity',
  'Continue selling when out of stock',
  'Requires shipping',
  'Fulfillment service',
] as const

export type CsvRow = Partial<Record<(typeof CSV_HEADERS)[number], string>>

const handleOf = (s: string) => `forgelab-${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const describe = (lead: string, options: CatalogOption[]) =>
  `<p>${escapeHtml(lead)}</p><ul>${options.map((o) => `<li><strong>${escapeHtml(o.name)}</strong> — ${escapeHtml(o.tagline)}</li>`).join('')}</ul>` +
  '<p><em>Fictional ForgeLab demo product. Specs and prices are illustrative.</em></p>'

function variantRow(sku: string, optionValue: string, price: number): CsvRow {
  const stock = stockFor(sku) // null = not tracked (e.g. paint is applied to order)
  return {
    SKU: sku,
    'Option1 value': optionValue,
    Price: price.toFixed(2),
    'Charge tax': 'true',
    'Inventory tracker': stock === null ? '' : 'shopify',
    'Inventory quantity': stock === null ? '' : String(stock),
    'Continue selling when out of stock': 'deny',
    'Requires shipping': 'true',
    'Fulfillment service': 'manual',
  }
}

function product(title: string, type: string, description: string, optionName: string, variants: CsvRow[]): CsvRow[] {
  const handle = handleOf(title)
  return variants.map((v, i) =>
    i === 0
      ? { Title: title, 'URL handle': handle, Description: description, Vendor: 'ForgeLab', Type: type, Tags: SHOPIFY_PRODUCT_TAG, 'Published on online store': 'true', Status: 'active', 'Option1 name': optionName, ...v }
      : { 'URL handle': handle, ...v },
  )
}

export function shopifyProductRows(): CsvRow[] {
  const rows: CsvRow[] = []
  for (const frame of CATALOG.frame) {
    rows.push(
      ...product(
        `${frame.name} frameset`,
        'Frameset',
        describe(frame.tagline, CATALOG.size),
        'Size',
        CATALOG.size.map((size) => variantRow(frameSku(frame.id, size.id), size.name, frame.price + size.price)),
      ),
    )
  }
  for (const group of Object.keys(CATALOG) as GroupId[]) {
    if (group === 'frame' || group === 'size') continue
    const label = GROUPS[group].label
    rows.push(
      ...product(
        `ForgeLab ${label}`,
        label,
        describe(`${label} options for the ForgeLab configurator.`, CATALOG[group]),
        label,
        CATALOG[group].map((o) => variantRow(componentSku(group, o.id), o.name, o.price)),
      ),
    )
  }
  return rows
}

const cell = (v = '') => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function shopifyProductsCsv(): string {
  const lines = [CSV_HEADERS.join(','), ...shopifyProductRows().map((r) => CSV_HEADERS.map((h) => cell(r[h])).join(','))]
  return lines.join('\n') + '\n'
}
