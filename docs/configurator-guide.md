# Configurator guide

## Using it

Seven steps: **Frame → Size → Paint → Groupset → Wheels → Cockpit → Review**.

- Size starts empty (rider-specific) — you can't continue or skip ahead without it.
- Completed steps show a check; steps with a compatibility error show a red dot.
- Each option group says how it is **shown in 3D**. Every group changes the model: frame and size
  (frame geometry, bar and saddle height), paint, groupset (whole drivetrain), wheels, handlebar,
  stem, saddle and bar tape.
- Incompatible options are labelled on their cards; picking one shows a banner with one-click fixes.
- Layout: on desktop the bike fills the left side and the steps get the right column (stepper with
  progress, options, pinned footer with total + Previous/Next). On phones the bike shrinks while you
  scroll through options.
- The build is saved in a cookie for 30 days; **Reset** (inside "Your build") restores the defaults.
- Review: compatibility status, full spec sheet, **Download JSON / Copy**, **Add to cart** (demo store).
- Viewer: drag to rotate, scroll/pinch or −/+ to zoom, ↺ to reset the camera; **Explode** for the
  exploded assembly view; **Studio / Daylight / Dramatic** lighting presets; **View in AR** on
  phones (iPhone AR Quick Look; Android live AR, or Google Scene Viewer where live AR can't start)
  showing the exact build at real size.

## Changing the catalog

All data lives in `app/config/catalog.ts` (USD, per-component prices; total = sum).

- **New option:** add it to the group's array. Give it `attrs` if compatibility rules should see it.
- **3D for an option:** add its GLB to `visuals.<group>.variants` in `app/config/assetMap.ts`
  (generate it in `scripts/bike/`). Without a mapping the UI reports "No 3D model exists for this option".
- **New rule:** add an entry to `COMPATIBILITY_RULES` in `app/config/compatibility.ts` using only
  invented `attrs` (rules are fictional demo rules — never real manufacturer specs). Add a test.
- **Commerce:** new options get SKUs automatically via `app/commerce/catalogMap.ts`.

Run `npm test` and `npm run typecheck` after any change.

## Demo script (≈5 minutes)

1. **Open** — the bike is the centrepiece; the label says it is ForgeLab's own procedural model.
   Drag to rotate, zoom in on the drivetrain, press ↺.
2. **Frame** — switch Aero → Endurance → Steel → back to **Aero**. Point out the taller head tube and
   higher bars on Endurance, the level top tube and chrome lugs on Steel; wheels/stem/saddle stay mounted.
3. **Size** — press Next without choosing: required-selection validation. Pick XS then XL: the frame,
   bar height and saddle height change. Pick M.
4. **Paint** — Racing Red, then Custom Colour → pick a blue, switch Matte/Gloss/Metallic: live PBR
   changes, no reload. Then **Forged Pattern**: a procedural GPU shader (zoom in — no textures).
   Note the price changes.
5. **Groupset** — switch the three demo options: drivetrain finish changes; the 13-speed option
   has a 13-cog cassette.
6. **Wheels** — Carbon Deep-Section: real geometry swap ("Updating wheels…").
   Point at the Alloy card: "Not compatible with your Aero Carbon frame".
7. **Cockpit** — choose Carbon Aero bar → incompatibility banner → "Switch stem to Carbon": the stem
   swaps and the bar moves onto it. Tan leather tape; Comfort saddle → advisory recommendation.
8. **Review** — all-compatible status, auto-matched bottom bracket, Download JSON.
9. **Add to cart** — server validates and prices the build (SKUs, custom paint as line attributes),
   "Continue to checkout" explains the Shopify hand-off. Mention tampered requests are rejected.
10. **Reload** the page — the whole build (including 3D parts) comes back.
11. **Viewer tools** — Explode/Assemble, switch lighting presets, and on a phone tap **AR** to place
    the exact build in the room at 1:1.

Talking points: original brand/assets; honest 3D labels; server-side pricing; Shopify-ready
interfaces; 53 automated tests incl. swap tests against the real model files.
