<script setup lang="ts">
import { formatDelta, formatPrice } from '~/composables/useConfigurator'

const { selectedOptions, totalPrice, steps, goTo, stepIndex } = useConfigurator()

function stepIndexOf(category: string) {
  return steps.findIndex((s) => s.id === category)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-baseline justify-between">
      <h2 class="font-display text-sm font-semibold uppercase tracking-[0.14em] text-graphite">Your build</h2>
      <span class="text-xs text-graphite-400">Hand-assembled · Ships in 4–6 wks</span>
    </div>

    <ul class="mt-5 divide-y divide-bone-300 border-y border-bone-300">
      <li v-for="row in selectedOptions" :key="row.category">
        <button
          type="button"
          class="group flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors"
          @click="goTo(stepIndexOf(row.category))"
        >
          <div class="min-w-0">
            <p
              class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] transition-colors"
              :class="stepIndexOf(row.category) === stepIndex ? 'text-forge' : 'text-graphite-400'"
            >
              {{ row.label }}
            </p>
            <p class="mt-0.5 flex items-center gap-2 truncate text-[0.95rem] font-medium">
              <span
                v-if="row.option?.swatch"
                class="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                :style="{ background: row.option.swatch[0] }"
              />
              {{ row.option?.name ?? '—' }}
            </p>
          </div>
          <span class="tabular shrink-0 text-sm text-graphite group-hover:text-ink">
            {{
              row.option
                ? row.category === 'frame'
                  ? formatPrice(row.option.price)
                  : formatDelta(row.option.price)
                : ''
            }}
          </span>
        </button>
      </li>
    </ul>

    <div class="mt-6 flex items-end justify-between">
      <div>
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
        <p class="text-xs text-graphite-400">Incl. VAT</p>
      </div>
      <PriceDisplay :value="totalPrice" size="lg" />
    </div>
  </div>
</template>
