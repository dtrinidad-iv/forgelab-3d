<script setup lang="ts">
import { isCurrencyCode } from '~/config/currency'
import { DESTINATIONS, destinationOf } from '~/config/shipping'
import { formatMoney } from '~/utils/money'

/** Server money values are already in the cart currency. */
const money = (m: { amount: number; currencyCode: string }) =>
  isCurrencyCode(m.currencyCode)
    ? formatMoney(m.amount, m.currencyCode)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currencyCode, maximumFractionDigits: 2 }).format(m.amount)

const { provider, status, open, quote, cart, error, errorCode, finishRestricted, shipTo, shipToChosen, clientTotal, close, addToCart, openPackingSlip } = useCommerce()
const { goToGroup } = useConfiguratorSteps()

const destination = computed(() => destinationOf(shipTo.value.country))
const canSubmit = computed(() => Boolean(destination.value && (!destination.value.regions || shipTo.value.region)))
function setCountry(code: string) {
  shipTo.value = { country: code, region: null }
  shipToChosen.value = true
}
/** Region-rule block → take the customer straight to the step that can fix it. */
function changeFinish() {
  close()
  goToGroup('paint')
}

const showCheckout = ref(false)
const panel = ref<HTMLElement | null>(null)

const onKeydown = (e: KeyboardEvent) => e.key === 'Escape' && close()

// Escape must work wherever focus is (views swap and remove the focused button).
watch(open, async (v) => {
  showCheckout.value = false
  if (!import.meta.client) return
  if (v) {
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    panel.value?.focus()
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

// Keep focus inside the dialog when its content changes.
watch([showCheckout, status], async () => {
  await nextTick()
  if (open.value && !panel.value?.contains(document.activeElement)) panel.value?.focus()
})

onBeforeUnmount(() => import.meta.client && window.removeEventListener('keydown', onKeydown))

const { currency: displayCurrency } = useCurrency()
const currencyMatches = computed(() => !cart.value || cart.value.cost.total.currencyCode === displayCurrency.value)
const priceMatches = computed(() => !cart.value || (currencyMatches.value && cart.value.cost.total.amount === clientTotal.value))
const quotedAt = computed(() => (quote.value ? new Date(quote.value.quotedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''))

// Test-store hint: a Shopify dev store keeps checkout behind a storefront password.
const runtime = useRuntimeConfig()
const storePassword = computed(() => (provider.id === 'shopify' ? String(runtime.public.shopifyStorePassword ?? '') : ''))
const copied = ref(false)
async function copyPassword() {
  try {
    await navigator.clipboard.writeText(storePassword.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    /* clipboard blocked — the password is visible anyway */
  }
}

function goToCheckout() {
  if (!cart.value) return
  if (provider.checkout.isDemo) showCheckout.value = true
  else window.location.href = provider.checkout.checkoutUrl(cart.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-premium"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6" @click.self="close">
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
          tabindex="-1"
          class="mb-[var(--host-overlay-h,0px)] max-h-[calc(92dvh-var(--host-overlay-h,0px))] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bone p-6 shadow-2xl outline-none sm:rounded-3xl sm:p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-forge">{{ provider.label }}</p>
              <h2 id="cart-title" class="mt-1 font-display text-2xl font-semibold tracking-tight">
                {{ showCheckout ? 'Demo checkout' : status === 'form' ? 'Where should we ship?' : 'Your cart' }}
              </h2>
            </div>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-bone-300 hover:border-ink" aria-label="Close" @click="close">
              <svg viewBox="0 0 12 12" class="h-3 w-3" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            </button>
          </div>

          <!-- Ship to (region rules are checked by the server against this) -->
          <form v-if="status === 'form'" class="mt-6 space-y-4" @submit.prevent="canSubmit && addToCart()">
            <label class="block text-sm">
              <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Country</span>
              <select
                :value="shipTo.country"
                class="h-11 w-full rounded-xl border border-bone-300 bg-white px-3 text-sm focus:border-ink focus:outline-none"
                @change="setCountry(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="d in DESTINATIONS" :key="d.code" :value="d.code">{{ d.name }}</option>
              </select>
            </label>
            <label v-if="destination?.regions" class="block text-sm">
              <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">
                {{ shipTo.country === 'US' ? 'State' : 'Province' }}
              </span>
              <select
                v-model="shipTo.region"
                class="h-11 w-full rounded-xl border border-bone-300 bg-white px-3 text-sm focus:border-ink focus:outline-none"
              >
                <option :value="null" disabled>Choose…</option>
                <option v-for="r in destination.regions" :key="r.code" :value="r.code">{{ r.name }}</option>
              </select>
            </label>
            <p class="text-xs leading-relaxed text-graphite">
              Some finishes have regional shipping restrictions — we check them before your cart is created.
            </p>
            <button
              type="submit"
              :disabled="!canSubmit"
              class="h-12 w-full rounded-full bg-ink text-sm font-medium text-bone transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check availability &amp; add to cart
            </button>
          </form>

          <!-- Working -->
          <div v-else-if="status === 'working'" class="flex items-center gap-3 py-10 text-sm text-graphite" role="status">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-bone-300 border-t-ink" aria-hidden="true" />
            Validating and pricing your build on the server…
          </div>

          <!-- Error -->
          <div v-else-if="status === 'error'" class="py-6" role="alert">
            <p v-if="errorCode === 'restricted'" class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-forge">Can't ship to this destination</p>
            <p class="mt-1 text-sm font-medium text-forge-600">{{ error }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button v-if="errorCode === 'restricted' && finishRestricted" type="button" class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-bone" @click="changeFinish">Change finish</button>
              <button v-if="errorCode === 'restricted'" type="button" class="h-10 rounded-full border border-ink px-5 text-sm font-medium" @click="status = 'form'">Change destination</button>
              <button v-else type="button" class="h-10 rounded-full bg-ink px-5 text-sm font-medium text-bone" @click="addToCart">Try again</button>
            </div>
          </div>

          <!-- Demo checkout explanation -->
          <div v-else-if="cart && showCheckout" class="mt-6 space-y-4 text-sm leading-relaxed text-graphite">
            <p>
              <span class="font-semibold text-ink">This is a demo store — no payment is taken.</span>
              With the Shopify provider enabled, this button sends the customer to Shopify's hosted checkout
              (<code class="rounded bg-bone-200 px-1 text-xs">cart.checkoutUrl</code>), where payment and order creation happen.
            </p>
            <p>
              Cart <code class="rounded bg-bone-200 px-1 text-xs">{{ cart.id }}</code> · build
              <code class="rounded bg-bone-200 px-1 text-xs">{{ quote?.buildId }}</code> · {{ cart.lines.length }} lines ·
              {{ money(cart.cost.total) }}
            </p>
            <button type="button" class="h-11 w-full rounded-full border border-ink text-sm font-medium" @click="showCheckout = false">Back to cart</button>
          </div>

          <!-- Cart -->
          <div v-else-if="cart" class="mt-6">
            <ul class="divide-y divide-bone-300 border-y border-bone-300">
              <li v-for="line in cart.lines" :key="line.id" class="flex items-start justify-between gap-4 py-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium">{{ line.title }}</p>
                  <p class="tabular mt-0.5 font-mono text-[0.7rem] text-graphite-400">{{ line.sku }}</p>
                  <p v-for="a in line.attributes.filter((x) => !x.key.startsWith('_'))" :key="a.key" class="text-xs text-graphite">
                    {{ a.key }}: {{ a.value }}
                  </p>
                </div>
                <span class="tabular shrink-0 text-sm">{{ line.cost.amount === 0 ? 'Included' : money(line.cost) }}</span>
              </li>
            </ul>

            <!-- Total + primary action stay pinned to the bottom of the dialog on short screens. -->
            <div class="sticky -bottom-6 -mx-6 -mb-6 border-t border-bone-300 bg-bone px-6 pb-6 pt-4 sm:-bottom-8 sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8">
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
                  <p class="text-xs text-graphite">Priced by the server at {{ quotedAt }}</p>
                </div>
                <span class="tabular font-display text-3xl font-semibold">{{ money(cart.cost.total) }}</span>
              </div>
              <p v-if="!priceMatches" class="mt-2 text-xs font-medium text-forge-600">
                <template v-if="!currencyMatches">The store charges this destination in {{ cart.cost.total.currencyCode }} — the store's price applies.</template>
                <template v-else>The server price differs from the price shown in the configurator — the server price applies.</template>
              </p>

              <div v-if="storePassword" class="mt-3 rounded-xl border border-bone-300 bg-white px-3 py-2.5 text-xs leading-relaxed text-graphite">
                <p>
                  <span class="font-semibold text-ink">Test store — no real payment is taken.</span>
                  Shopify will ask for the store password:
                  <code class="rounded bg-bone-200 px-1.5 py-0.5 font-mono text-ink">{{ storePassword }}</code>
                  <button type="button" class="ml-1 font-medium text-ink underline underline-offset-2" @click="copyPassword">{{ copied ? 'Copied' : 'Copy' }}</button>
                </p>
                <p class="mt-1">At checkout, pay with the test card Shopify shows on the payment step.</p>
              </div>

              <button type="button" class="mt-4 h-12 w-full rounded-full bg-ink text-sm font-medium text-bone transition-colors hover:bg-ink-700" @click="goToCheckout">
                Continue to checkout
              </button>
              <div class="mt-3 flex items-center justify-between gap-3 text-xs text-graphite-400">
                <span>Build {{ quote?.buildId }} · {{ provider.checkout.isDemo ? 'Demo pricing' : 'Priced by Shopify' }} in {{ cart.cost.total.currencyCode }}</span>
                <button type="button" class="font-medium text-ink underline-offset-4 hover:underline" @click="openPackingSlip">Packing slip / BOM ↗</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
