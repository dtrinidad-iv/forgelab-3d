import { componentSku, frameSku } from '~/commerce/catalogMap'
import { GROUPS, GROUP_IDS } from '~/config/catalog'
import { LOW_STOCK_THRESHOLD, stockFor } from '~/config/inventory'
import type { GroupId } from '~/types/configurator'
import { findOption } from '~/utils/configuration'

/**
 * Stock as the customer sees it for each option, given the rest of the build (frame × size).
 * Display only — the commerce server re-checks stock when pricing the cart.
 */
export function useInventory() {
  const { selections } = useConfigurator()
  const { selected: cover } = usePieces()

  /** null = not tracked / unknown yet (e.g. frame before a size is chosen). */
  function stockOf(group: GroupId, optionId: string): number | null {
    const s = selections.value
    if (group === 'frame') return s.size ? stockFor(frameSku(optionId, s.size)) : null
    if (group === 'size') return s.frame ? stockFor(frameSku(s.frame, optionId)) : null
    return stockFor(componentSku(group, optionId))
  }

  const isLow = (stock: number | null) => stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD

  /** Selected options that are currently out of stock. */
  const unavailable = computed(() =>
    GROUP_IDS.flatMap((g) => {
      const id = selections.value[g]
      if (!id || stockOf(g, id) !== 0) return []
      const o = findOption(g, id)
      const label = g === 'frame' || g === 'size' ? `${findOption('frame', selections.value.frame)?.name} in size ${findOption('size', selections.value.size)?.name}` : `${GROUPS[g].label}: ${o?.name}`
      return [{ group: g, label }]
    })
      .filter((x, i, arr) => arr.findIndex((y) => y.label === x.label) === i)
      // A sold one-of-a-kind cover is "out of stock" too (inventory of one).
      .concat(cover.value?.sold ? [{ group: 'saddle' as GroupId, label: `Unique cover: ${cover.value.name}` }] : []),
  )

  return { stockOf, isLow, unavailable }
}
