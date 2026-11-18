import { randomBytes } from 'node:crypto'
import { createStorage, type Storage } from 'unstorage'
import netlifyBlobsDriver from 'unstorage/drivers/netlify-blobs'
import { MAX_IMAGE_BYTES, MAX_PIECES, PIECE_ID, type UniquePiece } from '~/types/pieces'

const onNetlifyBlobs = () => Boolean((globalThis as { netlifyBlobsContext?: string }).netlifyBlobsContext || process.env.NETLIFY_BLOBS_CONTEXT)

/**
 * Storage: Netlify Blobs on Netlify, ./.data/pieces locally (nitro.storage in nuxt.config).
 * On Netlify a NEW client is created per call: @netlify/blobs reads the access token when the store
 * is created, and that token is short-lived per invocation — a cached client starts failing with 401.
 * Reads are strongly consistent (default Blobs reads can lag writes by up to a minute).
 */
export const piecesStore = (): Storage =>
  onNetlifyBlobs()
    ? // strong consistency: an upload/delete/sold change is visible on the very next request
      createStorage({ driver: netlifyBlobsDriver({ name: 'forgelab-pieces', consistency: 'strong' }) })
    : useStorage('pieces')

export async function listPieces(): Promise<UniquePiece[]> {
  const store = piecesStore()
  const keys = (await store.getKeys('meta')).slice(0, 200)
  const items = await Promise.all(keys.map((k) => store.getItem<UniquePiece>(k)))
  return items.filter((p): p is UniquePiece => !!p && PIECE_ID.test(p.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getPiece(id: string): Promise<UniquePiece | null> {
  if (!PIECE_ID.test(id)) return null
  return (await piecesStore().getItem<UniquePiece>(`meta:${id}`)) ?? null
}

/** Throws a 401/503 unless the request carries the admin password (uploads disabled without one). */
export function requireAdmin(event: Parameters<typeof getHeader>[0]) {
  const expected = useRuntimeConfig(event).adminPassword as string
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'Admin uploads are disabled on this deployment (no admin password configured).' })
  if (getHeader(event, 'x-admin-password') !== expected) throw createError({ statusCode: 401, statusMessage: 'Wrong admin password.' })
}

const SIGNATURES: Array<[UniquePiece['imageType'], (b: Uint8Array) => boolean]> = [
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ['image/webp', (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45],
]

/** Validates an upload payload. Image arrives as a data URL; its BYTES decide the type. */
export function parsePieceUpload(body: unknown): { piece: Omit<UniquePiece, 'id' | 'createdAt' | 'sold'>; bytes: Uint8Array } {
  const b = (body ?? {}) as Record<string, unknown>
  const name = String(b.name ?? '').trim()
  const story = String(b.story ?? '').trim()
  const price = Number(b.price)
  if (!name || name.length > 60) throw createError({ statusCode: 400, statusMessage: 'Name is required (max 60 characters).' })
  if (story.length > 240) throw createError({ statusCode: 400, statusMessage: 'Story is too long (max 240 characters).' })
  if (!Number.isFinite(price) || price < 0 || price > 2000 || !Number.isInteger(price)) throw createError({ statusCode: 400, statusMessage: 'Price must be a whole number between 0 and 2000.' })
  const match = /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image ?? ''))
  if (!match) throw createError({ statusCode: 400, statusMessage: 'Image is missing.' })
  const bytes = new Uint8Array(Buffer.from(match[1]!, 'base64'))
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw createError({ statusCode: 413, statusMessage: 'Image is too large (max 1.5 MB after resizing).' })
  const type = SIGNATURES.find(([, test]) => test(bytes))?.[0]
  if (!type) throw createError({ statusCode: 415, statusMessage: 'Only JPEG, PNG or WebP images are accepted.' })
  return { piece: { name, story, price, imageType: type }, bytes }
}

export async function createPiece(body: unknown): Promise<UniquePiece> {
  const { piece, bytes } = parsePieceUpload(body)
  const store = piecesStore()
  if ((await store.getKeys('meta')).length >= MAX_PIECES) throw createError({ statusCode: 409, statusMessage: `The collection is full (${MAX_PIECES} pieces). Delete one first.` })
  const full: UniquePiece = { ...piece, id: `p-${randomBytes(6).toString('hex')}`, createdAt: new Date().toISOString(), sold: false }
  await store.setItemRaw(`image:${full.id}`, bytes)
  await store.setItem(`meta:${full.id}`, full)
  return full
}
