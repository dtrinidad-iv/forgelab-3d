/** DELETE /api/admin/pieces/:id (admin password required). */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const piece = await getPiece(getRouterParam(event, 'id') ?? '')
  if (!piece) throw createError({ statusCode: 404, statusMessage: 'Piece not found' })
  await piecesStore().removeItem(`meta:${piece.id}`)
  await piecesStore().removeItem(`image:${piece.id}`)
  return { deleted: piece.id }
})
