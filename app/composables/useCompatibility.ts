import { GROUPS } from '~/config/catalog'
import type { GroupId, StepDefinition } from '~/types/configurator'
import {
  type CompatibilityFix,
  type CompatibilityIssue,
  conflictsFor,
  errorsOf,
  evaluateCompatibility,
  suggestFixes,
} from '~/utils/compatibility'
import { findOption } from '~/utils/configuration'

/** Reactive wrapper over the pure compatibility engine (`utils/compatibility.ts`). */
export function useCompatibility() {
  const { selections, select } = useConfigurator()

  const issues = computed(() => evaluateCompatibility(selections.value))
  const errors = computed(() => errorsOf(issues.value))
  const isValid = computed(() => errors.value.length === 0)

  function issuesFor(groups: GroupId[], severities: CompatibilityIssue['severity'][] = ['error', 'warning']) {
    return issues.value.filter((i) => severities.includes(i.severity) && i.groups.some((g) => groups.includes(g)))
  }

  function stepHasError(step: StepDefinition) {
    return errors.value.some((i) => i.groups.some((g) => step.groups.includes(g)))
  }

  /** Short card label, e.g. "Not compatible with your Aero Carbon frame". Null when compatible. */
  function conflictLabel(group: GroupId, optionId: string): string | null {
    if (selections.value[group] === optionId) return null
    const [conflict] = conflictsFor(selections.value, group, optionId)
    if (!conflict) return null
    const other = conflict.groups.find((g) => g !== group)
    const otherOption = other ? findOption(other, selections.value[other]) : undefined
    return otherOption ? `Not compatible with your ${otherOption.name} ${GROUPS[other!].label.toLowerCase()}` : conflict.title
  }

  const fixesFor = (issue: CompatibilityIssue): CompatibilityFix[] => suggestFixes(selections.value, issue)
  const applyFix = (fix: CompatibilityFix) => select(fix.group, fix.optionId)

  return { issues, errors, isValid, issuesFor, stepHasError, conflictLabel, fixesFor, applyFix }
}
