<script setup lang="ts">
/** Technical case study for reviewers: what's built, how, and what is mocked. Generic — no client content. */
useSeoMeta({ title: 'How it’s built · ForgeLab', description: 'Architecture and technology behind the ForgeLab 3D configurator.' })

const sections = [
  {
    title: '3D pipeline',
    points: [
      'Original procedural bike generated in code (Three.js in Node) and exported as glTF Binary — named parts, mount anchors, named PBR materials.',
      'Meshopt compression chosen after measuring against Draco on the real model: base bike 2.5 MB → 628 KB; 34 part-variant files load only when chosen.',
      'Asset-mapping layer: logical part ids map to whatever names a model uses, so a CAD- or artist-made model can replace the procedural one without code changes.',
      'Authored glTF animation clip (“Ride”) played with Three.js’ AnimationMixer — the same pipeline as an open/close animation exported from CAD.',
      'Animated exploded assembly view; part swaps and animations keep working while exploded.',
    ],
    try: 'Viewer: Ride · Explode · lighting presets',
  },
  {
    title: 'Configurator engine',
    points: [
      'Every step changes the 3D model with real geometry: 4 frames × 5 sizes, 3 drivetrains (incl. a 13-cog cassette), wheels, bar, stem, saddle.',
      'Parts mount on anchors and keep position, rotation and scale; replacing a frame carries every mounted part across.',
      'Data-driven compatibility rules with card warnings and one-click fixes that never introduce new conflicts.',
      'The UI only says “Shown in 3D” when the engine reports the part was actually mounted.',
    ],
    try: 'Frame → Size → Groupset → Cockpit',
  },
  {
    title: 'Materials',
    points: [
      'Real-time PBR paint: matte / gloss / metallic with clearcoat, animated, no scene reload.',
      '“Forged Pattern”: a procedural GPU shader (0 KB textures) with anti-aliasing so fine bands don’t shimmer at a distance.',
      'One-of-a-kind pieces: the studio uploads a photo; it is projected onto the 3D part (planar mapping) so buyers see the exact piece.',
    ],
    try: 'Paint → Forged Pattern · Cockpit → One-of-a-kind cover',
  },
  {
    title: 'Mobile AR at real size',
    points: [
      'iPhone: the current build is exported to USDZ in the browser and opened in AR Quick Look.',
      'Android: live WebXR placement, with Google Scene Viewer as fallback — fed by a GLB of the exact build assembled on the server.',
      'Tested on real devices: works on a Galaxy S24 Ultra; budget phones without ARCore can’t run AR, and the page says so.',
    ],
    try: 'Tap AR on a phone',
  },
  {
    title: 'Commerce (Shopify)',
    points: [
      'Commerce sits behind CommerceProvider / ProductCatalogProvider / CartProvider / CheckoutProvider interfaces; the configurator never talks to a store directly.',
      'The browser never sends prices: server routes re-validate the build, re-price every line by variant id and reject tampered requests.',
      'Multi-currency (USD, CAD, EUR, GBP, JPY), stock per component (frame stock per size), region shipping rules enforced at checkout, printable packing slip with bill of materials.',
      'Connected to a real Shopify store through the Storefront API: Shopify prices every line by SKU, sold-out variants are refused, and checkout is Shopify-hosted. The product catalog is generated from the configurator (CSV import). This public demo runs the mock store.',
    ],
    try: 'Review → Add to cart → Packing slip',
  },
  {
    title: 'Quality',
    points: [
      'TypeScript strict across app, server and generator.',
      'Unit tests (Vitest) run the swap engine, animations, AR exports and commerce rules against the real generated model files.',
      'End-to-end browser checks (Playwright) on desktop and phone sizes, run against production builds and the live site.',
      'Accessible controls (radio groups, focus management, live regions), honest UI states, no silent failures.',
    ],
    try: '',
  },
]

const stack = ['Nuxt 3', 'Vue 3', 'TypeScript', 'Three.js', 'glTF + Meshopt', 'Tailwind CSS', 'Nitro server routes', 'Netlify (Functions + Blobs)', 'Vitest', 'Playwright']
</script>

<template>
  <div class="min-h-dvh bg-bone">
    <header class="sticky top-0 z-10 border-b border-bone-300/80 bg-bone/85 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <ForgeLabLogo />
        <NuxtLink to="/" class="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bone hover:bg-ink-700">Open the configurator →</NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-forge">Technology demonstration</p>
      <h1 class="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tightest sm:text-5xl">How ForgeLab is built</h1>
      <p class="mt-4 max-w-2xl text-lg leading-relaxed text-graphite">
        A premium 3D product configurator: guided steps, live pricing, real part replacement in 3D, mobile AR, and a
        commerce layer designed for Shopify — built and tested end to end.
      </p>

      <div class="mt-12 grid gap-6 md:grid-cols-2">
        <section v-for="s in sections" :key="s.title" class="rounded-3xl border border-bone-300 bg-white p-6 sm:p-8">
          <h2 class="font-display text-xl font-semibold tracking-tight">{{ s.title }}</h2>
          <ul class="mt-4 space-y-2.5 text-[0.95rem] leading-relaxed text-graphite">
            <li v-for="pt in s.points" :key="pt" class="flex gap-3">
              <span class="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forge" aria-hidden="true" />
              <span>{{ pt }}</span>
            </li>
          </ul>
          <p v-if="s.try" class="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-ink">Try it: <span class="text-graphite">{{ s.try }}</span></p>
        </section>
      </div>

      <section class="mt-12">
        <h2 class="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-graphite-400">Stack</h2>
        <ul class="mt-3 flex flex-wrap gap-2">
          <li v-for="t in stack" :key="t" class="rounded-full border border-bone-300 bg-white px-3 py-1.5 text-sm">{{ t }}</li>
        </ul>
      </section>

      <p class="mt-12 max-w-2xl text-xs leading-relaxed text-graphite-400">
        ForgeLab is a fictional brand. The bike is an original procedurally generated model; component names, specs,
        prices, compatibility and shipping rules are illustrative. Third-party brand names imply no affiliation. Exchange
        rates are fixed demo values. The public demo uses a mock store; the Shopify connection is switched on per deployment.
      </p>
    </main>
  </div>
</template>
