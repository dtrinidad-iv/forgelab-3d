<script setup lang="ts">
/** One-of-a-kind saddle covers: each photo IS the piece the buyer receives (mapped onto the 3D saddle). */
const { pieces, selected, imageUrl, select } = usePieces()
const { format } = useCurrency()
</script>

<template>
  <section aria-labelledby="unique-cover-title" class="border-t border-bone-300 pt-6 lg:mt-2">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="unique-cover-title" class="font-display text-lg font-semibold tracking-tight">One-of-a-kind cover</h2>
      <span class="text-xs text-graphite">Optional</span>
    </div>
    <p class="mt-1 flex items-start gap-2 text-[0.8rem] leading-snug text-ink">
      <svg viewBox="0 0 16 16" class="mt-px h-4 w-4 shrink-0 text-forge" aria-hidden="true">
        <path d="M8 1.8l5.4 3.1v6.2L8 14.2l-5.4-3.1V4.9L8 1.8zM2.8 5L8 8l5.2-3M8 8v6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
      </svg>
      Each cover is cut from a single hide. The photo is the exact piece you'll receive — shown on the 3D saddle.
    </p>

    <div role="radiogroup" aria-label="One-of-a-kind cover" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
      <button
        type="button"
        role="radio"
        :aria-checked="!selected"
        class="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition-colors"
        :class="!selected ? 'border-ink shadow-[0_0_0_1px_theme(colors.ink.DEFAULT)]' : 'border-bone-300 hover:border-graphite-300'"
        @click="select(null)"
      >
        <span>
          <span class="block font-display font-semibold">Standard cover</span>
          <span class="text-sm text-graphite">Matches the saddle you chose</span>
        </span>
        <span class="text-sm text-graphite">Included</span>
      </button>

      <button
        v-for="p in pieces"
        :key="p.id"
        type="button"
        role="radio"
        :aria-checked="selected?.id === p.id"
        :disabled="p.sold && selected?.id !== p.id"
        class="group flex gap-3 rounded-2xl border bg-white p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
        :class="selected?.id === p.id ? 'border-ink shadow-[0_0_0_1px_theme(colors.ink.DEFAULT)]' : 'border-bone-300 hover:border-graphite-300'"
        @click="select(p.id)"
      >
        <img :src="imageUrl(p.id)" :alt="`Photo of ${p.name}`" loading="lazy" class="h-20 w-24 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
        <span class="min-w-0 flex-1">
          <span class="flex items-start justify-between gap-2">
            <span class="font-display font-semibold leading-tight">{{ p.name }}</span>
            <span class="tabular shrink-0 text-sm">{{ format(p.price) }}</span>
          </span>
          <span class="mt-0.5 line-clamp-2 block text-xs text-graphite">{{ p.story }}</span>
          <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider" :class="p.sold ? 'bg-bone-200 text-graphite' : 'bg-forge-100 text-forge-600'">
            {{ p.sold ? 'Sold' : 'Only one' }}
          </span>
        </span>
      </button>
    </div>
    <p v-if="!pieces.length" class="mt-3 text-sm text-graphite">No one-of-a-kind covers are in the studio right now.</p>
  </section>
</template>
