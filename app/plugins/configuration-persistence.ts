import type { Configuration } from '~/types/configurator'
import { CONFIG_STATE_KEY } from '~/composables/useConfigurator'
import { cloneDefaultConfiguration, sanitizeConfiguration } from '~/utils/configuration'

/**
 * Persists the configuration in a first-party cookie (30 days).
 * A cookie (not localStorage) lets the server render the saved build directly — no flash of
 * defaults, no hydration mismatch. Cookie content is untrusted and sanitized on read.
 */
export default defineNuxtPlugin(() => {
  const cookie = useCookie<unknown>('forgelab_config', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
    default: () => null,
  })

  const state = useState<Configuration>(CONFIG_STATE_KEY, cloneDefaultConfiguration)

  // On the server, hydrate state from the cookie. On the client, state arrives via the payload.
  if (import.meta.server) state.value = sanitizeConfiguration(cookie.value)

  if (import.meta.client) {
    watch(state, (value) => (cookie.value = value), { deep: true })
  }
})
