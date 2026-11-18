# Blender workflow

The MVP does **not** require Blender: the bike is generated in code (`scripts/bike/`). Use Blender
when replacing it with an artist-made or licensed model, or when editing a third-party asset.

## Preparing a model

1. **Licence** — CC0 or CC BY (credit author + licence in the viewer label and `docs/asset-requirements.md`),
   or a commercial licence that allows web display.
2. **Units and axes** — metres; the bike's forward direction along +X after export (Blender −Y/+X
   conventions differ — check with `npm run inspect:glb`); wheels resting on the ground (Z = 0 in Blender).
3. **Separate objects** for every swappable component, named per `docs/asset-requirements.md`
   (`frame_main`, `fork`, `wheel_front`, `handlebar`, `stem`, `saddle`, …). Apply transforms
   (Ctrl+A → All Transforms) except where an object's origin must be its mount point.
4. **Mount points** — add Empties named `anchor_wheel_front`, `anchor_wheel_rear`, `anchor_stem`,
   `anchor_saddle` (children of `frame_main`) and `anchor_handlebar` (child of `stem`). Parent each
   swappable part to its anchor and set the part's origin to the mount point.
5. **Materials** — the frame/fork paint uses one material named `paint_frame`; bar tape `bar_tape`.
   Keep other materials named consistently (`carbon_matte`, `rubber_tyre`, …). Principled BSDF
   exports to glTF PBR; clearcoat exports via `KHR_materials_clearcoat`.
6. **Component variants** — one `.blend` collection per variant, exported to
   `public/models/bicycle/components/<slot>-<id>.glb`, each containing a node named after its slot
   at the origin.

## Export

File → Export → glTF 2.0: format **glTF Binary (.glb)**, Include: selected/visible objects,
Transform: **+Y Up**, Geometry: apply modifiers, normals on, tangents only if normal maps are used.
Leave Draco off — compress afterwards (below).

## After export

```bash
npm run inspect:glb -- public/models/bicycle/road-bike.glb     # names, materials, counts, bounds
npx @gltf-transform/cli meshopt in.glb out.glb                  # same compression as the generator
```

Then update `app/config/assetMap.ts` (candidate node names, materials, variant files, baked
variants) — the UI reports any component or material it cannot find.
