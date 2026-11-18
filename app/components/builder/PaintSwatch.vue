<script setup lang="ts">
import type { PaintFinish } from '~/types/configurator'

/** Visual paint chip: flat for matte, highlight for gloss, sheen for metallic, conic for "any colour". */
const props = withDefaults(
  defineProps<{ color: string; finish: PaintFinish; rainbow?: boolean; size?: 'sm' | 'md' }>(),
  { rainbow: false, size: 'md' },
)

const background = computed(() => {
  if (props.rainbow) {
    return 'conic-gradient(from 200deg, #E4572E, #F2C14E, #5FAD56, #4D9DE0, #7768AE, #E15554, #E4572E)'
  }
  if (props.finish === 'forged') {
    return 'repeating-radial-gradient(ellipse at 20% 30%, #2a2c30 0 2px, #c4c8ce 3px 5px, #6d7178 6px 7px)'
  }
  if (props.finish === 'matte') return props.color
  if (props.finish === 'metallic') {
    return `linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,.18) 70%, rgba(255,255,255,.25) 100%), ${props.color}`
  }
  return `radial-gradient(circle at 30% 25%, rgba(255,255,255,.55) 0 12%, rgba(255,255,255,0) 40%), ${props.color}`
})
</script>

<template>
  <span
    class="inline-block shrink-0 rounded-full ring-1 ring-black/10"
    :class="size === 'sm' ? 'h-3 w-3' : 'h-9 w-9'"
    :style="{ background }"
    aria-hidden="true"
  />
</template>
