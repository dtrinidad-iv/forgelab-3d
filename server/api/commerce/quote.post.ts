import { quoteOrder } from '~/commerce/mock/service'
import { CommerceError } from '~/commerce/types'

/** POST /api/commerce/quote — trusted validation + pricing of an OrderConfiguration (mock store). */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    return quoteOrder(body)
  } catch (err) {
    if (err instanceof CommerceError) throw createError({ statusCode: 400, statusMessage: err.message, data: { code: err.code } })
    throw err
  }
})
