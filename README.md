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
- Configuration saved in a cookie — survives reloads, rendered server-side
- Reset to defaults
- Interactive Three.js viewer: orbit, zoom, reset view, loading progress, error handling
- Real-time frame paint (presets + custom colour, matte / gloss / metallic) without reloading the scene
- Genuine 3D part replacement for wheels, handlebar, stem and saddle; bar-tape colour; every
  option states whether it is shown in 3D (frame type, size and groupset are not)
- Original procedural road-bike model (generated in code, see `docs/asset-requirements.md`) with
  named components, mount anchors and an asset-mapping layer that reports missing parts

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for structure and project rules.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Nuxt app, premium UI, 7-step navigation, mock data, pricing engine | Done |
| 2 | 3D model (original procedural GLB), inspection utility, asset mapping, viewer | Done |
| 3 | Frame material switching, component replacement, pricing/swap tests | Done |
| 4 | Compatibility rules, JSON export, responsive polish (sticky viewer) | Done |
| 5 | Commerce/Shopify architecture + docs, QA, performance, demo prep, deployment | Next |
