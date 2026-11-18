<script setup lang="ts">
import { formatPrice } from '~/utils/pricing'

const { provider, status, open, quote, cart, error, clientTotal, close, addToCart } = useCommerce()

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

const priceMatches = computed(() => !cart.value || cart.value.cost.total.amount === clientTotal.value)
const quotedAt = computed(() => (quote.value ? new Date(quote.value.quotedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''))

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
          class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-bone p-6 shadow-2xl outline-none sm:rounded-3xl sm:p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-forge">{{ provider.label }}</p>
              <h2 id="cart-title" class="mt-1 font-display text-2xl font-semibold tracking-tight">
                {{ showCheckout ? 'Demo checkout' : 'Your cart' }}
              </h2>
            </div>
            <button type="button" class="grid h-9 w-9 place-items-center rounded-full border border-bone-300 hover:border-ink" aria-label="Close" @click="close">
              <svg viewBox="0 0 12 12" class="h-3 w-3" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            </button>
          </div>

          <!-- Working -->
          <div v-if="status === 'working'" class="flex items-center gap-3 py-10 text-sm text-graphite" role="status">
            <span class="h-5 w-5 animate-spin rounded-full border-2 border-bone-300 border-t-ink" aria-hidden="true" />
            Validating and pricing your build on the server…
          </div>

          <!-- Error -->
          <div v-else-if="status === 'error'" class="py-6" role="alert">
            <p class="text-sm font-medium text-forge-600">{{ error }}</p>
            <button type="button" class="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-medium text-bone" @click="addToCart">Try again</button>
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
              {{ formatPrice(cart.cost.total.amount) }}
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
                <span class="tabular shrink-0 text-sm">{{ line.cost.amount === 0 ? 'Included' : formatPrice(line.cost.amount) }}</span>
              </li>
            </ul>

            <div class="mt-4 flex items-end justify-between">
              <div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Total</p>
                <p class="text-xs text-graphite">Priced by the server at {{ quotedAt }}</p>
              </div>
              <span class="tabular font-display text-3xl font-semibold">{{ formatPrice(cart.cost.total.amount) }}</span>
            </div>
            <p v-if="!priceMatches" class="mt-2 text-xs font-medium text-forge-600">
              The server price differs from the price shown in the configurator — the server price applies.
            </p>

            <button type="button" class="mt-6 h-12 w-full rounded-full bg-ink text-sm font-medium text-bone transition-colors hover:bg-ink-700" @click="goToCheckout">
              Continue to checkout
            </button>
            <p class="mt-3 text-center text-xs text-graphite-400">Build {{ quote?.buildId }} · Demo pricing in USD</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
