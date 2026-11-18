# ForgeLab 3D

A premium custom road-bicycle configurator — an independent portfolio and technology demonstration.
ForgeLab is a fictional brand; all products, specs and prices are illustrative.

**Stack:** Nuxt 3 · Vue 3 · TypeScript · Tailwind CSS · Three.js

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm test
npm run build && npm run preview

npm run generate:bike                                 # regenerate the 3D assets
npm run inspect:glb -- public/models/bicycle/road-bike.glb
```

## What it does

- Seven guided steps: Frame, Size, Paint & finish, Groupset, Wheels, Cockpit & seating, Review
- Step completion states, required-selection validation (can't skip an incomplete step)
- Custom paint colour with matte / gloss / metallic finish
- Live price with per-component breakdown (USD, demo pricing)
- Fictional compatibility rules (tyre clearance, drivetrain speeds, bar clamp; advisory saddle fit;
  auto-matched bottom bracket) with card warnings and one-click fixes
- JSON export of the configuration (`forgelab.configuration/v1`): selections, price breakdown,
  compatibility results
- Add to cart through a `CommerceProvider`: the server re-validates and re-prices the build; the
  browser never sends prices. Mock store by default; with `NUXT_PUBLIC_COMMERCE_PROVIDER=shopify`
  every line is priced by a real Shopify store (Storefront API) and checkout is Shopify-hosted
  (`npm run shopify:csv` generates the product import)
- Meshopt-compressed 3D assets (8.5 MB → 2.1 MB), parallel loading of saved parts
- Configuration saved in a cookie — survives reloads, rendered server-side
- Reset to defaults
- Interactive Three.js viewer: orbit, zoom, reset view, loading progress, error handling
- **Exploded assembly view** (animated, works with part swaps), **lighting presets** (studio /
  daylight / dramatic)
- **Mobile AR at 1:1** of the exact configuration: iOS AR Quick Look with a USDZ exported in the
  browser; Android live WebXR placement, with Google Scene Viewer as fallback (GLB of the build
  assembled on the server, `/api/ar/model.glb`)
- **Forged Pattern** finish: procedural, anti-aliased GPU shader — 0 KB of textures
- Real-time frame paint (presets + custom colour, matte / gloss / metallic) without reloading the scene
- Every step is shown in 3D: 4 framesets × 5 sizes (frame geometry, bar and saddle height),
  3 demo groupsets (crankset, cassette incl. a real 13-cog option, chain, derailleurs), wheels,
  handlebar, stem, saddle, paint and bar tape — each option states what its 3D change is
- Original procedural road-bike model (generated in code, see `docs/asset-requirements.md`) with
  named components, mount anchors and an asset-mapping layer that reports missing parts
- **Ride animation**: an authored glTF animation clip in the GLB (cranks turn, wheels spin),
  played with `AnimationMixer`; keeps working through part swaps and the exploded view
- **Store features**: currency switcher (USD / CAD / EUR / GBP / JPY, fixed demo rates, priced by
  the server), stock per component (frame stock per size, low-stock and sold-out states), region
  shipping rules enforced at checkout, printable packing slip with bill of materials
- **One-of-a-kind pieces**: `/admin` (password-protected) uploads a photo of a unique saddle cover;
  it becomes a selectable option, is mapped onto the 3D saddle, and is sold as an inventory-of-one
  line (sold pieces can't be bought)
- **Case study page** at `/how-its-built` for reviewers

## Documentation

| Doc | |
|---|---|
| [architecture](docs/architecture.md) | Layers, data flow, future backend |
| [configurator-guide](docs/configurator-guide.md) | Using/extending the configurator + 5-minute demo script |
| [shopify-integration](docs/shopify-integration.md) | Shopify setup, Storefront API provider, known limits |
| [asset-requirements](docs/asset-requirements.md) | 3D asset contract, anchors, materials |
| [blender-workflow](docs/blender-workflow.md) | Preparing/replacing models in Blender |
| [performance](docs/performance.md) | Compression evaluation and loading strategy |
| [deployment](docs/deployment.md) | Free hosting and pre-share checklist |

Project rules and structure: [`CLAUDE.md`](./CLAUDE.md).

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Nuxt app, premium UI, 7-step navigation, mock data, pricing engine | Done |
| 2 | 3D model (original procedural GLB), inspection utility, asset mapping, viewer | Done |
| 3 | Frame material switching, component replacement, pricing/swap tests | Done |
| 4 | Compatibility rules, JSON export, responsive polish (sticky viewer) | Done |
| 5 | Commerce architecture + docs, performance, QA, demo prep, deployment prep | Done |
