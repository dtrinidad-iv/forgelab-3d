import { CATALOG, GROUP_IDS } from '~/config/catalog'
import { COMPATIBILITY_RULES, type CompatibilityRule, type ResolvedOptions, type Severity } from '~/config/compatibility'
import type { GroupId, Selections } from '~/types/configurator'
import { findOption } from '~/utils/configuration'

/** Pure compatibility engine — no Vue. */

export interface CompatibilityIssue {
  ruleId: string
  severity: Severity
  title: string
  groups: GroupId[]
  message: string
}

export interface CompatibilityFix {
  group: GroupId
  optionId: string
  name: string
  /** Price change if applied (USD). */
  priceDelta: number
}

function resolve(selections: Selections): ResolvedOptions {
  const out: ResolvedOptions = {}
  for (const g of GROUP_IDS) {
    const option = findOption(g, selections[g])
    if (option) out[g] = option
  }
  return out
}

export function evaluateCompatibility(selections: Selections, rules: CompatibilityRule[] = COMPATIBILITY_RULES): CompatibilityIssue[] {
  const options = resolve(selections)
  return rules.flatMap((rule) => {
    const message = rule.check(options)
    return message ? [{ ruleId: rule.id, severity: rule.severity, title: rule.title, groups: rule.groups, message }] : []
  })
}

export const errorsOf = (issues: CompatibilityIssue[]) => issues.filter((i) => i.severity === 'error')

/**
 * Errors that selecting `optionId` in `group` WOULD cause, given the rest of the build.
 * Used to flag option cards before the customer picks them.
 */
export function conflictsFor(selections: Selections, group: GroupId, optionId: string, rules = COMPATIBILITY_RULES): CompatibilityIssue[] {
  return errorsOf(evaluateCompatibility({ ...selections, [group]: optionId }, rules)).filter((i) => i.groups.includes(group))
}

/**
 * For an issue, the cheapest-to-switch option in each related group that resolves it
 * without introducing any new error.
 */
export function suggestFixes(selections: Selections, issue: CompatibilityIssue, rules = COMPATIBILITY_RULES): CompatibilityFix[] {
  const baseline = errorsOf(evaluateCompatibility(selections, rules))
  const currentPrice = (g: GroupId) => findOption(g, selections[g])?.price ?? 0

  return issue.groups.flatMap((group) => {
    const candidates = CATALOG[group]
      .filter((o) => o.id !== selections[group])
      .filter((o) => {
        const after = errorsOf(evaluateCompatibility({ ...selections, [group]: o.id }, rules))
        const resolved = !after.some((i) => i.ruleId === issue.ruleId)
        const introducesNew = after.some((i) => !baseline.some((b) => b.ruleId === i.ruleId))
        return resolved && !introducesNew
      })
      .map((o) => ({ group, optionId: o.id, name: o.name, priceDelta: o.price - currentPrice(group) }))
      .sort((a, b) => Math.abs(a.priceDelta) - Math.abs(b.priceDelta))
    return candidates.slice(0, 1)
  })
}
