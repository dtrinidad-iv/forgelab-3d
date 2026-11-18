<script setup lang="ts">
/** Shown when a buyer returns from the Shopify store (`?from=shopify`) with a checkout still open. */
const route = useRoute()
const router = useRouter()
const url = ref<string | null>(null)

onMounted(() => {
  if (route.query.from !== 'shopify') return
  url.value = takePendingCheckout()
  const { from: _from, ...query } = route.query
  void router.replace({ query })
})
</script>

<template>
  <Transition enter-active-class="transition duration-300 ease-premium" enter-from-class="opacity-0 -translate-y-2" leave-active-class="transition duration-200" leave-to-class="opacity-0">
    <div v-if="url" role="status" class="fixed inset-x-4 top-20 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-bone-300 bg-white px-4 py-3 shadow-lg sm:flex-nowrap">
      <p class="text-sm">
        <span class="font-semibold">Back from the ForgeLab store.</span>
        <span class="text-graphite"> Still need to finish your order?</span>
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <a :href="url" class="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bone hover:bg-ink-700">Continue to checkout</a>
        <button type="button" class="rounded-full px-3 py-2 text-sm text-graphite hover:text-ink" aria-label="Dismiss" @click="url = null">✕</button>
      </div>
    </div>
  </Transition>
</template>
