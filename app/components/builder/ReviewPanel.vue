<script setup lang="ts">
import { FORGELAB_ROAD_BIKE } from '~/config/assetMap'
import { GROUPS, GROUP_IDS } from '~/config/catalog'
import { buildConfigurationExport, exportFileName } from '~/utils/exportConfiguration'
import { formatPrice } from '~/utils/pricing'

const { configuration, getOption, paint } = useConfigurator()
const { goToGroup } = useConfiguratorSteps()
const { total, breakdown } = usePricing()
const { errors, isValid } = useCompatibility()

const rows = computed(() => GROUP_IDS.map((group) => ({ group, label: GROUPS[group].label, option: getOption(group) })))
const frameWeight = computed(() => getOption('frame')?.weightGrams)
const complete = computed(() => breakdown.value.missing.length === 0)
const allGroups = [...GROUP_IDS]

// ---- Export ----
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyTimer: ReturnType<typeof setTimeout> | undefined

function exportJson(): string {
  const doc = buildConfigurationExport(configuration.value, { model: FORGELAB_ROAD_BIKE.id })
  return JSON.stringify(doc, null, 2)
}

function download() {
  const url = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName()
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(exportJson())
    copyState.value = 'copied'
  } catch {
    copyState.value = 'failed'
  }
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copyState.value = 'idle'), 2000)
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div class="grid gap-6">
    <div class="min-w-0 space-y-6">
      <!-- Compatibility status -->
      <section aria-labelledby="compat-heading" class="space-y-3">
        <h2 id="compat-heading" class="sr-only">Compatibility</h2>
        <div
          v-if="isValid"
          class="flex items-center gap-3 rounded-2xl border border-bone-300 bg-white px-5 py-4 text-sm"
          role="status"
        >
          <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-bone" aria-hidden="true">
            <svg viewBox="0 0 12 12" class="h-2.5 w-2.5"><path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <span><span class="font-semibold">All components compatible.</span> <span class="text-graphite">Checked against ForgeLab demo rules.</span></span>
        </div>
        <CompatibilityNotice :groups="allGroups" :severities="['error', 'warning', 'info']" />
      </section>

      <!-- Spec sheet -->
      <dl class="divide-y divide-bone-300 rounded-2xl border border-bone-300 bg-white">
        <div
          v-for="row in rows"
          :key="row.group"
          class="grid grid-cols-[5.5rem_1fr_auto] items-start gap-3 px-4 py-4 sm:grid-cols-[8rem_1fr_auto] sm:gap-4 sm:px-5"
        >
          <dt class="pt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">{{ row.label }}</dt>
          <dd class="min-w-0">
            <p class="flex items-center gap-2 font-medium" :class="row.option ? '' : 'text-forge-600'">
              <PaintSwatch v-if="row.group === 'paint' && paint" :color="paint.color" :finish="paint.finish" size="sm" />
              {{ row.option?.name ?? 'Not selected' }}
              <span
                v-if="errors.some((e) => e.groups.includes(row.group))"
                class="h-1.5 w-1.5 rounded-full bg-forge"
                title="Compatibility issue"
              />
            </p>
            <p v-if="row.group === 'paint' && row.option?.paint?.custom && paint" class="tabular mt-0.5 text-sm text-graphite">
              {{ paint.color }} · {{ paint.finish }}
            </p>
            <p v-else-if="row.option" class="mt-0.5 text-sm text-graphite">{{ row.option.specs.join(' · ') }}</p>
            <button
              type="button"
              class="mt-1.5 text-xs font-medium text-forge-600 underline-offset-4 hover:underline"
              @click="goToGroup(row.group)"
            >
              {{ row.option ? 'Change' : 'Select' }}
            </button>
          </dd>
          <dd class="tabular text-sm">
            {{ row.option ? (row.option.price === 0 ? 'Included' : formatPrice(row.option.price)) : '—' }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="order-first flex flex-col gap-4 rounded-2xl bg-ink p-6 text-bone">
      <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-300">Build total</p>
      <PriceDisplay :value="total" size="lg" />
      <p v-if="frameWeight" class="text-sm text-graphite-300">Frameset {{ frameWeight.toLocaleString('en-US') }} g</p>

      <ul class="space-y-1.5 text-sm">
        <li class="flex items-center gap-2" :class="complete ? 'text-bone' : 'text-forge'">
          <span class="h-1.5 w-1.5 rounded-full" :class="complete ? 'bg-bone' : 'bg-forge'" aria-hidden="true" />
          {{ complete ? 'All selections made' : `${breakdown.missing.length} required selection${breakdown.missing.length > 1 ? 's' : ''} missing` }}
        </li>
        <li class="flex items-center gap-2" :class="isValid ? 'text-bone' : 'text-forge'">
          <span class="h-1.5 w-1.5 rounded-full" :class="isValid ? 'bg-bone' : 'bg-forge'" aria-hidden="true" />
          {{ isValid ? 'Compatible build' : `${errors.length} compatibility issue${errors.length > 1 ? 's' : ''}` }}
        </li>
      </ul>

      <div class="mt-2 border-t border-ink-600 pt-4">
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-300">Export configuration</p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-full bg-bone px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
            @click="download"
          >
            Download JSON
          </button>
          <button
            type="button"
            class="rounded-full border border-ink-600 px-4 py-2 text-sm font-medium transition-colors hover:border-graphite"
            @click="copy"
          >
            {{ copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : 'Copy' }}
          </button>
        </div>
        <p class="mt-3 text-xs leading-relaxed text-graphite-300">
          Includes selections, price breakdown and compatibility results. Demo pricing in USD — final
          pricing is confirmed at checkout.
        </p>
      </div>
    </div>
  </div>
</template>
