<script setup lang="ts">
import type { PaintFinish } from '~/types/configurator'

const { customPaint, setCustomPaint } = useConfigurator()

const FINISHES: { id: PaintFinish; label: string }[] = [
  { id: 'matte', label: 'Matte' },
  { id: 'gloss', label: 'Gloss' },
  { id: 'metallic', label: 'Metallic' },
]

const hexDraft = ref(customPaint.value.color)
watch(
  () => customPaint.value.color,
  (c) => (hexDraft.value = c),
)

function commitHex() {
  const v = hexDraft.value.trim()
  const normalized = v.startsWith('#') ? v : `#${v}`
  if (/^#[0-9a-f]{6}$/i.test(normalized)) setCustomPaint({ color: normalized.toUpperCase() })
  else hexDraft.value = customPaint.value.color
}
</script>

<template>
  <div class="rounded-2xl border border-bone-300 bg-white p-5">
    <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Your custom colour</p>

    <div class="mt-4 flex flex-wrap items-center gap-4">
      <label class="relative h-12 w-12 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10" :style="{ background: customPaint.color }">
        <span class="sr-only">Pick a colour</span>
        <input
          type="color"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          :value="customPaint.color"
          @input="setCustomPaint({ color: ($event.target as HTMLInputElement).value.toUpperCase() })"
        />
      </label>

      <label class="flex items-center gap-2 rounded-full border border-bone-300 px-3 py-2 focus-within:border-ink">
        <span class="text-xs font-medium text-graphite">HEX</span>
        <input
          v-model="hexDraft"
          class="tabular w-20 bg-transparent text-sm uppercase outline-none"
          maxlength="7"
          spellcheck="false"
          aria-label="Hex colour"
          @change="commitHex"
          @keydown.enter="commitHex"
        />
      </label>

      <div role="radiogroup" aria-label="Finish" class="flex rounded-full bg-bone-200 p-1">
        <button
          v-for="f in FINISHES"
          :key="f.id"
          type="button"
          role="radio"
          :aria-checked="customPaint.finish === f.id"
          class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300"
          :class="customPaint.finish === f.id ? 'bg-ink text-bone' : 'text-graphite hover:text-ink'"
          @click="setCustomPaint({ finish: f.id })"
        >
          {{ f.label }}
        </button>
      </div>
    </div>
  </div>
</template>
