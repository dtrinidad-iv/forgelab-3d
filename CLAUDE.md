# ForgeLab 3D — Project Rules

Premium custom road-bicycle configurator. Independent portfolio / technology demo.
Original brand: **ForgeLab**. Inspired by guided premium bike builders — never copy their code, branding, designs or images.
**Deadline: Thu 2026-11-19, 12:00 EST.** Prefer a working, impressive MVP over abstractions.

Seven steps: Frame → Size → Paint → Groupset → Wheels → Cockpit (handlebar, stem, bar tape, saddle) → Review.

## Stack
- **Nuxt 3** with `future.compatibilityVersion: 4` (source in `app/`, `public/` at root). Do not upgrade to Nuxt 4 without an explicit decision.
- Vue 3 `<script setup lang="ts">`, **TypeScript strict** (`npm run typecheck` must pass with 0 errors)
- **Tailwind CSS** (`@nuxtjs/tailwindcss`, v3), fonts via `@nuxt/fonts` (Inter, Space Grotesk)
- **Three.js** (GLTFLoader, OrbitControls, PBR materials) for the viewer
- Commerce: mock provider by default; **Shopify Storefront API** provider when `NUXT_PUBLIC_COMMERCE_PROVIDER=shopify` (server-side private token, no Shopify packages). See docs/shopify-integration.md.
- Backend (Laravel/MySQL): deferred. Frontend must not depend on it.
- Package manager: **npm**

## Commands
- `npm run dev` — http://localhost:3000
- `npm run typecheck` — app (vue-tsc) + Node scripts (`scripts/tsconfig.json`)
- `npm test` — Vitest: pricing, configuration, 3D swap engine (runs against the real GLBs)
- `npm run generate:bike` — regenerate the procedural bike GLBs into `public/models/bicycle/`
- `npm run inspect:glb -- <file.glb> [--out report.md]` — asset inspection report
- `npm run shopify:csv` — Shopify product import (`shopify/forgelab-products.csv`) from the catalog
- `npm run build` / `npm run preview` (stop `dev` first — Nuxt refuses to build while dev runs)

## Structure
```
app/
  pages/index.vue            Configurator layout
  pages/admin/index.vue      Studio: upload one-of-a-kind covers (NUXT_ADMIN_PASSWORD)
  pages/packing-slip.vue     Printable BOM (data handed over via localStorage)
  pages/how-its-built.vue    Case study for reviewers
  components/                Auto-imported WITHOUT path prefix (<StepNav>, not <BuilderStepNav>)
    builder/                 Step nav, option groups/cards, paint picker, summary, review, footer
    viewer/ProductViewer.vue Three.js viewer (client-only)
    ui/                      Brand atoms (logo)
  composables/
    useConfigurator.ts       Selections + custom paint state (useState)
    useConfiguratorSteps.ts  Step navigation, completion, required-selection validation, reset
    usePricing.ts            Reactive wrapper over utils/pricing.ts (+ displayTotal in the chosen currency)
    useCurrency.ts / useInventory.ts / usePieces.ts / useCommerce.ts   Currency cookie, stock, unique pieces, cart flow
    useCompatibility.ts      Reactive wrapper over utils/compatibility.ts (issues, card conflicts, fixes)
    useVisualStatus.ts       What the 3D viewer actually did per group
  config/catalog.ts          Steps, groups, options, prices, defaults — ALL catalog data
  config/compatibility.ts    FICTIONAL demo compatibility rules (data + checks)
  config/currency.ts, inventory.ts, shipping.ts   Demo FX rates, stock per SKU, region shipping rules
  config/assetMap.ts         Logical component ids → model nodes/materials; per-group visuals (variant GLBs, tape colours, notes)
  plugins/configuration-persistence.ts   Cookie persistence (SSR-safe)
  types/                     Domain types
  utils/                     Pure logic (no Vue): pricing, configuration, compatibility, exportConfiguration (forgelab.configuration/v1)
  utils/three/               Scene, loading, inspectModel, assetMapping, configuratorScene (paint + part swaps),
                             explodedView, ridePlayer (glTF "ride" clip), planarUv, lighting (presets), forgedPattern (procedural shader), ar (USDZ, WebXR, Scene Viewer intent),
                             assembleConfiguration + exportGlb (server-side model for Android AR), dispose, placeholder
server/api/ar/model.glb.get.ts  Assembles the exact configured bike as a plain GLB (Android Scene Viewer)
server/api/pieces, server/api/admin/pieces   Unique pieces (Nitro storage: Netlify Blobs live, .data/ locally)
tests/                       Vitest unit tests (Node)
scripts/bike/                Procedural bike generator (Node, tsx) — source of all GLBs
scripts/inspect-glb.ts       CLI inspector
public/models/bicycle/       Generated GLBs: road-bike.glb + components/*.glb + manifest.json
app/commerce/                CommerceProvider interfaces, catalog→variant mapping, mock provider/service, Shopify stub
server/api/commerce/         quote + cart routes (trusted pricing)
docs/                        architecture, configurator-guide, shopify-integration, asset-requirements, blender-workflow, performance, deployment
tests/ (planned)
```
Note: top-level files in `app/utils/` and `app/composables/` are auto-imported — keep export names unique.

## Rules
1. **Working method:** inspect → explain plan → list files → implement incrementally → run app → test → fix → summarize. Never claim a feature works without verifying it in the running app.
2. **Three.js is client-only** (`<ClientOnly>`). Never put Three.js objects in Vue reactivity (`ref`/`reactive`).
3. **Always dispose** geometries, materials, textures, env maps, controls and renderer on unmount (`utils/three/dispose.ts`). Material changes must not reload the scene.
4. **No fake 3D.** 3D status shown in the UI comes from `ConfiguratorScene` results (`useVisualStatus`), never from the selection itself. Never present a UI-only selection as a 3D change. If geometry/material for an option is missing, say so in the UI and in reports. The procedural placeholder must stay labelled as temporary.
5. **Asset mapping:** never assume GLB node names. Map logical ids (`frame_main`, `wheel_front`, …) to real nodes through the asset-mapping layer; handle missing nodes gracefully.
6. **Catalog data only in `app/config/`.** No prices in templates. Prices are USD, per component; total = sum.
7. **Client prices are display-only.** Commerce goes through `app/commerce` (`CommerceProvider`); the browser sends `OrderConfiguration` without prices; `server/api/commerce/*` strictly validates and prices. Real orders must be re-priced/validated server-side (Shopify variants or trusted service). Never put Shopify Admin secrets in browser code.
8. **Compatibility rules are fictional** and must only use the invented `attrs` in the catalog — never real manufacturer specs. Label them "demo rule" in the UI.
9. **Content:** all product names, specs and prices are fictional. Real brand names (e.g. groupset makers) may label demo options only, with the on-page disclaimer; never claim real specs or compatibility. No third-party logos.
10. **Persistence:** configuration lives in the `forgelab_config` cookie; always pass untrusted input through `sanitizeConfiguration`.
11. **Styling:** Tailwind brand tokens (`ink`, `graphite`, `bone`, `forge`; `font-display`, `ease-premium`). No ad-hoc hex colours in components (paint data excepted).
12. **Accessibility:** option cards are `role="radio"` in a `radiogroup`; visible focus rings; keyboard-operable.
13. **Responsive:** desktop = full-height sticky viewer left + configuration column right (stepper, options, pinned footer); mobile = sticky viewer (`--viewer-h`) that compacts on scroll. The bike must stay visible while choosing; verify at 390 px and 1440 px.

## 3D assets
- The bike is an ORIGINAL procedural asset from `scripts/bike/` (no licensed third-party model was obtainable).
  Label it as such; never present it as scanned/artist-made. Change geometry in the generator, then re-run it — never hand-edit GLBs.
- Contract (axes, anchors, component + material names): `docs/asset-requirements.md`.
- Swappable parts mount as children of `anchor_*` nodes; their local origin is the mount point. Wheel/stem/saddle anchors live inside `frame_main` so frame swaps carry them.
- Evaluate Draco / Meshopt / KTX2 against the actual model; don't apply blindly.
