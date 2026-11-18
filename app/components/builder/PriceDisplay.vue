<script setup lang="ts">
import { formatMoney } from '~/utils/money'

/** `value` is already in the display currency (see usePricing().displayTotal); tweened when it changes. */
const props = withDefaults(defineProps<{ value: number; size?: 'sm' | 'lg' }>(), { size: 'sm' })
const { currency } = useCurrency()

// Smoothly tween the displayed number toward the target value.
const target = computed(() => props.value)
const displayed = ref(target.value)
let raf = 0

watch(
  target,
  (to) => {
    if (!import.meta.client) {
      displayed.value = to
      return
    }
    cancelAnimationFrame(raf)
    const from = displayed.value
    const start = performance.now()
    const duration = 450
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      displayed.value = t < 1 ? Math.round(from + (to - from) * eased) : to
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
)

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span
    class="tabular font-display font-semibold tracking-tight"
    :class="size === 'lg' ? 'text-3xl md:text-4xl' : 'text-lg'"
    aria-live="polite"
  >
    {{ formatMoney(displayed, currency) }}
  </span>
</template>
