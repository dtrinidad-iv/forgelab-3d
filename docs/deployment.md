# Deployment

The app uses server-side rendering (saved builds render from the cookie) **and** Nitro API routes
(`/api/commerce/*`), so it needs a host that runs Nuxt's server — not static-only hosting
(`nuxt generate` would silently break persistence and the cart).

## Recommended: Netlify (free tier)

1. Push to GitHub (`main`).
2. Netlify → Add new site → Import from Git → `forgelab-3d`.
3. Build command `npm run build`, publish directory left to the Nuxt preset (auto-detected on Netlify).
   Node version comes from `.nvmrc` (22).
4. Environment variables: none required for the mock store.
   (`NUXT_PUBLIC_COMMERCE_PROVIDER=mock` is the default.)
   - `NUXT_ADMIN_PASSWORD` — enables `/admin` uploads of one-of-a-kind pieces. Without it the admin API
     answers 503 and the configurator simply shows no unique pieces. Use a long random value.
   - Uploaded pieces are stored in **Netlify Blobs** (store `forgelab-pieces`, picked automatically when
     `NETLIFY` is set); locally they go to `.data/pieces/` (git-ignored).
5. Every push to `main` redeploys; branches/PRs get preview URLs.

Cloudflare (Workers/Pages) also works (Nitro `cloudflare` preset) and offers free password
protection via Cloudflare Access. Vercel's free Hobby plan is intended for non-commercial use —
check its terms before showing client work there. Confirm current free-tier terms on any host.

## Before sharing with a client

- [x] `noindex, nofollow` meta tag + `X-Robots-Tag` header on pages and API routes (search engines kept out)
- [x] Disclaimer: fictional brand, illustrative specs/prices, third-party names imply no affiliation
- [x] Viewer labels the bike as ForgeLab's own procedural model
- [ ] Optional: password-protect the deployment if the link must stay private
- [ ] Smoke-test the deployed URL on desktop + phone: model loads, a part swaps, Add to cart works
- [ ] If showing uploads: set `NUXT_ADMIN_PASSWORD`, upload one piece, check it on the Cockpit step

## Production check locally

```bash
npm run build && node .output/server/index.mjs   # http://localhost:3000
```
