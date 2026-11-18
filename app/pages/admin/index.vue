<script setup lang="ts">
/**
 * Studio back-office (demo): upload one-of-a-kind saddle covers. Each photo becomes a selectable
 * option in the configurator and is mapped onto the 3D saddle. Password-protected server-side
 * (NUXT_ADMIN_PASSWORD); uploads are disabled on deployments without one.
 */
import type { UniquePiece } from '~/types/pieces'

useSeoMeta({ title: 'Studio · Unique pieces · ForgeLab' })

const { pieces, imageUrl, refresh } = usePieces()
const { format } = useCurrency()

const PASS_KEY = 'forgelab-admin-pass'
const password = ref('')
onMounted(() => {
  try {
    password.value = sessionStorage.getItem(PASS_KEY) ?? ''
  } catch {
    /* storage blocked */
  }
})
watch(password, (v) => {
  try {
    sessionStorage.setItem(PASS_KEY, v)
  } catch {
    /* storage blocked */
  }
})

const name = ref('')
const story = ref('')
const price = ref(120)
const preview = ref<string | null>(null)
const busy = ref(false)
const message = ref<{ tone: 'ok' | 'error'; text: string } | null>(null)

/** Resize in the browser (max 1200 px, JPEG) so uploads stay small and EXIF data is dropped. */
async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  message.value = null
  if (!file) return (preview.value = null)
  if (!file.type.startsWith('image/')) return (message.value = { tone: 'error', text: 'Please choose an image file.' })
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  preview.value = canvas.toDataURL('image/jpeg', 0.85)
}

async function call<T>(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  try {
    return (await $fetch(url, { method, body: body as Record<string, unknown> | undefined, headers: { 'x-admin-password': password.value } })) as T
  } catch (err) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    throw new Error(e.data?.statusMessage ?? e.message ?? 'Request failed')
  }
}

async function upload() {
  if (!preview.value) return
  busy.value = true
  message.value = null
  try {
    const piece = await call<UniquePiece>('/api/admin/pieces', 'POST', { name: name.value, story: story.value, price: price.value, image: preview.value })
    message.value = { tone: 'ok', text: `“${piece.name}” is live in the configurator (Cockpit step).` }
    name.value = ''
    story.value = ''
    preview.value = null
    await refresh()
  } catch (err) {
    message.value = { tone: 'error', text: (err as Error).message }
  } finally {
    busy.value = false
  }
}

async function toggleSold(p: UniquePiece) {
  try {
    await call(`/api/admin/pieces/${p.id}`, 'PATCH', { sold: !p.sold })
    await refresh()
  } catch (err) {
    message.value = { tone: 'error', text: (err as Error).message }
  }
}

async function remove(p: UniquePiece) {
  if (!window.confirm(`Delete “${p.name}”?`)) return
  try {
    await call(`/api/admin/pieces/${p.id}`, 'DELETE')
    await refresh()
  } catch (err) {
    message.value = { tone: 'error', text: (err as Error).message }
  }
}
</script>

<template>
  <div class="min-h-dvh bg-bone">
    <header class="border-b border-bone-300">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3">
          <ForgeLabLogo />
          <span class="rounded-full bg-ink px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-bone">Studio</span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <NuxtLink to="/how-its-built" class="text-graphite underline-offset-4 hover:underline">How it's built</NuxtLink>
          <NuxtLink to="/" class="text-graphite underline-offset-4 hover:underline">Open configurator →</NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section aria-labelledby="upload-title">
        <h1 id="upload-title" class="font-display text-3xl font-semibold tracking-tightest">One-of-a-kind covers</h1>
        <p class="mt-2 text-sm leading-relaxed text-graphite">
          Photograph each hide from above on a neutral background. The photo becomes a selectable option and is mapped
          onto the 3D saddle — buyers see the exact piece they'll receive.
        </p>

        <form class="mt-6 space-y-4" @submit.prevent="upload">
          <label class="block text-sm">
            <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Admin password</span>
            <input v-model="password" type="password" autocomplete="current-password" required class="h-11 w-full rounded-xl border border-bone-300 bg-white px-3 focus:border-ink focus:outline-none" />
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Photo</span>
            <input type="file" accept="image/*" required class="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-bone" @change="onFile" />
          </label>
          <img v-if="preview" :src="preview" alt="Preview of the resized photo" class="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-black/5" />
          <label class="block text-sm">
            <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Name</span>
            <input v-model="name" maxlength="60" required placeholder="e.g. Hide No. 12 — Chestnut" class="h-11 w-full rounded-xl border border-bone-300 bg-white px-3 focus:border-ink focus:outline-none" />
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Story (optional)</span>
            <textarea v-model="story" maxlength="240" rows="2" class="w-full rounded-xl border border-bone-300 bg-white px-3 py-2 focus:border-ink focus:outline-none" />
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-graphite-400">Price (USD)</span>
            <input v-model.number="price" type="number" min="0" max="2000" step="1" required class="h-11 w-full rounded-xl border border-bone-300 bg-white px-3 focus:border-ink focus:outline-none" />
          </label>
          <button type="submit" :disabled="busy || !preview" class="h-12 w-full rounded-full bg-ink text-sm font-medium text-bone hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50">
            {{ busy ? 'Uploading…' : 'Publish piece' }}
          </button>
          <p v-if="message" class="text-sm" :class="message.tone === 'ok' ? 'text-ink' : 'text-forge-600'" role="status">{{ message.text }}</p>
        </form>
      </section>

      <section aria-labelledby="list-title">
        <h2 id="list-title" class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400">In the studio ({{ pieces.length }})</h2>
        <p v-if="!pieces.length" class="mt-4 text-sm text-graphite">No pieces yet — upload the first one.</p>
        <ul class="mt-4 space-y-3">
          <li v-for="p in pieces" :key="p.id" class="flex gap-4 rounded-2xl border border-bone-300 bg-white p-3">
            <img :src="imageUrl(p.id)" :alt="`Photo of ${p.name}`" class="h-20 w-24 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="font-display font-semibold leading-tight">{{ p.name }}</p>
                <span class="tabular text-sm">{{ format(p.price) }}</span>
              </div>
              <p class="mt-0.5 line-clamp-2 text-xs text-graphite">{{ p.story }}</p>
              <div class="mt-2 flex gap-2 text-xs">
                <button type="button" class="rounded-full border border-bone-300 px-3 py-1 hover:border-ink" @click="toggleSold(p)">
                  {{ p.sold ? 'Mark available' : 'Mark sold' }}
                </button>
                <button type="button" class="rounded-full border border-bone-300 px-3 py-1 text-forge-600 hover:border-forge" @click="remove(p)">Delete</button>
                <span v-if="p.sold" class="self-center font-semibold uppercase tracking-wider text-graphite">Sold</span>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
