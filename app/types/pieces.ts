/** A one-of-a-kind saddle cover uploaded by the studio (photo = the exact piece the buyer gets). */
export interface UniquePiece {
  id: string
  name: string
  story: string
  /** USD surcharge. */
  price: number
  createdAt: string
  sold: boolean
  imageType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export const PIECE_ID = /^p-[a-z0-9]{6,32}$/
export const MAX_PIECES = 24
export const MAX_IMAGE_BYTES = 1_500_000
