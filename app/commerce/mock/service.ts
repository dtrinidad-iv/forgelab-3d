/**
 * Mock commerce SERVICE — runs on the server (Nitro routes in server/api/commerce).
 * This is the "trusted commerce service" of the integration plan: it never accepts prices from the
 * browser, rejects unknown/tampered option ids instead of silently fixing them, and re-checks
 * compatibility before a cart can be created.
 */
import { GROUP_IDS } from '~/config/catalog'
import { BASE_CURRENCY, type CurrencyCode, isCurrencyCode } from '~/config/currency'
import { convertFromUsd } from '~/utils/money'
import { type ShipTo, shippingIssues, validateShipTo } from '~/config/shipping'
import type { GroupId, PaintFinish, PaintSpec, Selections } from '~/types/configurator'
import { errorsOf, evaluateCompatibility } from '~/utils/compatibility'
import { findOption } from '~/utils/configuration'
import { buildIdFor, mockVariantTable, resolveMockVariants } from '../catalogMap'
import { type Attribute, type Cart, type CartLineInput, CommerceError, type ComponentVariant, type OrderConfiguration, type Quote } from '../types'
import { PIECE_ID, type UniquePiece } from '~/types/pieces'

/** Server-side lookups the pure service needs (unique pieces live in storage, loaded by the route). */
export interface ServiceContext {
  pieces?: Map<string, UniquePiece>
}

export const pieceVariantId = (id: string) => `mock://piece/${id}`

function pieceLine(piece: UniquePiece, currency: CurrencyCode): ComponentVariant {
  return {
    groups: ['saddle'],
    sku: `FL-COVER-${piece.id.toUpperCase()}`,
    variantId: pieceVariantId(piece.id),
    title: `Saddle cover: ${piece.name} (one of a kind)`,
    price: { amount: convertFromUsd(piece.price, currency), currencyCode: currency },
    available: !piece.sold, // inventory of one
    attributes: [{ key: 'Unique piece', value: piece.id }],
  }
}

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

function parseCurrency(value: unknown): CurrencyCode {
  if (value === undefined || value === null) return BASE_CURRENCY
  if (!isCurrencyCode(value)) throw new CommerceError(`Unsupported currency: ${String(value)}`, 'invalid-configuration')
  return value
}

function parseShipTo(value: unknown): ShipTo | null {
  if (value === undefined || value === null) return null
  const v = value as { country?: unknown; region?: unknown }
  const shipTo: ShipTo = { country: String(v.country ?? ''), region: v.region ? String(v.region) : null }
  const problem = validateShipTo(shipTo)
  if (problem) throw new CommerceError(problem, 'invalid-configuration')
  return shipTo
}

export function quoteOrder(input: unknown, now = new Date(), ctx: ServiceContext = {}): Quote {
  const { selections, customPaint } = parseOrderConfiguration(input)
  const currency = parseCurrency((input as { currency?: unknown }).currency)
  const shipTo = parseShipTo((input as { shipTo?: unknown }).shipTo)
  const missing = GROUP_IDS.filter((g) => !selections[g]) as GroupId[]
  const issues = evaluateCompatibility(selections)
  // Each line is converted and rounded; the total is the sum of rounded lines (receipts add up).
  const lines: ComponentVariant[] = (missing.length ? [] : resolveMockVariants(selections, customPaint)).map((l) => ({
    ...l,
    price: { amount: convertFromUsd(l.price.amount, currency), currencyCode: currency },
  }))
  const coverId = (input as { uniqueCover?: unknown }).uniqueCover
  if (coverId !== undefined && coverId !== null) {
    if (typeof coverId !== 'string' || !PIECE_ID.test(coverId)) throw new CommerceError('Invalid unique piece id.', 'invalid-configuration')
    const piece = ctx.pieces?.get(coverId)
    if (!piece) throw new CommerceError('This one-of-a-kind cover is no longer available.', 'unavailable')
    if (!missing.length) lines.push(pieceLine(piece, currency))
  }
  return {
    source: 'mock-server',
    buildId: buildIdFor(selections, customPaint),
    complete: missing.length === 0,
    valid: errorsOf(issues).length === 0,
    missing,
    issues,
    shippingIssues: shipTo ? shippingIssues(selections, shipTo) : [],
    shipTo,
    lines,
    total: { amount: lines.reduce((s, l) => s + l.price.amount, 0), currencyCode: currency },
    quotedAt: now.toISOString(),
  }
}

/** Creates a cart, pricing every line from the server-side variant table. */
export function createMockCart(input: unknown, idSeed = Date.now(), ctx: ServiceContext = {}): Cart {
  const body = (input ?? {}) as { lines?: CartLineInput[]; attributes?: Attribute[]; currency?: unknown }
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new CommerceError('Cart has no lines.', 'invalid-configuration')
  const currency = parseCurrency(body.currency)

  const table = mockVariantTable()
  const lines = body.lines.map((line, i) => {
    const pieceId = line.merchandiseId.startsWith('mock://piece/') ? line.merchandiseId.slice('mock://piece/'.length) : null
    const piece = pieceId ? ctx.pieces?.get(pieceId) : undefined
    if (pieceId && (!piece || piece.sold)) throw new CommerceError('This one-of-a-kind cover is no longer available.', 'unavailable')
    const variant = piece ? { ...pieceLine(piece, BASE_CURRENCY), price: { amount: piece.price, currencyCode: BASE_CURRENCY } } : table.get(line.merchandiseId)
    if (!variant) throw new CommerceError(`Unknown variant ${line.merchandiseId}`, 'unavailable')
    const quantity = Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 5 ? line.quantity : 1
    return {
      id: `mock-line-${i + 1}`,
      merchandiseId: variant.variantId,
      sku: variant.sku,
      title: variant.title,
      quantity,
      attributes: sanitizeAttributes(line.attributes),
      cost: { amount: convertFromUsd(variant.price.amount, currency) * quantity, currencyCode: currency },
    }
  })
  const total = lines.reduce((s, l) => s + l.cost.amount, 0)
  const id = `mock-cart-${idSeed.toString(36)}`
  return {
    id,
    lines,
    attributes: sanitizeAttributes(body.attributes),
    cost: { subtotal: { amount: total, currencyCode: currency }, total: { amount: total, currencyCode: currency } },
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
