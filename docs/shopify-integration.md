# Shopify integration plan

Status: **not implemented.** The MVP uses a mock commerce provider with server-side pricing. The
configurator talks only to `CommerceProvider` (`app/commerce/types.ts`), so Shopify plugs in
without changing configurator code. No Shopify packages are installed yet.

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

## Already in place

- `CommerceProvider` / `ProductCatalogProvider` / `CartProvider` / `CheckoutProvider` / `OrderConfiguration` types
- Mock provider + Nitro routes with strict validation and server pricing
- `addConfigurationToCart` workflow (provider-agnostic) and the cart UI
- `forgelab.configuration/v1` JSON export for saved configurations / backend hand-off
