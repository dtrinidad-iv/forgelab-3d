# Shopify integration

Status: **implemented (Storefront API 2026-10), opt-in.** `NUXT_PUBLIC_COMMERCE_PROVIDER=shopify`
switches the server routes from the mock store to a real Shopify store; the default stays `mock`.
No Shopify packages — one typed `fetch` (`app/commerce/shopify/storefront.ts`).

| Piece | File |
|---|---|
| Product import (CSV, same SKUs/prices/stock as the configurator) | `app/commerce/shopify/productsCsv.ts` → `npm run shopify:csv` → `shopify/forgelab-products.csv` |
| Quote: strict validation + compatibility + region rules, then every line priced from Shopify by SKU (`@inContext(country)`) | `app/commerce/shopify/service.ts` `quoteShopify` |
| **Live catalog** for the configurator: every SKU's price + stock (`quantityAvailable`) per market, cached 60 s on the server, refreshed every minute and when the tab regains focus. Cards, totals, fix prices and stock badges read it | `loadLiveCatalog` → `server/api/catalog/live.get.ts` → `useLiveCatalog` / `usePricing` / `useInventory` (`app/commerce/liveCatalog.ts`) |
| Cart: only `gid://shopify/ProductVariant/…` ids, `cartCreate` with build attributes + buyer country; dropped (sold-out) lines are reported | `createShopifyCart` |
| Private token, server-only, buyer IP forwarded | `server/utils/shopify.ts` |
| Browser provider (same routes, redirects to Shopify checkout) | `app/commerce/shopify/provider.ts` |
| Tests (fake Storefront API) | `tests/shopify.test.ts`, `tests/liveCatalog.test.ts` |

### Store setup (one time)

1. Dev store (Dev Dashboard → Stores → Create store → Dev). **Settings → General → Store currency: USD**
   before importing (CSV prices are in the store currency).
2. Install the **Headless** channel → Create storefront → copy the **private** token. Keep the
   `unauthenticated_read_product_inventory` permission on (live stock badges use `quantityAvailable`).
3. `.env` (git-ignored) / Netlify env vars:
   `NUXT_PUBLIC_SHOPIFY_STORE_DOMAIN=<store>.myshopify.com`, `NUXT_SHOPIFY_STOREFRONT_PRIVATE_TOKEN=…`,
   `NUXT_PUBLIC_COMMERCE_PROVIDER=shopify`.
4. `npm run shopify:csv`, then **Products → Import** `shopify/forgelab-products.csv`; select all
   ForgeLab products → **Include in sales channels → Headless**.
5. **Settings → Markets**: add the countries you sell to (US, CA, GB, DE/FR/IT, JP, AU). A country
   outside every market can't check out; each market's currency is what Shopify charges.
6. Test payments: Settings → Payments → test mode / Bogus gateway.
7. **Send store pages back to the configurator** (headless setup). Online Store → Themes → ⋯ →
   Edit code → `layout/theme.liquid`, first lines inside `<head>`:

   ```liquid
   {%- unless request.design_mode -%}
     <meta http-equiv="refresh" content="0; url=https://relaxed-custard-cb3af1.netlify.app/?from=shopify">
     <script>window.location.replace('https://relaxed-custard-cb3af1.netlify.app/?from=shopify')</script>
   {%- endunless -%}
   ```

   Every Online Store page (home, catalog, the "Continue shopping" link and logo after checkout)
   then returns to the configurator. Checkout, the thank-you page and the password page are not
   theme pages, so they keep working; the theme editor (`design_mode`) stays usable.
   On a dev store the password page lands on the home page → redirected back with `?from=shopify` →
   the configurator offers **Continue to checkout** for the checkout the buyer had opened
   (`usePendingCheckout`, one-shot, Shopify URLs only, max 1 hour old).

### Known limits

- One-of-a-kind covers live in ForgeLab storage, not Shopify — refused in Shopify mode with a clear
  message. Syncing them needs the Admin API (create a product per piece on upload, inventory 1).
- Prices and stock in the configurator come from Shopify (up to ~1 minute old). The dev store prices
  every market in USD, so other display currencies are Shopify's USD converted at the demo rates and
  labelled that way; a market with its own Shopify currency is shown as-is. The cart always shows
  what Shopify charges and says so when it differs.
- A market the store doesn't sell to (no market / shipping zone) shows prices but no stock, with a
  "the store doesn't sell to X yet" note.
- Region rules are checked before the cart is created; the buyer can still change the address in
  Shopify checkout. Enforcing them there needs a cart & checkout validation Function.
- Names, specs, compatibility and 3D mapping stay in `app/config` (Shopify doesn't model them); a
  new option still needs a code change plus a Shopify variant with the matching SKU.
- The exported configuration JSON keeps the code's catalog prices (USD).

## Original plan

> Verify every API detail below against Shopify's current Storefront API documentation and pick a
> currently supported API version when implementing — this plan describes the approach, not a
> pinned API contract.

## Target workflow

1. Customer configures a bike in ForgeLab.
2. The browser sends an `OrderConfiguration` (selections only — **no prices**) to our server.
3. Server (Nitro route today; Laravel later) strictly validates options and compatibility rules.
4. Server maps the configuration to Shopify **product variants** and reads their authoritative prices
   and availability from Shopify.
5. Server creates a Shopify **cart** (`cartCreate`) with one line per variant, plus line/cart
   attributes carrying the build id and custom-paint details.
6. Browser is redirected to `cart.checkoutUrl` (Shopify-hosted checkout).
7. Shopify handles payment and order creation. The order contains the build id → configuration.

## Product modelling

| ForgeLab | Shopify |
|---|---|
| Frame + size | Product "Aero Carbon frameset" with a variant per size (SKU `FL-FRAME-AERO-CARBON-M`) |
| Paint, groupset, wheels, bar, stem, tape, saddle | One product per category, a variant per option (SKU `FL-WHEELS-CARBON-DEEP`) |
| Custom paint colour/finish | Line attributes on the paint line (`Paint colour`, `Paint finish`) |
| Whole build | `_forgelab_build` line attribute on every line + `forgelab_build` cart attribute |

`app/commerce/catalogMap.ts` already produces exactly this shape with mock ids; the Shopify version
swaps `mock://variant/<SKU>` for real `gid://shopify/ProductVariant/<id>` values (look up by SKU
once and cache, or sync into a table).

To present the build as one item, evaluate Shopify's bundle options (e.g. a Cart Transform
Function that merges the component lines into a bundle parent) — check plan availability first.

## Pricing rules (non-negotiable)

- **Never trust browser prices.** The browser never sends prices; the mock server ignores any it
  receives (covered by tests).
- **Cart attributes do not change price.** Price must come from real variants (or a server-side
  pricing mechanism Shopify honours, e.g. bundle/transform logic). A "configured bike" product with
  a client-computed price is not acceptable.
- Re-validate availability and compatibility server-side before creating the cart.
- Add server-side checkout validation with a **Shopify Function** (cart & checkout validation) so a
  cart edited after creation (e.g. an incompatible line removed/added) cannot check out.

## Tokens and secrets

- **Admin API** credentials never reach the browser — only used for catalog sync jobs on a server.
- **Storefront API:** use the **private** Storefront token from server routes only (sent as the
  `Shopify-Storefront-Private-Token` header, with the buyer IP forwarded per Shopify's guidance).
  A public Storefront token may be used in the browser only for read-only, non-sensitive queries.
- Config: `runtimeConfig.shopifyStorefrontPrivateToken` (server-only, `NUXT_SHOPIFY_STOREFRONT_PRIVATE_TOKEN`),
  `runtimeConfig.public.shopifyStoreDomain`, provider switch `NUXT_PUBLIC_COMMERCE_PROVIDER=shopify`.

## Implementation steps

1. Create the products/variants above (SKUs must match `catalogMap.ts`).
2. Implement `server/api/commerce/quote.post.ts` for Shopify: reuse `parseOrderConfiguration` +
   `evaluateCompatibility`, then query variant prices/availability by SKU or stored GID.
3. Implement `server/api/commerce/cart.post.ts` with the `cartCreate` mutation:

   ```graphql
   mutation CartCreate($input: CartInput!) {
     cartCreate(input: $input) {
       cart { id checkoutUrl cost { totalAmount { amount currencyCode } }
              lines(first: 20) { nodes { id quantity attributes { key value }
                merchandise { ... on ProductVariant { id sku title } } } } }
       userErrors { field message }
     }
   }
   ```
   with `input.lines = [{ merchandiseId, quantity: 1, attributes }]` and `input.attributes` for the build.
4. Fill in `app/commerce/shopify/provider.ts` (calls our server routes, never Shopify directly with secrets).
5. Multi-currency: pass the buyer's country via the cart's buyer identity / `@inContext` and display
   Shopify's returned money values instead of the USD demo catalog.
6. Add the checkout validation Function; add inventory checks to the quote.
7. Contract tests: the existing `tests/commerce.test.ts` cases must pass against the Shopify provider
   (tampering rejected, incompatible builds refused, line attributes present).

## Already in place (before the integration)

- `CommerceProvider` / `ProductCatalogProvider` / `CartProvider` / `CheckoutProvider` / `OrderConfiguration` types
- Mock provider + Nitro routes with strict validation and server pricing
- `addConfigurationToCart` workflow (provider-agnostic) and the cart UI
- `forgelab.configuration/v1` JSON export for saved configurations / backend hand-off
