<script setup lang="ts">
import type { CatalogOption } from '~/types/configurator'
import { formatPrice } from '~/utils/pricing'

const props = defineProps<{
  option: CatalogOption
  selected: boolean
  compact?: boolean
  /** Set when choosing this option would create a compatibility error. */
  conflict?: string | null
}>()

defineEmits<{ select: [] }>()

const priceLabel = computed(() => (props.option.price === 0 ? 'Included' : formatPrice(props.option.price)))
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="selected"
    class="group relative flex w-full flex-col rounded-2xl border bg-white text-left transition-all duration-300 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-forge focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
    :class="[
      compact ? 'p-4' : 'p-5',
      selected
        ? 'border-ink shadow-[0_0_0_1px_theme(colors.ink.DEFAULT),0_12px_32px_-16px_rgba(14,15,17,0.35)]'
        : 'border-bone-300 hover:-translate-y-0.5 hover:border-graphite-300 hover:shadow-[0_12px_32px_-20px_rgba(14,15,17,0.35)]',
    ]"
    @click="$emit('select')"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <PaintSwatch v-if="option.paint" :color="option.paint.color" :finish="option.paint.finish" :rainbow="option.paint.custom" />
        <div class="min-w-0">
          <p class="font-display text-[1.05rem] font-semibold leading-tight tracking-tight">{{ option.name }}</p>
          <p class="mt-0.5 truncate text-sm text-graphite">{{ option.tagline }}</p>
        </div>
      </div>

      <span
        class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300"
        :class="selected ? 'border-ink bg-ink text-bone' : 'border-bone-300 text-transparent group-hover:border-graphite-300'"
        aria-hidden="true"
      >
        <svg viewBox="0 0 12 12" class="h-2.5 w-2.5">
          <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </div>

    <p v-if="conflict" class="mt-3 flex items-start gap-1.5 text-[0.75rem] font-medium leading-snug text-forge-600">
      <span class="mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full bg-forge" aria-hidden="true" />{{ conflict }}
    </p>

    <ul v-if="!compact && option.specs.length" class="mt-4 space-y-1 text-[0.8rem] text-graphite" :class="conflict ? 'opacity-60' : ''">
      <li v-for="spec in option.specs" :key="spec" class="flex items-center gap-2">
        <span class="h-px w-2.5 bg-graphite-300" aria-hidden="true" />{{ spec }}
      </li>
    </ul>

    <div v-if="!compact" class="mt-auto flex items-center justify-between gap-2 pt-4">
      <span
        v-if="option.badge"
        class="rounded-full bg-forge-100 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-forge-600"
      >
        {{ option.badge }}
      </span>
      <span v-else />
      <span class="tabular text-sm font-medium" :class="option.price === 0 ? 'text-graphite' : 'text-ink'">
        {{ priceLabel }}
      </span>
    </div>
  </button>
</template>
