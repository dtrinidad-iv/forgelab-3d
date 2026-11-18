<script setup lang="ts">
import { GROUPS } from '~/config/catalog'
import type { GroupId } from '~/types/configurator'
import type { CompatibilityIssue } from '~/utils/compatibility'

const { format: formatPrice } = useCurrency()
const props = withDefaults(
  defineProps<{ groups: GroupId[]; severities?: CompatibilityIssue['severity'][] }>(),
  { severities: () => ['error', 'warning'] },
)

const { issuesFor, fixesFor, applyFix } = useCompatibility()
const list = computed(() => issuesFor(props.groups, props.severities))

const delta = (n: number) => (n === 0 ? 'same price' : `${n > 0 ? '+' : '−'}${formatPrice(Math.abs(n))}`)
</script>

<template>
  <TransitionGroup
    v-if="list.length"
    tag="div"
    class="space-y-3"
    enter-active-class="transition duration-300 ease-premium"
    enter-from-class="opacity-0 -translate-y-1"
    leave-active-class="transition duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-for="issue in list"
      :key="issue.ruleId"
      class="rounded-2xl border px-5 py-4"
      :class="{
        'border-forge/40 bg-forge-100/60': issue.severity === 'error',
        'border-bone-300 bg-white': issue.severity === 'warning',
        'border-bone-300 bg-bone-200/50': issue.severity === 'info',
      }"
      :role="issue.severity === 'error' ? 'alert' : 'status'"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold"
          :class="{
            'bg-forge text-white': issue.severity === 'error',
            'bg-ink text-bone': issue.severity === 'warning',
            'bg-graphite-300 text-white': issue.severity === 'info',
          }"
          aria-hidden="true"
        >
          {{ issue.severity === 'info' ? 'i' : '!' }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">
            {{ issue.severity === 'error' ? 'Incompatible' : issue.severity === 'warning' ? 'Recommendation' : 'Auto-matched' }}
            · {{ issue.title }}
            <span class="ml-1 font-normal text-graphite-400">(demo rule)</span>
          </p>
          <p class="mt-1 text-sm leading-relaxed text-graphite">{{ issue.message }}</p>

          <div v-if="issue.severity === 'error'" class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="fix in fixesFor(issue)"
              :key="`${fix.group}-${fix.optionId}`"
              type="button"
              class="rounded-full border border-ink bg-white px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-bone"
              @click="applyFix(fix)"
            >
              Switch {{ GROUPS[fix.group].label.toLowerCase() }} to {{ fix.name }}
              <span class="tabular opacity-60">· {{ delta(fix.priceDelta) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </TransitionGroup>
</template>
