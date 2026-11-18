import { describe, expect, it } from 'vitest'
import { CATALOG, DEFAULT_CONFIGURATION, GROUP_IDS } from '~/config/catalog'
import type { GroupId } from '~/types/configurator'
import { calculatePrice, formatPrice } from '~/utils/pricing'

const full = { ...DEFAULT_CONFIGURATION.selections, size: 'm' }

describe('pricing engine', () => {
  it('sums the default build and flags the unselected size', () => {
    const result = calculatePrice(DEFAULT_CONFIGURATION.selections)
    expect(result.total).toBe(1900 + 0 + 850 + 650 + 220 + 80 + 30 + 180)
    expect(result.missing).toEqual(['size'])
    expect(result.currency).toBe('USD')
  })

  it('produces one line per group with the catalog price', () => {
    const result = calculatePrice(full)
    expect(result.missing).toEqual([])
    expect(result.lines.map((l) => l.group)).toEqual(GROUP_IDS)
    for (const line of result.lines) {
      expect(line.price).toBe(CATALOG[line.group as GroupId].find((o) => o.id === line.optionId)!.price)
    }
  })

  it('updates immediately when an option changes', () => {
    const base = calculatePrice(full).total
    expect(calculatePrice({ ...full, paint: 'custom' }).total).toBe(base + 300)
    expect(calculatePrice({ ...full, wheels: 'carbon-deep' }).total).toBe(base + 150)
    expect(calculatePrice({ ...full, frame: 'steel' }).total).toBe(base - 700)
  })

  it('ignores unknown option ids instead of pricing them', () => {
    const result = calculatePrice({ ...full, wheels: 'gold-plated' })
    expect(result.missing).toEqual(['wheels'])
    expect(result.lines.find((l) => l.group === 'wheels')).toBeUndefined()
  })

  it('formats USD without cents', () => {
    expect(formatPrice(3910)).toBe('$3,910')
  })
})
