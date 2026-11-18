/** POST /api/admin/pieces — upload a unique piece (admin password required). */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return createPiece(await readBody(event))
})
