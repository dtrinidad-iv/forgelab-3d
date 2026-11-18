<script setup lang="ts">
withDefaults(defineProps<{ inverted?: boolean }>(), { inverted: false })
</script>

<template>
  <span class="inline-flex items-center gap-2.5 select-none" aria-label="ForgeLab">
    <!-- Mark: an anvil-like chevron forming an "F" — original ForgeLab mark -->
    <svg viewBox="0 0 32 32" class="h-7 w-7" aria-hidden="true">
      <rect width="32" height="32" rx="7" :class="inverted ? 'fill-bone' : 'fill-ink'" />
      <path d="M9 23V9h14l-3 4h-7v2.5h6l-2.6 3.5H13V23z" :class="inverted ? 'fill-ink' : 'fill-bone'" />
      <circle cx="23" cy="22" r="2.2" class="fill-forge" />
    </svg>
    <span
      class="font-display text-[1.15rem] font-semibold tracking-tightest leading-none"
      :class="inverted ? 'text-bone' : 'text-ink'"
    >
      Forge<span class="font-normal opacity-60">Lab</span>
    </span>
  </span>
</template>
