import { createMockCart } from '~/commerce/mock/service'
import { CommerceError } from '~/commerce/types'

/** POST /api/commerce/cart — creates a demo cart, pricing every line server-side by variant id. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    return createMockCart(body)
  } catch (err) {
    if (err instanceof CommerceError) throw createError({ statusCode: 400, statusMessage: err.message, data: { code: err.code } })
    throw err
  }
})
