# Performance

## 3D asset compression — measured on the actual model

`road-bike.glb` (70,832 triangles, 11 materials, no textures):

| Variant | Raw | gzip -9 | Decoder |
|---|---|---|---|
| Uncompressed | 2,500 KB | 716 KB | — |
| Quantize only | 1,466 KB | — | — |
| **Meshopt** (`EXT_meshopt_compression`, medium) | **539 KB** | **192 KB** | ~20 KB JS, bundled with three, no extra files |
| Draco | 240 KB | 180 KB | ~300 KB WASM/JS to host, worker-based decode |

**Decision: Meshopt.** Over the wire it is within ~12 KB of Draco, while Draco's decoder costs more
than that saving on a first visit, needs extra hosted files and decodes slower. Meshopt also works
in Node, so the swap-engine tests run against the real compressed files.
**KTX2** is not applicable — the models have no textures.

Result: base bike **2.5 MB → 627 KB**; every variant is loaded only when chosen (frames ~50–60 KB × 20 frame/size
combinations; groupsets ~180 KB; wheelsets ~150 KB;
handlebars ~130 KB; saddles 110–180 KB; stems ~10 KB). Compression runs inside
`npm run generate:bike` (`NO_COMPRESS=1` to disable).

## Loading

- One request per file (no HEAD pre-check); streamed download progress.
- Part files needed by a saved build are fetched **in parallel** with the base model; the swap
  engine reuses those in-flight downloads.
- Variant GLBs are loaded once; detached parts are kept for instant re-selection.
- The saved configuration is applied before the model is revealed (no flash of default parts).

## Rendering

- Pixel ratio capped at 2; render loop pauses when the tab is hidden.
- Shared materials (one paint material, one tape material) — paint changes never rebuild geometry.
- Geometry per part is merged per material at generation time (~30 draw calls for the bike).
- Neutral tone mapping for accurate paint colours.
- All GPU resources are disposed on unmount.

## Possible next steps

- Lower tube/spoke segment counts for mobile (largest remaining cost: wheels and bars).
- `<link rel="preload">` for `road-bike.glb`.
- Cache headers for `/models/**` once file names are content-hashed.
