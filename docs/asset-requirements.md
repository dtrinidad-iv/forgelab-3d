# Asset requirements

## Current asset: ForgeLab procedural model

No properly licensed third-party road-bike model was downloadable without an account (Sketchfab
requires sign-in; no-login sources such as Poly Pizza only offered low-poly single-mesh bikes).
The bike is therefore an **original asset generated in code** by `scripts/bike/` — no third-party
geometry. It is labelled "ForgeLab procedural model" in the viewer and must never be presented as
a scanned or artist-made model.

```bash
npm run generate:bike                                   # writes public/models/bicycle/**
npm run inspect:glb -- public/models/bicycle/road-bike.glb --out docs/asset-report.md
```

| File | Contents |
|---|---|
| `road-bike.glb` | Default assembled bike (Aero frame, carbon-climbing wheels, alloy stem, carbon-ergo bar, race saddle) |
| `components/frame-<id>.glb` | `aero-carbon`, `endurance-carbon`, `titanium`, `steel` — nodes `frame_main` (with mount anchors), `fork`, `seatpost` |
| `components/wheels-<id>.glb` | `alloy`, `carbon-climbing`, `carbon-deep` — nodes `wheel_front`, `wheel_rear` (+ `tire_*`) |
| `components/handlebar-<id>.glb` | `alloy-compact`, `carbon-ergo`, `carbon-aero` — node `handlebar` (+ `bar_tape`, shifters) |
| `components/stem-<id>.glb` | `alloy`, `carbon` — node `stem` (+ `anchor_handlebar`) |
| `components/saddle-<id>.glb` | `comfort`, `short-nose`, `race-carbon` — node `saddle` |
| `manifest.json` | Generated file list with sizes and triangle counts |

Full hierarchy, materials and per-mesh counts: [`asset-report.md`](./asset-report.md).

## Asset contract

- **Format:** glTF Binary (`.glb`), metres, +Y up, +X forward, drive side +Z, wheels resting on y = 0.
- **Logical components** (resolved through `app/config/assetMap.ts`, never hard-coded):
  `frame_main, fork, wheel_front, wheel_rear, tire_front, tire_rear, crankset, cassette, chain,
  derailleur_front, derailleur_rear, handlebar, stem, bar_tape, saddle, seatpost, brake_front, brake_rear`
- **Anchors** — empty nodes marking where swappable parts mount; a part is the anchor's child, and
  its local origin is the mount point. Wheel, stem and saddle anchors live inside `frame_main`, so a
  frame swap carries the mounted parts across. Frames share hard points (BB, axles, head/seat angles,
  saddle height) and differ in head-tube height, top-tube slope, tube profiles, fork, seatpost and lugs:
  `anchor_wheel_front`, `anchor_wheel_rear` (axle centres), `anchor_stem` (headset top),
  `anchor_handlebar` (inside the stem, at the bar clamp), `anchor_saddle` (seatpost clamp).
- **Materials by name:** `paint_frame` (frame + fork, repainted at runtime), `bar_tape` (recoloured).
  Others: `carbon_matte`, `carbon_gloss`, `alloy_silver`, `alloy_dark`, `groupset_metal`,
  `chain_steel`, `rotor_steel`, `rubber_tyre`, `rubber_hood`, `saddle_cover`.
- **No textures.** Carbon is a visual approximation (colour, roughness, clearcoat) — no weave maps.

## How selections reach the model

`app/config/assetMap.ts` → `visuals` declares, per configurator group, how it is shown:

| Group | 3D behaviour |
|---|---|
| Paint | `kind: 'paint'` — one shared `MeshPhysicalMaterial` replaces every `paint_frame` material; colour, roughness, metalness and clearcoat animate. |
| Frame, wheels, handlebar, stem, saddle | `kind: 'component'` — variant GLB loaded once, slot node cloned and mounted in place (local transform preserved); detached parts are cached for instant re-selection; parts on anchors inside a replaced node move to the new node's anchor. |
| Bar tape | `kind: 'material'` — shared tape material recoloured. |
| Size, groupset | Not visualised; `notes` text is shown next to the options. |

`bakedVariants` records which options the base `road-bike.glb` already shows. Results come back
from `ConfiguratorScene` per group (`applied` / `loading` / `unsupported` / `missing-asset` / `error`)
and drive the "Shown in 3D" labels in the UI.

## Using a third-party model instead

1. Licence must allow commercial use: CC0 or CC BY (credit the author in the viewer and docs).
2. Ideally: separate meshes for frame, fork, wheels, bar, stem, saddle; frame on its own material.
3. Drop it in `public/models/bicycle/`, run `npm run inspect:glb -- <file>`.
4. Add a `ModelAssetMap` in `app/config/assetMap.ts` listing candidate node/material names per
   component. Anything not found is reported as missing — the UI must not claim it changes.

## Performance

`road-bike.glb` ≈ 2.5 MB, ~71k triangles, 34 meshes, 11 materials, no textures. Compression
(Meshopt / Draco) will be evaluated against this actual file in Phase 5; KTX2 is irrelevant while
there are no textures.
