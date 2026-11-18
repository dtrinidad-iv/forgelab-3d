import { createMockCart } from '~/commerce/mock/service'
import { createShopifyCart } from '~/commerce/shopify/service'
import { CommerceError } from '~/commerce/types'
import type { UniquePiece } from '~/types/pieces'

/** POST /api/commerce/cart — creates a cart; every line is priced server-side (or by Shopify). */
export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { lines?: Array<{ merchandiseId?: unknown }> } | null
  try {
    if (usesShopify(event)) return await createShopifyCart(body, requireShopifyStorefront(event))

    const pieces = new Map<string, UniquePiece>()
    for (const line of body?.lines ?? []) {
      const id = typeof line?.merchandiseId === 'string' && line.merchandiseId.startsWith('mock://piece/') ? line.merchandiseId.slice(13) : null
      const piece = id ? await getPiece(id) : null
      if (piece) pieces.set(piece.id, piece)
    }
    return createMockCart(body, Date.now(), { pieces })
  } catch (err) {
    if (err instanceof CommerceError) throw createError({ statusCode: err.code === 'network' ? 502 : 400, statusMessage: err.message, data: { code: err.code } })
    throw err
  }
})
