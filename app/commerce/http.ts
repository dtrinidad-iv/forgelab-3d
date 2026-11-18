import { CommerceError } from './types'

interface FetchErrorLike {
  message?: string
  data?: { statusMessage?: string; message?: string; data?: { code?: CommerceError['code'] } }
}

/** POST to our own commerce routes; server errors become CommerceErrors with their code. */
export async function postCommerce<T>(url: string, body: unknown): Promise<T> {
  try {
    // Typed by the caller (Nitro's route-based inference can't see generic T).
    return (await $fetch(url, { method: 'POST', body: body as Record<string, unknown> })) as T
  } catch (err) {
    const e = err as FetchErrorLike
    throw new CommerceError(e.data?.statusMessage ?? e.data?.message ?? e.message ?? 'Commerce request failed.', e.data?.data?.code ?? 'network')
  }
}
