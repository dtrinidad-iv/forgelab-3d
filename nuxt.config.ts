// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },

  // Nuxt 4 directory layout (app/ as srcDir, public/ at root) on Nuxt 3.
  future: { compatibilityVersion: 4 },

  modules: ['@nuxtjs/tailwindcss', '@nuxt/fonts'],

  components: [{ path: '~/components', pathPrefix: false }],

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  typescript: {
    strict: true,
    typeCheck: false, // run `npm run typecheck` explicitly
    // Node scripts (generator, inspector) are checked separately via scripts/tsconfig.json.
    tsConfig: { exclude: ['../scripts'] },
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [300, 400, 500, 600, 700] },
      { name: 'Space Grotesk', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  // Typed loosely on purpose: in this setup nuxt.config only sees Nitro's fallback config type
  // (same gap as routeRules), but Nitro does honour `storage` at build time.
  nitro: {
    storage: {
      // Unique-piece photos + metadata: Netlify Blobs when built on Netlify, a local folder otherwise.
      pieces: process.env.NETLIFY ? { driver: 'netlify-blobs', name: 'forgelab-pieces' } : { driver: 'fs', base: './.data/pieces' },
    },
  } as Record<string, unknown>,

  runtimeConfig: {
    /** Admin uploads are disabled unless NUXT_ADMIN_PASSWORD is set. */
    adminPassword: '',
    // Server-only secrets (future Shopify integration). Never exposed to the browser.
    shopifyStorefrontPrivateToken: '',
    public: {
      /** 'mock' (default) or 'shopify' — NUXT_PUBLIC_COMMERCE_PROVIDER */
      commerceProvider: 'mock',
      /** Commit the deployment was built from (Netlify sets COMMIT_REF) — shown in the page footer. */
      buildRef: (process.env.COMMIT_REF ?? '').slice(0, 7) || 'local',
      shopifyStoreDomain: '',
      /** Dev-store storefront password, shown in the cart as a test-store hint (NUXT_PUBLIC_SHOPIFY_STORE_PASSWORD). Leave empty for a real store. */
      shopifyStorePassword: '',
    },
  },

  app: {
    head: {
      title: 'ForgeLab — Build your road bike',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Configure a hand-built ForgeLab road bicycle in 3D.' },
        { name: 'theme-color', content: '#0E0F11' },
        // Private client demo — keep it out of search engines.
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },

  build: {
    transpile: ['three'],
  },
})
