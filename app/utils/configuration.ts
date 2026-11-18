import { CATALOG, DEFAULT_CONFIGURATION, GROUP_IDS } from '~/config/catalog'
import type { CatalogOption, Configuration, GroupId, PaintFinish, PaintSpec, Selections } from '~/types/configurator'

/** Pure helpers for configuration data. No Vue. */

const FINISHES: PaintFinish[] = ['matte', 'gloss', 'metallic']
const HEX = /^#[0-9a-f]{6}$/i

export function cloneDefaultConfiguration(): Configuration {
  return {
    selections: { ...DEFAULT_CONFIGURATION.selections },
    customPaint: { ...DEFAULT_CONFIGURATION.customPaint },
  }
}

export function findOption(group: GroupId, id: string | null | undefined): CatalogOption | undefined {
  return id ? CATALOG[group].find((o) => o.id === id) : undefined
}

/**
 * Rebuilds a Configuration from untrusted input (cookie, imported JSON).
 * Unknown option ids fall back to the default; malformed paint falls back to the default paint.
 */
export function sanitizeConfiguration(input: unknown): Configuration {
  const fallback = cloneDefaultConfiguration()
  if (!input || typeof input !== 'object') return fallback

  const raw = input as { selections?: Record<string, unknown>; customPaint?: Record<string, unknown> }
  const selections = { ...fallback.selections } as Selections

  for (const group of GROUP_IDS) {
    const value = raw.selections?.[group]
    if (value === null) selections[group] = null
    else if (typeof value === 'string' && findOption(group, value)) selections[group] = value
  }

  const color = raw.customPaint?.color
  const finish = raw.customPaint?.finish
  const customPaint: PaintSpec = {
    color: typeof color === 'string' && HEX.test(color) ? color : fallback.customPaint.color,
    finish: FINISHES.includes(finish as PaintFinish) ? (finish as PaintFinish) : fallback.customPaint.finish,
  }

  return { selections, customPaint }
}

/** The paint actually applied: the preset's spec, or the customer's colour for the custom option. */
export function resolvePaint(config: Configuration): PaintSpec | undefined {
  const option = findOption('paint', config.selections.paint)
  if (!option?.paint) return undefined
  return option.paint.custom ? { ...config.customPaint } : { color: option.paint.color, finish: option.paint.finish }
}
