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

  runtimeConfig: {
    // Server-only secrets (future Shopify integration). Never exposed to the browser.
    shopifyStorefrontPrivateToken: '',
    public: {
      /** 'mock' (default) or 'shopify' — NUXT_PUBLIC_COMMERCE_PROVIDER */
      commerceProvider: 'mock',
      /** Commit the deployment was built from (Netlify sets COMMIT_REF) — shown in the page footer. */
      buildRef: (process.env.COMMIT_REF ?? '').slice(0, 7) || 'local',
      shopifyStoreDomain: '',
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
