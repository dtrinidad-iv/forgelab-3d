import type { UniquePiece } from '~/types/pieces'

/** The studio's one-of-a-kind saddle covers (server-rendered list; refreshable). */
export function usePieces() {
  const { configuration, setUniqueCover } = useConfigurator()
  const { data, refresh, status } = useFetch<UniquePiece[]>('/api/pieces', { key: 'pieces', default: () => [] })

  const pieces = computed(() => data.value ?? [])
  /** The selected piece, if it still exists (a deleted piece silently drops out of the build). */
  const selected = computed(() => pieces.value.find((p) => p.id === configuration.value.uniqueCover) ?? null)
  const imageUrl = (id: string) => `/api/pieces/${id}/image`

  return { pieces, selected, imageUrl, select: setUniqueCover, refresh, status }
}
