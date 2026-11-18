<script setup lang="ts">
/**
 * Printable packing slip + bill of materials for the last server-priced cart.
 * Demo: data is handed over via localStorage by useCommerce().openPackingSlip(). With Shopify this
 * is the store's packing slip template (Liquid) reading the order's line items and line properties
 * (build id, custom paint) — see docs/shopify-integration.md.
 */
import type { Cart, Quote } from '~/commerce/types'
import { isCurrencyCode } from '~/config/currency'
import { destinationOf, type ShipTo } from '~/config/shipping'
import { formatMoney } from '~/utils/money'
import { PACKING_SLIP_KEY } from '~/composables/useCommerce'

interface SlipData {
  cart: Cart
  quote: Quote
  shipTo: ShipTo | null
  createdAt: string
}

useSeoMeta({ title: 'Packing slip · ForgeLab' })

const data = ref<SlipData | null>(null)
const loaded = ref(false)

onMounted(() => {
  try {
    const raw = localStorage.getItem(PACKING_SLIP_KEY)
    if (raw) data.value = JSON.parse(raw) as SlipData
  } catch {
    data.value = null
  }
  loaded.value = true
})

const money = (m: { amount: number; currencyCode: string }) => (isCurrencyCode(m.currencyCode) ? formatMoney(m.amount, m.currencyCode) : `${m.amount} ${m.currencyCode}`)

/** Deterministic mock warehouse bin per SKU (e.g. "B-07-3"). */
function binFor(sku: string) {
  let h = 0
  for (const c of sku) h = (h * 31 + c.charCodeAt(0)) >>> 0
  // Unsigned shifts (>>>): a signed shift can go negative and produce "A--17--1".
  return `${String.fromCharCode(65 + (h % 6))}-${String(((h >>> 3) % 20) + 1).padStart(2, '0')}-${((h >>> 8) % 4) + 1}`
}

const destination = computed(() => {
  const s = data.value?.shipTo
  if (!s) return 'Not specified'
  const d = destinationOf(s.country)
  const region = d?.regions?.find((r) => r.code === s.region)?.name
  return [region, d?.name ?? s.country].filter(Boolean).join(', ')
})

const created = computed(() => (data.value ? new Date(data.value.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''))

const printSlip = () => window.print()

const ASSEMBLY = [
  'Inspect frameset; install headset, fork and seatpost',
  'Install bottom bracket and crankset; torque to spec',
  'Fit cassette, derailleurs and chain; index gears',
  'Mount wheels and tyres; set tyre pressure',
  'Fit stem, handlebar and shifters; route and bleed brakes',
  'Wrap bar tape; fit saddle at rider height',
  'Final check: torque marks, brakes, shifting, test ride',
]
</script>

<template>
  <div class="min-h-dvh bg-bone-200/60 px-4 py-8 print:bg-white print:p-0 sm:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="mb-4 flex items-center justify-between gap-3 print:hidden">
        <NuxtLink to="/" class="text-sm text-graphite underline-offset-4 hover:underline">← Back to configurator</NuxtLink>
        <button v-if="data" type="button" class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-bone hover:bg-ink-700" @click="printSlip">
          Print
        </button>
      </div>

      <article class="rounded-2xl bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none sm:p-10">
        <p v-if="!loaded" class="text-sm text-graphite">Loading…</p>
        <div v-else-if="!data" class="text-sm text-graphite">
          <p class="font-medium text-ink">No packing slip to show.</p>
          <p class="mt-1">Add a build to the cart in the configurator, then choose “Packing slip / BOM”.</p>
        </div>

        <template v-else>
          <header class="flex flex-wrap items-start justify-between gap-6 border-b border-bone-300 pb-6">
            <div>
              <ForgeLabLogo />
              <h1 class="mt-4 font-display text-2xl font-semibold tracking-tight">Packing slip &amp; bill of materials</h1>
              <p class="mt-1 text-xs text-graphite">Demo document generated from the server-priced cart</p>
            </div>
            <dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
              <dt class="text-graphite">Build</dt>
              <dd class="tabular font-mono font-medium">{{ data.quote.buildId }}</dd>
              <dt class="text-graphite">Cart</dt>
              <dd class="tabular font-mono text-xs">{{ data.cart.id }}</dd>
              <dt class="text-graphite">Date</dt>
              <dd>{{ created }}</dd>
              <dt class="text-graphite">Ship to</dt>
              <dd class="font-medium">{{ destination }}</dd>
            </dl>
          </header>

          <section class="mt-6" aria-labelledby="bom-title">
            <h2 id="bom-title" class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400">Bill of materials</h2>
            <table class="mt-3 w-full text-left text-sm">
              <thead class="border-b border-bone-300 text-[0.7rem] uppercase tracking-[0.1em] text-graphite-400">
                <tr>
                  <th class="py-2 pr-3 font-semibold">#</th>
                  <th class="py-2 pr-3 font-semibold">Component</th>
                  <th class="py-2 pr-3 font-semibold">SKU</th>
                  <th class="py-2 pr-3 text-right font-semibold">Qty</th>
                  <th class="py-2 pr-3 font-semibold">Bin</th>
                  <th class="py-2 text-center font-semibold">Picked</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-bone-300">
                <tr v-for="(line, i) in data.cart.lines" :key="line.id" class="align-top">
                  <td class="tabular py-2.5 pr-3 text-graphite">{{ i + 1 }}</td>
                  <td class="py-2.5 pr-3">
                    <p class="font-medium">{{ line.title }}</p>
                    <p v-for="a in line.attributes.filter((x) => !x.key.startsWith('_'))" :key="a.key" class="text-xs text-graphite">
                      {{ a.key }}: <span class="font-mono">{{ a.value }}</span>
                    </p>
                  </td>
                  <td class="tabular py-2.5 pr-3 font-mono text-xs">{{ line.sku }}</td>
                  <td class="tabular py-2.5 pr-3 text-right">{{ line.quantity }}</td>
                  <td class="tabular py-2.5 pr-3 font-mono text-xs">{{ binFor(line.sku) }}</td>
                  <td class="py-2.5 text-center"><span class="inline-block h-4 w-4 rounded border border-graphite-300" aria-hidden="true" /></td>
                </tr>
              </tbody>
            </table>
            <p class="mt-3 text-right text-sm">
              <span class="text-graphite">{{ data.cart.lines.length }} components · order value</span>
              <span class="tabular ml-2 font-medium">{{ money(data.cart.cost.total) }}</span>
            </p>
          </section>

          <section class="mt-8" aria-labelledby="asm-title">
            <h2 id="asm-title" class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400">Assembly checklist</h2>
            <ol class="mt-3 space-y-2 text-sm">
              <li v-for="(step, i) in ASSEMBLY" :key="step" class="flex items-start gap-3">
                <span class="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-graphite-300" aria-hidden="true" />
                <span><span class="tabular text-graphite">{{ i + 1 }}.</span> {{ step }}</span>
              </li>
            </ol>
          </section>

          <footer class="mt-10 grid grid-cols-2 gap-8 border-t border-bone-300 pt-6 text-xs text-graphite">
            <div>Assembled by<span class="mt-6 block border-b border-graphite-300" /></div>
            <div>Quality check<span class="mt-6 block border-b border-graphite-300" /></div>
          </footer>
        </template>
      </article>
    </div>
  </div>
</template>
