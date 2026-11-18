/** PATCH /api/admin/pieces/:id { sold: boolean } — mark a unique piece sold / available (admin). */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const piece = await getPiece(getRouterParam(event, 'id') ?? '')
  if (!piece) throw createError({ statusCode: 404, statusMessage: 'Piece not found' })
  const { sold } = (await readBody(event)) as { sold?: unknown }
  const updated = { ...piece, sold: Boolean(sold) }
  await piecesStore().setItem(`meta:${piece.id}`, updated)
  return updated
})
