import { CATALOG, CURRENCY, DEFAULT_SELECTIONS, LOCALE, STEPS } from '~/data/catalog'
import type { CatalogOption, CategoryId, Selections, StepDefinition } from '~/types/configurator'

const CATEGORY_IDS = Object.keys(CATALOG) as CategoryId[]

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

/** "+€450", "Included" — for option deltas. */
export function formatDelta(value: number): string {
  if (value === 0) return 'Included'
  return `${value > 0 ? '+' : '−'}${priceFormatter.format(Math.abs(value))}`
}

export function isCategory(id: string): id is CategoryId {
  return (CATEGORY_IDS as string[]).includes(id)
}

/**
 * Single source of truth for the configurator.
 * Uses `useState` so state is SSR-safe and shared across components.
 */
export function useConfigurator() {
  const stepIndex = useState<number>('cfg-step', () => 0)
  const selections = useState<Selections>('cfg-selections', () => ({ ...DEFAULT_SELECTIONS }))

  const steps: StepDefinition[] = STEPS
  const currentStep = computed<StepDefinition>(() => steps[stepIndex.value] ?? steps[0]!)
  const isFirst = computed(() => stepIndex.value === 0)
  const isLast = computed(() => stepIndex.value === steps.length - 1)

  const currentOptions = computed<CatalogOption[]>(() => {
    const id = currentStep.value.id
    return isCategory(id) ? CATALOG[id] : []
  })

  function getOption(category: CategoryId, id = selections.value[category]): CatalogOption | undefined {
    return CATALOG[category].find((o) => o.id === id)
  }

  /** Resolved selected option for each category. */
  const selectedOptions = computed(() =>
    CATEGORY_IDS.map((category) => ({
      category,
      label: steps.find((s) => s.id === category)?.label ?? category,
      option: getOption(category),
    })),
  )

  const totalPrice = computed(() =>
    selectedOptions.value.reduce((sum, { option }) => sum + (option?.price ?? 0), 0),
  )

  const isComplete = computed(() => selectedOptions.value.every(({ option }) => option !== undefined))

  function select(category: CategoryId, optionId: string) {
    if (!CATALOG[category].some((o) => o.id === optionId)) return
    selections.value = { ...selections.value, [category]: optionId }
  }

  function goTo(index: number) {
    stepIndex.value = Math.min(Math.max(index, 0), steps.length - 1)
  }
  const next = () => goTo(stepIndex.value + 1)
  const prev = () => goTo(stepIndex.value - 1)

  function reset() {
    selections.value = { ...DEFAULT_SELECTIONS }
    stepIndex.value = 0
  }

  return {
    steps,
    stepIndex: readonly(stepIndex),
    currentStep,
    currentOptions,
    selections: readonly(selections),
    selectedOptions,
    totalPrice,
    isFirst,
    isLast,
    isComplete,
    getOption,
    select,
    goTo,
    next,
    prev,
    reset,
  }
}
