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
npm run build && npm run preview
```

## What it does

- Seven guided steps: Frame, Size, Paint & finish, Groupset, Wheels, Cockpit & seating, Review
- Step completion states, required-selection validation (can't skip an incomplete step)
- Custom paint colour with matte / gloss / metallic finish
- Live price with per-component breakdown (USD, demo pricing)
- Configuration saved in a cookie — survives reloads, rendered server-side
- Reset to defaults
- Interactive Three.js viewer (orbit + zoom). Shows a labelled procedural placeholder until
  `public/models/bicycle/road-bike.glb` is provided

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for structure and project rules.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Nuxt app, premium UI, 7-step navigation, mock data, pricing engine | Done |
| 2 | Licensed GLB, inspection utility, real model in viewer | Next |
| 3 | Frame material switching, component replacement, pricing tests | Planned |
| 4 | Compatibility rules, JSON export, responsive polish | Planned |
| 5 | Commerce/Shopify architecture + docs, QA, performance, demo prep | Planned |
