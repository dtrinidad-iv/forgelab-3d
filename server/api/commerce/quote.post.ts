import { quoteOrder } from '~/commerce/mock/service'
import { quoteShopify } from '~/commerce/shopify/service'
import { CommerceError } from '~/commerce/types'
import type { UniquePiece } from '~/types/pieces'

/** POST /api/commerce/quote — trusted validation + pricing (mock store, or Shopify when configured). */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    if (usesShopify(event)) return await quoteShopify(body, requireShopifyStorefront(event), new Date())

    // Unique pieces live in storage: load the referenced one so the pure service can price it.
    const pieces = new Map<string, UniquePiece>()
    const coverId = (body as { uniqueCover?: unknown } | null)?.uniqueCover
    if (typeof coverId === 'string') {
      const piece = await getPiece(coverId)
      if (piece) pieces.set(piece.id, piece)
    }
    return quoteOrder(body, new Date(), { pieces })
  } catch (err) {
    if (err instanceof CommerceError) throw createError({ statusCode: err.code === 'network' ? 502 : 400, statusMessage: err.message, data: { code: err.code } })
    throw err
  }
})
