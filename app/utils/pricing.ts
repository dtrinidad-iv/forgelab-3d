import { CATALOG, CURRENCY, GROUPS, GROUP_IDS, LOCALE } from '~/config/catalog'
import type { GroupId, Selections } from '~/types/configurator'

/**
 * Standalone pricing engine — pure functions, no Vue, no commerce provider.
 * DISPLAY ONLY: real orders must be re-priced by a trusted server / commerce platform.
 */

export interface PriceLine {
  group: GroupId
  label: string
  optionId: string
  name: string
  price: number
}

export interface PriceBreakdown {
  lines: PriceLine[]
  total: number
  currency: string
  /** Groups without a selection (excluded from the total). */
  missing: GroupId[]
}

export function calculatePrice(selections: Selections): PriceBreakdown {
  const lines: PriceLine[] = []
  const missing: GroupId[] = []

  for (const group of GROUP_IDS) {
    const optionId = selections[group]
    const option = optionId ? CATALOG[group].find((o) => o.id === optionId) : undefined
    if (!option) {
      missing.push(group)
      continue
    }
    lines.push({ group, label: GROUPS[group].label, optionId: option.id, name: option.name, price: option.price })
  }

  return {
    lines,
    total: lines.reduce((sum, l) => sum + l.price, 0),
    currency: CURRENCY,
    missing,
  }
}

const formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })

export function formatPrice(value: number): string {
  return formatter.format(value)
}
