<script setup lang="ts">
import { GROUPS, GROUP_IDS } from '~/config/catalog'
import { formatPrice } from '~/utils/pricing'

const { getOption, paint } = useConfigurator()
const { goToGroup } = useConfiguratorSteps()
const { total, breakdown } = usePricing()

const rows = computed(() => GROUP_IDS.map((group) => ({ group, label: GROUPS[group].label, option: getOption(group) })))
const frameWeight = computed(() => getOption('frame')?.weightGrams)
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_auto]">
    <dl class="divide-y divide-bone-300 rounded-2xl border border-bone-300 bg-white">
      <div
        v-for="row in rows"
        :key="row.group"
        class="grid grid-cols-[6rem_1fr_auto] items-start gap-4 px-5 py-4 sm:grid-cols-[8rem_1fr_auto]"
      >
        <dt class="pt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">{{ row.label }}</dt>
        <dd class="min-w-0">
          <p class="flex items-center gap-2 font-medium" :class="row.option ? '' : 'text-forge-600'">
            <PaintSwatch v-if="row.group === 'paint' && paint" :color="paint.color" :finish="paint.finish" size="sm" />
            {{ row.option?.name ?? 'Not selected' }}
          </p>
          <p v-if="row.group === 'paint' && row.option?.paint?.custom && paint" class="tabular mt-0.5 text-sm text-graphite">
            {{ paint.color }} · {{ paint.finish }}
          </p>
          <p v-else-if="row.option" class="mt-0.5 text-sm text-graphite">{{ row.option.specs.join(' · ') }}</p>
          <button
            type="button"
            class="mt-1.5 text-xs font-medium text-forge-600 underline-offset-4 hover:underline"
            @click="goToGroup(row.group)"
          >
            {{ row.option ? 'Change' : 'Select' }}
          </button>
        </dd>
        <dd class="tabular text-sm">
          {{ row.option ? (row.option.price === 0 ? 'Included' : formatPrice(row.option.price)) : '—' }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-col gap-4 rounded-2xl bg-ink p-6 text-bone lg:sticky lg:top-36 lg:w-72 lg:self-start">
      <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-300">Build total</p>
      <PriceDisplay :value="total" size="lg" />
      <p v-if="frameWeight" class="text-sm text-graphite-300">Frameset {{ frameWeight.toLocaleString('en-US') }} g</p>
      <p v-if="breakdown.missing.length" class="text-sm text-forge">
        {{ breakdown.missing.length }} required selection{{ breakdown.missing.length > 1 ? 's' : '' }} missing
      </p>
      <p class="mt-2 text-xs leading-relaxed text-graphite-300">
        Demonstration pricing in USD. Final pricing is confirmed at checkout.
      </p>
    </div>
  </div>
</template>
