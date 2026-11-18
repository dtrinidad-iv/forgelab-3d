<script setup lang="ts">
import type { GroupId } from '~/types/configurator'

/**
 * Tells the customer whether a group's selection is reflected in the 3D model,
 * based on what the viewer actually did (never on what we hope it did).
 */
const props = defineProps<{ group: GroupId }>()
const { statuses } = useVisualStatus()

const status = computed(() => statuses.value[props.group])

const view = computed(() => {
  const s = status.value
  if (!s) return null
  switch (s.state) {
    case 'loading':
      return { tone: 'muted', icon: 'spin', text: 'Loading 3D part…' }
    case 'applied':
      if (s.kind === 'component') return { tone: 'ok', icon: 'cube', text: `Shown in 3D · ${s.message ?? 'real part swap'}` }
      if (s.kind === 'paint') return { tone: 'ok', icon: 'cube', text: s.message ?? 'Shown in 3D' }
      return { tone: 'ok', icon: 'cube', text: 'Shown in 3D' }
    case 'unsupported':
      return { tone: 'muted', icon: 'info', text: s.message ?? 'Not shown in 3D' }
    default:
      return { tone: 'warn', icon: 'info', text: `3D preview unavailable — ${s.message ?? 'unknown error'}` }
  }
})
</script>

<template>
  <p
    v-if="view"
    class="flex items-start gap-2 text-[0.8rem] leading-snug"
    :class="{ 'text-graphite': view.tone === 'muted', 'text-ink': view.tone === 'ok', 'text-forge-600': view.tone === 'warn' }"
  >
    <span v-if="view.icon === 'spin'" class="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border border-graphite-300 border-t-ink" aria-hidden="true" />
    <svg v-else-if="view.icon === 'cube'" viewBox="0 0 16 16" class="mt-px h-4 w-4 shrink-0 text-forge" aria-hidden="true">
      <path d="M8 1.8l5.4 3.1v6.2L8 14.2l-5.4-3.1V4.9L8 1.8zM2.8 5L8 8l5.2-3M8 8v6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
    </svg>
    <svg v-else viewBox="0 0 16 16" class="mt-px h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.3" />
      <path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <span>{{ view.text }}</span>
  </p>
</template>
