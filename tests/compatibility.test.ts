import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from '~/config/catalog'
import type { Selections } from '~/types/configurator'
import { conflictsFor, errorsOf, evaluateCompatibility, suggestFixes } from '~/utils/compatibility'

const base: Selections = { ...DEFAULT_CONFIGURATION.selections, size: 'm' }
const ids = (s: Selections) => errorsOf(evaluateCompatibility(s)).map((i) => i.ruleId)

describe('compatibility engine (fictional demo rules)', () => {
  it('the default build has no errors, only the auto-matched bottom bracket note', () => {
    const issues = evaluateCompatibility(base)
    expect(errorsOf(issues)).toEqual([])
    expect(issues.map((i) => `${i.severity}:${i.ruleId}`)).toEqual(['info:bottom-bracket'])
    expect(issues[0]!.message).toMatch(/Press-fit/)
  })

  it('frame ↔ wheels: tyre clearance', () => {
    expect(ids({ ...base, wheels: 'alloy' })).toContain('tyre-clearance') // 32 mm tyres > 30 mm aero clearance
    expect(ids({ ...base, wheels: 'alloy', frame: 'endurance-carbon', groupset: 'sram-demo' })).toEqual([])
  })

  it('groupset ↔ wheels: freehub speeds', () => {
    expect(ids({ ...base, frame: 'steel', wheels: 'alloy', groupset: 'campagnolo-demo' })).toEqual(['freehub-speeds'])
    expect(ids({ ...base, groupset: 'campagnolo-demo' })).toEqual([]) // carbon wheels take 13-speed
  })

  it('handlebar ↔ stem: clamp section', () => {
    expect(ids({ ...base, handlebar: 'carbon-aero' })).toEqual(['bar-clamp'])
    expect(ids({ ...base, handlebar: 'carbon-aero', stem: 'carbon-stem' })).toEqual([])
  })

  it('frame ↔ saddle: advisory warning only', () => {
    const issues = evaluateCompatibility({ ...base, saddle: 'saddle-comfort' })
    expect(issues.find((i) => i.ruleId === 'saddle-position')?.severity).toBe('warning')
    expect(errorsOf(issues)).toEqual([])
    expect(evaluateCompatibility({ ...base, frame: 'endurance-carbon', saddle: 'saddle-comfort' }).some((i) => i.ruleId === 'saddle-position')).toBe(false)
  })

  it('ignores rules whose groups are not selected yet', () => {
    expect(evaluateCompatibility({ ...base, frame: null, groupset: null })).toEqual([])
  })

  it('previews conflicts for an option before it is chosen', () => {
    expect(conflictsFor(base, 'wheels', 'alloy').map((i) => i.ruleId)).toEqual(['tyre-clearance'])
    expect(conflictsFor(base, 'wheels', 'carbon-deep')).toEqual([])
    expect(conflictsFor(base, 'handlebar', 'carbon-aero')[0]!.message).toMatch(/Alloy stem/)
  })

  it('suggests the smallest-price fix per related group without creating new errors', () => {
    const sel: Selections = { ...base, handlebar: 'carbon-aero' }
    const [issue] = errorsOf(evaluateCompatibility(sel))
    const fixes = suggestFixes(sel, issue!)
    expect(fixes).toEqual([
      { group: 'handlebar', optionId: 'carbon-ergo', name: 'Carbon Ergo', priceDelta: -80 },
      { group: 'stem', optionId: 'carbon-stem', name: 'Carbon', priceDelta: 80 },
    ])
    for (const fix of fixes) expect(ids({ ...sel, [fix.group]: fix.optionId })).toEqual([])
  })

  it('never suggests a fix that trades one error for another', () => {
    // Steel + Campagnolo-demo + Alloy: switching frame to Aero would fix nothing and add tyre-clearance.
    const sel: Selections = { ...base, frame: 'steel', wheels: 'alloy', groupset: 'campagnolo-demo' }
    const [issue] = errorsOf(evaluateCompatibility(sel))
    for (const fix of suggestFixes(sel, issue!)) {
      expect(ids({ ...sel, [fix.group]: fix.optionId })).toEqual([])
    }
  })
})
