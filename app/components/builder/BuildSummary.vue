<script setup lang="ts">
import { GROUPS, GROUP_IDS } from '~/config/catalog'

const { format: formatPrice } = useCurrency()
const { selected: coverPiece } = usePieces()
const { getOption, paint } = useConfigurator()
const { goToGroup, canVisit, steps, currentStep, reset } = useConfiguratorSteps()
const { displayTotal, breakdown } = usePricing()
const { errors } = useCompatibility()

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
      <li v-if="coverPiece">
        <button type="button" class="group flex w-full items-center justify-between gap-4 py-3 text-left" @click="goToGroup('saddle')">
          <div class="min-w-0">
            <p class="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Unique cover</p>
            <p class="mt-0.5 truncate text-[0.93rem] font-medium">{{ coverPiece.name }}</p>
          </div>
          <span class="tabular shrink-0 text-sm text-graphite group-hover:text-ink">{{ formatPrice(coverPiece.price) }}</span>
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
      <PriceDisplay :value="displayTotal" size="lg" />
    </div>

    <button
      v-if="errors.length"
      type="button"
      class="mt-4 flex w-full items-center gap-2 rounded-xl bg-forge-100 px-3.5 py-2.5 text-left text-sm font-medium text-forge-600 transition-colors hover:bg-forge-100/70"
      @click="goToGroup(errors[0]!.groups[errors[0]!.groups.length - 1]!)"
    >
      <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forge text-[0.7rem] font-bold text-white" aria-hidden="true">!</span>
      {{ errors.length }} compatibility issue{{ errors.length > 1 ? 's' : '' }} to resolve
    </button>
  </div>
</template>
