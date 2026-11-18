/**
 * Mock commerce SERVICE — runs on the server (Nitro routes in server/api/commerce).
 * This is the "trusted commerce service" of the integration plan: it never accepts prices from the
 * browser, rejects unknown/tampered option ids instead of silently fixing them, and re-checks
 * compatibility before a cart can be created.
 */
import { CURRENCY, GROUP_IDS } from '~/config/catalog'
import type { GroupId, PaintFinish, PaintSpec, Selections } from '~/types/configurator'
import { errorsOf, evaluateCompatibility } from '~/utils/compatibility'
import { findOption } from '~/utils/configuration'
import { buildIdFor, mockVariantTable, resolveMockVariants } from '../catalogMap'
import { type Attribute, type Cart, type CartLineInput, CommerceError, type OrderConfiguration, type Quote } from '../types'

const FINISHES: PaintFinish[] = ['matte', 'gloss', 'metallic']
const HEX = /^#[0-9a-f]{6}$/i

/** Strict parse: unknown ids or malformed paint are errors, not silently defaulted. */
export function parseOrderConfiguration(input: unknown): { selections: Selections; customPaint: PaintSpec | null } {
  if (!input || typeof input !== 'object') throw new CommerceError('Configuration is missing.', 'invalid-configuration')
  const raw = input as Partial<OrderConfiguration>
  if (raw.schema !== 'forgelab.order/v1') throw new CommerceError('Unsupported configuration schema.', 'invalid-configuration')
  if (!raw.selections || typeof raw.selections !== 'object') throw new CommerceError('Selections are missing.', 'invalid-configuration')

  const selections = {} as Selections
  const unknown: string[] = []
  for (const g of GROUP_IDS) {
    const value = (raw.selections as Record<string, unknown>)[g]
    if (value === null || value === undefined) selections[g] = null
    else if (typeof value === 'string' && findOption(g, value)) selections[g] = value
    else unknown.push(`${g}=${String(value)}`)
  }
  if (unknown.length) throw new CommerceError(`Unknown options: ${unknown.join(', ')}`, 'invalid-configuration', unknown)

  let customPaint: PaintSpec | null = null
  if (findOption('paint', selections.paint)?.paint?.custom) {
    const cp = raw.customPaint
    if (!cp || !HEX.test(cp.color ?? '') || !FINISHES.includes(cp.finish)) throw new CommerceError('Custom paint needs a valid colour and finish.', 'invalid-configuration')
    customPaint = { color: cp.color.toUpperCase(), finish: cp.finish }
  }
  return { selections, customPaint }
}

export function quoteOrder(input: unknown, now = new Date()): Quote {
  const { selections, customPaint } = parseOrderConfiguration(input)
  const missing = GROUP_IDS.filter((g) => !selections[g]) as GroupId[]
  const issues = evaluateCompatibility(selections)
  const lines = missing.length ? [] : resolveMockVariants(selections, customPaint)
  return {
    source: 'mock-server',
    buildId: buildIdFor(selections, customPaint),
    complete: missing.length === 0,
    valid: errorsOf(issues).length === 0,
    missing,
    issues,
    lines,
    total: { amount: lines.reduce((s, l) => s + l.price.amount, 0), currencyCode: CURRENCY },
    quotedAt: now.toISOString(),
  }
}

/** Creates a cart, pricing every line from the server-side variant table. */
export function createMockCart(input: unknown, idSeed = Date.now()): Cart {
  const body = (input ?? {}) as { lines?: CartLineInput[]; attributes?: Attribute[] }
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new CommerceError('Cart has no lines.', 'invalid-configuration')

  const table = mockVariantTable()
  const lines = body.lines.map((line, i) => {
    const variant = table.get(line.merchandiseId)
    if (!variant) throw new CommerceError(`Unknown variant ${line.merchandiseId}`, 'unavailable')
    const quantity = Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 5 ? line.quantity : 1
    return {
      id: `mock-line-${i + 1}`,
      merchandiseId: variant.variantId,
      sku: variant.sku,
      title: variant.title,
      quantity,
      attributes: sanitizeAttributes(line.attributes),
      cost: { amount: variant.price.amount * quantity, currencyCode: variant.price.currencyCode },
    }
  })
  const total = lines.reduce((s, l) => s + l.cost.amount, 0)
  const id = `mock-cart-${idSeed.toString(36)}`
  return {
    id,
    lines,
    attributes: sanitizeAttributes(body.attributes),
    cost: { subtotal: { amount: total, currencyCode: CURRENCY }, total: { amount: total, currencyCode: CURRENCY } },
    checkoutUrl: `#demo-checkout/${id}`,
  }
}

function sanitizeAttributes(attrs: unknown): Attribute[] {
  if (!Array.isArray(attrs)) return []
  return attrs
    .filter((a): a is Attribute => !!a && typeof a.key === 'string' && typeof a.value === 'string')
    .slice(0, 20)
    .map((a) => ({ key: a.key.slice(0, 64), value: a.value.slice(0, 1000) }))
}
