# ForgeLab 3D — Project Rules

Premium road-bicycle configurator. Original brand: **ForgeLab**. Seven guided steps:
Frame → Size → Paint → Groupset → Wheels → Cockpit → Review.

## Stack
- **Nuxt 3** (pinned `^3`, do not upgrade to Nuxt 4 without an explicit decision) · Vue 3 `<script setup lang="ts">`
- **TypeScript** strict (`npm run typecheck` must pass with 0 errors)
- **Three.js** (+ `three/addons/*`) for the viewer
- **Tailwind CSS** via `@nuxtjs/tailwindcss` (v3), fonts via `@nuxt/fonts` (Inter, Space Grotesk)
- **Blender** for 3D assets, exported as `.glb`
- Package manager: **npm**

## Commands
- `npm run dev` — dev server on http://localhost:3000
- `npm run typecheck` — vue-tsc
- `npm run build` / `npm run preview` — production build

## Structure
```
app.vue                      Root (NuxtPage)
pages/index.vue              Configurator layout (header, viewer, steps, summary, nav)
components/                  Auto-imported WITHOUT path prefix (<StepNav>, not <ConfiguratorStepNav>)
  brand/                     Logo and brand atoms
  configurator/              StepNav, OptionGrid, OptionCard, BuildSummary, PriceDisplay, StepFooter, ReviewPanel
  viewer/ProductViewer.vue   Reusable Three.js viewer (client-only)
composables/useConfigurator.ts   Single source of truth: step, selections, total price (useState)
data/catalog.ts              Steps, options, prices, defaults — ALL catalog data lives here
types/configurator.ts        Domain types
lib/three/                   Framework-agnostic Three.js helpers (scene, loading, placeholder, disposal)
public/models/bicycle/       GLB assets (expected: road-bike.glb)
assets/css/main.css          Tailwind entry + base layer
```

## Rules
1. **Work incrementally.** After each meaningful change: run the app, run `npm run typecheck`, fix errors before moving on. Do not build features beyond what is asked.
2. **Three.js is client-only.** Wrap viewers in `<ClientOnly>`. Never touch `window`/WebGL during SSR.
3. **Never put Three.js objects in Vue reactivity** (`ref`, `reactive`, Pinia). Keep them in plain `let` variables inside the component / helpers.
4. **Always clean up.** On unmount: cancel rAF, disconnect observers, dispose controls, geometries, materials, textures, PMREM/env maps, renderer (+ `forceContextLoss`), remove the canvas. Use `lib/three/dispose.ts`.
5. **No fake component replacement.** Selections must not visually swap/tint 3D parts until the real GLB with named nodes exists. The placeholder must stay clearly labelled as temporary in code and UI.
6. **Catalog data only in `data/catalog.ts`.** Components read via `useConfigurator()`. Prices in EUR; frame price is the base, others are deltas.
7. **Original content only.** No real bicycle/component brand names, logos or trademarks.
8. **Styling:** Tailwind utilities with the brand tokens in `tailwind.config.ts` (`ink`, `graphite`, `bone`, `forge`; `font-display`, `ease-premium`). No ad-hoc hex colours in components (catalog swatches excepted).
9. **Accessibility:** option cards are `role="radio"` inside a `radiogroup`; keep visible focus rings; respect keyboard navigation.
10. **Responsive:** verify at 390 px and 1440 px widths.

## 3D asset conventions (Blender → glTF)
- Export **glTF Binary (.glb)**, **+Y up**, **metres**, apply transforms, wheels resting on the ground plane.
- File: `public/models/bicycle/road-bike.glb`.
- Name nodes per swappable component so they match `modelNode` in `data/catalog.ts`
  (e.g. `frame_aero_r1`, `wheels_c45`, `groupset_pro`, `cockpit_integrated`).
- Paintable surfaces use a dedicated material named `paint_primary` / `paint_secondary`.
- Target < 8 MB. If using Draco/Meshopt compression, add the decoder in `lib/three/loadModel.ts`.
