<script setup lang="ts">
import { GROUPS, GROUP_IDS } from '~/config/catalog'
import { formatPrice } from '~/utils/pricing'

const { getOption, paint } = useConfigurator()
const { goToGroup, canVisit, steps, currentStep, reset } = useConfiguratorSteps()
const { total, breakdown } = usePricing()

const rows = computed(() =>
  GROUP_IDS.map((group) => ({
    group,
    label: GROUPS[group].label,
    option: getOption(group),
    stepIndex: steps.findIndex((s) => s.groups.includes(group)),
  })),
)

function confirmReset() {
  if (window.confirm('Reset your build to the default configuration?')) reset()
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between">
      <h2 class="font-display text-sm font-semibold uppercase tracking-[0.14em] text-graphite">Your build</h2>
      <button type="button" class="text-xs font-medium text-graphite underline-offset-4 hover:text-ink hover:underline" @click="confirmReset">
        Reset
      </button>
    </div>

    <ul class="mt-4 divide-y divide-bone-300 border-y border-bone-300">
      <li v-for="row in rows" :key="row.group">
        <button
          type="button"
          class="group flex w-full items-center justify-between gap-4 py-3 text-left transition-colors disabled:cursor-default"
          :disabled="!canVisit(row.stepIndex)"
          @click="goToGroup(row.group)"
        >
          <div class="min-w-0">
            <p
              class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-colors"
              :class="currentStep.groups.includes(row.group) ? 'text-forge' : 'text-graphite-400'"
            >
              {{ row.label }}
            </p>
            <p class="mt-0.5 flex items-center gap-2 truncate text-[0.93rem] font-medium" :class="row.option ? '' : 'text-graphite-400'">
              <PaintSwatch v-if="row.group === 'paint' && paint" :color="paint.color" :finish="paint.finish" size="sm" />
              {{ row.option?.name ?? 'Not selected' }}
            </p>
          </div>
          <span class="tabular shrink-0 text-sm text-graphite group-hover:text-ink">
            {{ row.option ? (row.option.price === 0 ? 'Included' : formatPrice(row.option.price)) : '—' }}
          </span>
        </button>
      </li>
    </ul>

    <div class="mt-5 flex items-end justify-between">
      <div>
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
        <p class="text-xs text-graphite-400">
          {{ breakdown.missing.length ? `${breakdown.missing.length} selection pending` : 'Demo pricing · USD' }}
        </p>
      </div>
      <PriceDisplay :value="total" size="lg" />
    </div>
  </div>
</template>
