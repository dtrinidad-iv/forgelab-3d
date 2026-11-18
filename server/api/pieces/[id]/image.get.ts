/** GET /api/pieces/:id/image — the exact photo of a unique piece (ids are unique → cache forever). */
export default defineEventHandler(async (event) => {
  const piece = await getPiece(getRouterParam(event, 'id') ?? '')
  if (!piece) throw createError({ statusCode: 404, statusMessage: 'Piece not found' })
  const bytes = await piecesStore().getItemRaw<Uint8Array>(`image:${piece.id}`)
  if (!bytes) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  setResponseHeaders(event, { 'content-type': piece.imageType, 'cache-control': 'public, max-age=31536000, immutable' })
  return Buffer.from(bytes)
})
