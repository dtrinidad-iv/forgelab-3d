import { GROUPS, GROUP_IDS } from '~/config/catalog'
import type { Configuration, GroupId, PaintSpec } from '~/types/configurator'
import { type CompatibilityIssue, errorsOf, evaluateCompatibility } from '~/utils/compatibility'
import { findOption, resolvePaint } from '~/utils/configuration'
import { calculatePrice } from '~/utils/pricing'

/**
 * Portable configuration document (`forgelab.configuration/v1`).
 * This is the hand-off format for a future commerce backend: it must be RE-VALIDATED and
 * RE-PRICED server-side — client prices here are for display only.
 */
export interface ConfigurationExport {
  schema: 'forgelab.configuration/v1'
  exportedAt: string
  model: string
  complete: boolean
  valid: boolean
  missing: GroupId[]
  selections: Record<GroupId, { optionId: string; name: string; price: number } | null>
  paint: (PaintSpec & { custom: boolean }) | null
  /** One-of-a-kind saddle cover id (priced by the commerce server from the studio's records). */
  uniqueCover: string | null
  pricing: {
    currency: string
    total: number
    lines: { group: GroupId; label: string; optionId: string; name: string; price: number }[]
    notice: string
  }
  compatibility: { valid: boolean; issues: CompatibilityIssue[] }
}

export function buildConfigurationExport(config: Configuration, opts: { model: string; now?: Date }): ConfigurationExport {
  const price = calculatePrice(config.selections)
  const issues = evaluateCompatibility(config.selections)
  const valid = errorsOf(issues).length === 0
  const paintOption = findOption('paint', config.selections.paint)
  const paint = resolvePaint(config)

  const selections = Object.fromEntries(
    GROUP_IDS.map((g) => {
      const o = findOption(g, config.selections[g])
      return [g, o ? { optionId: o.id, name: o.name, price: o.price } : null]
    }),
  ) as ConfigurationExport['selections']

  return {
    schema: 'forgelab.configuration/v1',
    exportedAt: (opts.now ?? new Date()).toISOString(),
    model: opts.model,
    complete: price.missing.length === 0,
    valid,
    missing: price.missing,
    selections,
    paint: paint ? { ...paint, custom: Boolean(paintOption?.paint?.custom) } : null,
    uniqueCover: config.uniqueCover ?? null,
    pricing: {
      currency: price.currency,
      total: price.total,
      lines: price.lines.filter((l) => l.group !== 'uniqueCover').map((l) => ({ ...l, group: l.group as GroupId, label: GROUPS[l.group as GroupId].label })),
      notice: 'Display pricing only. Prices must be re-validated by the commerce backend before checkout.',
    },
    compatibility: { valid, issues },
  }
}

export function exportFileName(now = new Date()): string {
  return `forgelab-build-${now.toISOString().slice(0, 10)}.json`
}
