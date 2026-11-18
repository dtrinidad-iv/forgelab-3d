<script setup lang="ts">
import { CATALOG, GROUPS } from '~/config/catalog'
import type { GroupId } from '~/types/configurator'

const props = withDefaults(defineProps<{ group: GroupId; collapsible?: boolean; defaultOpen?: boolean }>(), {
  collapsible: false,
  defaultOpen: true,
})

const { selections, getOption, select, isGroupComplete } = useConfigurator()
const { showValidation } = useConfiguratorSteps()

const definition = computed(() => GROUPS[props.group])
const options = computed(() => CATALOG[props.group])
const selected = computed(() => getOption(props.group))
const invalid = computed(() => showValidation.value && !isGroupComplete(props.group))
const isSize = computed(() => props.group === 'size')
const showCustomPaint = computed(() => props.group === 'paint' && selected.value?.paint?.custom)

const open = ref(!props.collapsible || props.defaultOpen)
// Missing required selections always reveal themselves.
watch(invalid, (v) => v && (open.value = true))

const panelId = `group-${props.group}`
</script>

<template>
  <section :aria-labelledby="`${panelId}-label`" :class="collapsible ? 'border-b border-bone-300 last:border-b-0' : ''">
    <component
      :is="collapsible ? 'button' : 'div'"
      :type="collapsible ? 'button' : undefined"
      class="flex w-full items-center justify-between gap-4 text-left"
      :class="collapsible ? 'py-4 lg:pointer-events-none lg:pb-4 lg:pt-6' : 'sr-only'"
      :aria-expanded="collapsible ? open : undefined"
      :aria-controls="collapsible ? panelId : undefined"
      @click="collapsible && (open = !open)"
    >
      <div class="min-w-0">
        <h2 :id="`${panelId}-label`" class="font-display text-lg font-semibold tracking-tight">{{ definition.label }}</h2>
        <p v-if="collapsible" class="mt-0.5 truncate text-sm lg:hidden" :class="invalid ? 'text-forge-600' : 'text-graphite'">
          {{ selected?.name ?? 'Not selected' }}
        </p>
      </div>
      <span
        v-if="collapsible"
        class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-bone-300 text-graphite transition-transform duration-300 lg:hidden"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        <svg viewBox="0 0 12 12" class="h-3 w-3"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </span>
    </component>

    <div v-show="open" :id="panelId" :class="collapsible ? 'pb-6 lg:!block' : ''">
      <VisualBadge :group="group" class="mb-3" />
      <p v-if="invalid" class="mb-3 flex items-center gap-2 text-sm font-medium text-forge-600" role="alert">
        <span class="h-1.5 w-1.5 rounded-full bg-forge" aria-hidden="true" />
        Please select a {{ definition.label.toLowerCase() }} to continue.
      </p>

      <div
        role="radiogroup"
        :aria-label="definition.label"
        :aria-required="definition.required"
        class="grid gap-3"
        :class="[
          isSize ? 'grid-cols-3 sm:grid-cols-5' : 'sm:grid-cols-2 xl:grid-cols-3',
          invalid ? 'rounded-2xl outline outline-1 outline-offset-4 outline-forge/50' : '',
        ]"
      >
        <OptionCard
          v-for="option in options"
          :key="option.id"
          :option="option"
          :selected="selections[group] === option.id"
          :compact="isSize"
          @select="select(group, option.id)"
        />
      </div>

      <Transition
        enter-active-class="transition duration-300 ease-premium"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-200"
        leave-to-class="opacity-0"
      >
        <CustomPaintPicker v-if="showCustomPaint" class="mt-4" />
      </Transition>
    </div>
  </section>
</template>
