# Architecture

ForgeLab 3D is a Nuxt 3 app (source in `app/`, Nuxt-4 directory layout) with a Three.js viewer,
a pure-TypeScript configuration engine, and a commerce layer behind interfaces.

```
                ┌──────────────────────────── browser ────────────────────────────┐
  config/       │  composables (Vue state)            components (UI)               │
  catalog.ts ──►│  useConfigurator ─┬─► useConfiguratorSteps ─► StepNav/OptionGroup │
  compatibility │                   ├─► usePricing ──────────► BuildSummary/Review  │
  assetMap.ts   │                   ├─► useCompatibility ────► CompatibilityNotice  │
                │                   └─► useCommerce ─────────► CartDialog           │
                │  ProductViewer.vue ─► ConfiguratorScene (paint + part swaps)      │
                │                       └─ loadModel (GLTFLoader + Meshopt)          │
                └──────────────────────────────┬───────────────────────────────────┘
                                               │ OrderConfiguration (no prices)
                ┌────────────── Nitro server ──▼───────────────────────────────────┐
                │ /api/commerce/quote  → strict parse, re-price, re-check rules     │
                │ /api/commerce/cart   → price lines by variant id                  │
                │ (future: Shopify Storefront API with the private token)           │
                └───────────────────────────────────────────────────────────────────┘
```

## Layers

| Layer | Files | Rules |
|---|---|---|
| **Data** | `app/config/catalog.ts`, `compatibility.ts`, `assetMap.ts` | All options, prices, rules and 3D mappings. No logic in templates. |
| **Pure logic** | `app/utils/pricing.ts`, `configuration.ts`, `compatibility.ts`, `exportConfiguration.ts` | No Vue, no DOM. Unit-tested. Shared by browser and server. |
| **State** | `app/composables/*` | `useState` (SSR-safe). Cookie persistence via `plugins/configuration-persistence.ts`. |
| **3D** | `app/utils/three/*`, `components/viewer/ProductViewer.vue` | Three.js objects never enter Vue reactivity. `ConfiguratorScene` reports what *actually* changed. |
| **Commerce** | `app/commerce/*`, `server/api/commerce/*` | Interfaces + mock provider. Server decides prices. Shopify provider is a documented stub. |
| **Assets** | `scripts/bike/*` → `public/models/bicycle/**` | Original procedural GLBs, Meshopt-compressed. |

## Key flows

**Selection → price.** `select()` updates `useState` → `usePricing` recomputes from the catalog
(`calculatePrice`) → UI updates immediately. Display only.

**Selection → 3D.** The page derives a `VisualTarget` (paint + one option per group) → `ProductViewer`
diffs it → `ConfiguratorScene.applyPaint / setVariant` → per-group `VisualStatus` → "Shown in 3D" labels.
Component swaps load variant GLBs once (cached), clone the slot node, mount it at the same anchor
with the same local transform, and re-home anything mounted on anchors inside the old node.

**Selection → compatibility.** `evaluateCompatibility(selections)` runs the data-driven rules;
`conflictsFor` previews errors per option card; `suggestFixes` finds the closest-priced option that
resolves an error without introducing a new one.

**Checkout.** `toOrderConfiguration` (no prices) → `provider.quote()` (server: strict parse, price,
rules) → refuse incomplete/incompatible → `provider.cart.createCart()` (server prices each line by
variant id) → `checkout.checkoutUrl(cart)`.

## Persistence

`forgelab_config` cookie (30 days) holds selections + custom paint. Read on the server so the saved
build renders without a flash; always passed through `sanitizeConfiguration`. The commerce server
uses a *strict* parser instead (unknown ids are rejected, not defaulted).

## Future backend (Laravel/MySQL)

The frontend depends only on interfaces and JSON documents, so a Laravel API can take over:
catalog + compatibility rules (replace `config/*` with API data), pricing validation (replace the
Nitro quote route), saved configurations / history (store `forgelab.configuration/v1`),
bill of materials (from quote lines) and Shopify product/variant sync.
