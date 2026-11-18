import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from '~/config/catalog'
import { buildConfigurationExport, exportFileName } from '~/utils/exportConfiguration'
import { sanitizeConfiguration } from '~/utils/configuration'

const now = new Date('2026-11-19T15:00:00Z')

describe('configuration export', () => {
  it('flags an incomplete build and lists what is missing', () => {
    const doc = buildConfigurationExport(DEFAULT_CONFIGURATION, { model: 'forgelab-road-bike', now })
    expect(doc.schema).toBe('forgelab.configuration/v1')
    expect(doc.complete).toBe(false)
    expect(doc.missing).toEqual(['size'])
    expect(doc.selections.size).toBeNull()
    expect(doc.exportedAt).toBe('2026-11-19T15:00:00.000Z')
  })

  it('exports a complete, valid build with a price breakdown that sums to the total', () => {
    const config = sanitizeConfiguration({ selections: { size: 'm', paint: 'custom' }, customPaint: { color: '#1F6FEB', finish: 'metallic' } })
    const doc = buildConfigurationExport(config, { model: 'forgelab-road-bike', now })
    expect(doc.complete).toBe(true)
    expect(doc.valid).toBe(true)
    expect(doc.paint).toEqual({ color: '#1F6FEB', finish: 'metallic', custom: true })
    expect(doc.pricing.lines.reduce((s, l) => s + l.price, 0)).toBe(doc.pricing.total)
    expect(doc.pricing.total).toBe(4210)
    expect(doc.pricing.notice).toMatch(/re-validated/)
  })

  it('marks incompatible builds invalid and includes the issues', () => {
    const config = sanitizeConfiguration({ selections: { size: 'm', handlebar: 'carbon-aero' } })
    const doc = buildConfigurationExport(config, { model: 'forgelab-road-bike', now })
    expect(doc.valid).toBe(false)
    expect(doc.compatibility.issues.some((i) => i.ruleId === 'bar-clamp')).toBe(true)
  })

  it('round-trips through JSON and back into a sanitized configuration', () => {
    const config = sanitizeConfiguration({ selections: { size: 'l', wheels: 'carbon-deep' } })
    const doc = JSON.parse(JSON.stringify(buildConfigurationExport(config, { model: 'x', now })))
    const restored = sanitizeConfiguration({
      selections: Object.fromEntries(Object.entries(doc.selections).map(([g, v]) => [g, v ? (v as { optionId: string }).optionId : null])),
      customPaint: config.customPaint,
    })
    expect(restored).toEqual(config)
  })

  it('names files by date', () => {
    expect(exportFileName(now)).toBe('forgelab-build-2026-11-19.json')
  })
})
