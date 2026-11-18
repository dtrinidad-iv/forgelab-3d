<script setup lang="ts">
import { formatDelta, formatPrice } from '~/composables/useConfigurator'

const { selectedOptions, totalPrice, steps, goTo, getOption } = useConfigurator()

const frameWeight = computed(() => getOption('frame')?.weightGrams)
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_auto]">
    <dl class="divide-y divide-bone-300 rounded-2xl border border-bone-300 bg-white">
      <div
        v-for="row in selectedOptions"
        :key="row.category"
        class="grid grid-cols-[6.5rem_1fr_auto] items-start gap-4 px-5 py-4 sm:grid-cols-[8rem_1fr_auto]"
      >
        <dt class="pt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">{{ row.label }}</dt>
        <dd class="min-w-0">
          <p class="font-medium">{{ row.option?.name }}</p>
          <p class="mt-0.5 text-sm text-graphite">{{ row.option?.specs.join(' · ') }}</p>
          <button
            type="button"
            class="mt-1.5 text-xs font-medium text-forge-600 underline-offset-4 hover:underline"
            @click="goTo(steps.findIndex((s) => s.id === row.category))"
          >
            Change
          </button>
        </dd>
        <dd class="tabular text-sm">
          {{ row.option ? (row.category === 'frame' ? formatPrice(row.option.price) : formatDelta(row.option.price)) : '' }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-col gap-4 rounded-2xl bg-ink p-6 text-bone lg:sticky lg:top-36 lg:w-72 lg:self-start">
      <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-300">Build total</p>
      <PriceDisplay :value="totalPrice" size="lg" />
      <p v-if="frameWeight" class="text-sm text-graphite-300">Frameset {{ frameWeight }} g</p>
      <p class="mt-2 text-xs leading-relaxed text-graphite-300">
        Every ForgeLab is assembled, torqued and road-tested by one mechanic before it leaves the studio.
      </p>
    </div>
  </div>
</template>
