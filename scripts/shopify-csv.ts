/**
 * Writes shopify/forgelab-products.csv — the Shopify product import generated from the configurator
 * catalog (same SKUs, prices and demo stock). Usage: npm run shopify:csv
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { shopifyProductRows, shopifyProductsCsv } from '../app/commerce/shopify/productsCsv'

const out = 'shopify/forgelab-products.csv'
mkdirSync('shopify', { recursive: true })
writeFileSync(out, shopifyProductsCsv())
const rows = shopifyProductRows()
console.log(`✓ ${out}: ${rows.filter((r) => r.Title).length} products, ${rows.length} variants`)
