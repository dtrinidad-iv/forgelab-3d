import type { LiveCatalog } from '~/commerce/liveCatalog'
import { CURRENCIES } from '~/config/currency'
import type { ShipTo } from '~/config/shipping'

const KEY = 'live-catalog'
/** Ask the server again this often (it caches Shopify for a minute too). */
const REFRESH_MS = 60_000

/** Shopify's live prices and stock (null in demo mode, or until/unless they load). Read-only. */
export function useLiveCatalog() {
  const { data } = useNuxtData<LiveCatalog | null>(KEY)
  const failed = useState<boolean>('live-catalog-failed', () => false)
  const live = computed<LiveCatalog | null>(() => data.value ?? null)
  return { live, failed }
}

/**
 * Loads the live catalog for the current market and keeps it fresh. Call ONCE (pages/index.vue);
 * everything else reads it through `useLiveCatalog()`. The market is the cart destination once
 * the customer picked one, otherwise the display currency's country — like the commerce server.
 */
export function useLiveCatalogLoader() {
  const enabled = useRuntimeConfig().public.commerceProvider === 'shopify'
  const { currency } = useCurrency()
  const shipTo = useState<ShipTo | undefined>('commerce-ship-to')
  const shipToChosen = useState<boolean | undefined>('commerce-ship-to-chosen')
  const country = computed(() => (shipToChosen.value && shipTo.value?.country) || CURRENCIES[currency.value].country)
  const { failed } = useLiveCatalog()

  const { error, refresh } = useFetch<LiveCatalog | null>('/api/catalog/live', {
    key: KEY,
    query: { country },
    default: () => null,
    immediate: enabled,
    watch: enabled ? undefined : false,
  })
  watch(error, (e) => (failed.value = enabled && Boolean(e)), { immediate: true })

  if (enabled && import.meta.client) {
    let timer: ReturnType<typeof setInterval> | undefined
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    onMounted(() => {
      timer = setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_MS)
      document.addEventListener('visibilitychange', onVisible)
    })
    onBeforeUnmount(() => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    })
  }
}
