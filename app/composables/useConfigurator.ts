import { CATALOG, GROUPS } from '~/config/catalog'
import type { CatalogOption, Configuration, GroupId, PaintSpec } from '~/types/configurator'
import { cloneDefaultConfiguration, findOption, resolvePaint } from '~/utils/configuration'

export const CONFIG_STATE_KEY = 'forgelab-configuration'

/**
 * Configuration state: what the customer has selected.
 * Shared via `useState` (SSR-safe). Persisted to a cookie by `plugins/configuration-persistence.ts`.
 * Step navigation → `useConfiguratorSteps`; prices → `usePricing`.
 */
export function useConfigurator() {
  const configuration = useState<Configuration>(CONFIG_STATE_KEY, cloneDefaultConfiguration)

  const selections = computed(() => configuration.value.selections)
  const customPaint = computed(() => configuration.value.customPaint)
  const paint = computed<PaintSpec | undefined>(() => resolvePaint(configuration.value))

  function getOption(group: GroupId): CatalogOption | undefined {
    return findOption(group, configuration.value.selections[group])
  }

  function isGroupComplete(group: GroupId): boolean {
    return !GROUPS[group].required || getOption(group) !== undefined
  }

  function select(group: GroupId, optionId: string) {
    if (!CATALOG[group].some((o) => o.id === optionId)) return
    configuration.value = {
      ...configuration.value,
      selections: { ...configuration.value.selections, [group]: optionId },
    }
  }

  function setCustomPaint(patch: Partial<PaintSpec>) {
    configuration.value = {
      ...configuration.value,
      customPaint: { ...configuration.value.customPaint, ...patch },
    }
  }

  function setUniqueCover(id: string | null) {
    configuration.value = { ...configuration.value, uniqueCover: id }
  }

  function resetConfiguration() {
    configuration.value = cloneDefaultConfiguration()
  }

  return {
    configuration: readonly(configuration),
    selections,
    customPaint,
    paint,
    getOption,
    isGroupComplete,
    select,
    setCustomPaint,
    setUniqueCover,
    resetConfiguration,
  }
}
