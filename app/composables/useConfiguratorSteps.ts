import { STEPS } from '~/config/catalog'
import type { GroupId, StepDefinition } from '~/types/configurator'

/**
 * Guided-flow navigation: current step, completion states and required-selection validation.
 * A step is complete when all of its required groups have a selection.
 * Customers can't skip past an incomplete step.
 */
export function useConfiguratorSteps() {
  const { isGroupComplete, resetConfiguration } = useConfigurator()

  const stepIndex = useState<number>('forgelab-step', () => 0)
  /** Set when the customer tries to continue with missing selections; cleared on step change. */
  const showValidation = useState<boolean>('forgelab-validation', () => false)

  const steps: StepDefinition[] = STEPS
  const currentStep = computed<StepDefinition>(() => steps[stepIndex.value] ?? steps[0]!)
  const isFirst = computed(() => stepIndex.value === 0)
  const isLast = computed(() => stepIndex.value === steps.length - 1)

  function missingGroups(step: StepDefinition): GroupId[] {
    return step.groups.filter((g) => !isGroupComplete(g))
  }

  /** Review is complete when every other step is. */
  function isStepComplete(index: number): boolean {
    const step = steps[index]
    if (!step) return false
    if (step.id === 'review') return steps.every((s, i) => i === index || missingGroups(s).length === 0)
    return missingGroups(step).length === 0
  }

  const firstIncompleteIndex = computed(() => {
    const i = steps.findIndex((s, idx) => s.id !== 'review' && !isStepComplete(idx))
    return i === -1 ? steps.length - 1 : i
  })

  const currentMissing = computed(() => missingGroups(currentStep.value))
  const canProceed = computed(() => currentMissing.value.length === 0)

  /** Steps up to and including the first incomplete one are reachable. */
  function canVisit(index: number): boolean {
    return index >= 0 && index < steps.length && index <= firstIncompleteIndex.value
  }

  function goTo(index: number) {
    if (!canVisit(index) || index === stepIndex.value) return
    stepIndex.value = index
    showValidation.value = false
  }

  function goToGroup(group: GroupId) {
    goTo(steps.findIndex((s) => s.groups.includes(group)))
  }

  function next() {
    if (!canProceed.value) {
      showValidation.value = true
      return
    }
    goTo(stepIndex.value + 1)
  }

  function prev() {
    goTo(stepIndex.value - 1)
  }

  function reset() {
    resetConfiguration()
    stepIndex.value = 0
    showValidation.value = false
  }

  return {
    steps,
    stepIndex: readonly(stepIndex),
    currentStep,
    currentMissing,
    showValidation: readonly(showValidation),
    isFirst,
    isLast,
    canProceed,
    isStepComplete,
    canVisit,
    goTo,
    goToGroup,
    next,
    prev,
    reset,
  }
}
