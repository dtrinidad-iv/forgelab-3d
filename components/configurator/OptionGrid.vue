<script setup lang="ts">
import { isCategory } from '~/composables/useConfigurator'

const { currentStep, currentOptions, selections, select } = useConfigurator()

const category = computed(() => (isCategory(currentStep.value.id) ? currentStep.value.id : null))
const isSize = computed(() => category.value === 'size')
</script>

<template>
  <div
    v-if="category"
    role="radiogroup"
    :aria-label="currentStep.title"
    class="grid gap-3"
    :class="isSize ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3'"
  >
    <OptionCard
      v-for="option in currentOptions"
      :key="option.id"
      :option="option"
      :selected="selections[category] === option.id"
      :absolute-price="category === 'frame'"
      :compact="isSize"
      @select="select(category, option.id)"
    />
  </div>
</template>
