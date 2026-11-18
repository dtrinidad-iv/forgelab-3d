import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from '~/config/catalog'
import { resolvePaint, sanitizeConfiguration } from '~/utils/configuration'

describe('sanitizeConfiguration', () => {
  it('returns defaults for garbage input', () => {
    for (const input of [null, undefined, 42, 'x', [], {}]) {
      expect(sanitizeConfiguration(input)).toEqual(DEFAULT_CONFIGURATION)
    }
  })

  it('keeps valid ids, replaces unknown ones with defaults, keeps explicit nulls', () => {
    const result = sanitizeConfiguration({
      selections: { frame: 'steel', wheels: 'gold-plated', size: 'l', paint: null },
      customPaint: {},
    })
    expect(result.selections.frame).toBe('steel')
    expect(result.selections.wheels).toBe(DEFAULT_CONFIGURATION.selections.wheels)
    expect(result.selections.size).toBe('l')
    expect(result.selections.paint).toBeNull()
  })

  it('rejects malformed custom paint', () => {
    const result = sanitizeConfiguration({ selections: {}, customPaint: { color: 'red; drop table', finish: 'chrome' } })
    expect(result.customPaint).toEqual(DEFAULT_CONFIGURATION.customPaint)
    expect(sanitizeConfiguration({ customPaint: { color: '#1f6feb', finish: 'metallic' } }).customPaint).toEqual({ color: '#1f6feb', finish: 'metallic' })
  })

  it('does not mutate the defaults', () => {
    const a = sanitizeConfiguration(null)
    a.selections.frame = 'steel'
    expect(DEFAULT_CONFIGURATION.selections.frame).toBe('aero-carbon')
  })
})

describe('resolvePaint', () => {
  it('uses the preset for preset paints and the customer colour for custom', () => {
    const preset = sanitizeConfiguration({ selections: { paint: 'racing-red' } })
    expect(resolvePaint(preset)).toEqual({ color: '#C8102E', finish: 'gloss' })

    const custom = sanitizeConfiguration({ selections: { paint: 'custom' }, customPaint: { color: '#1F6FEB', finish: 'matte' } })
    expect(resolvePaint(custom)).toEqual({ color: '#1F6FEB', finish: 'matte' })
  })
})
