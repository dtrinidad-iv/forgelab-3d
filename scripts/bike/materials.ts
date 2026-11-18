/**
 * Shared PBR materials. Names are part of the asset contract — the app finds the paintable
 * frame material by name (`paint_frame`), and bar tape by `bar_tape`.
 * No texture maps: carbon is a visual approximation (colour/roughness/clearcoat only).
 */
import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

function standard(name: string, color: number, roughness: number, metalness: number) {
  const m = new MeshStandardMaterial({ color, roughness, metalness })
  m.name = name
  return m
}

function physical(name: string, color: number, roughness: number, metalness: number, clearcoat: number, clearcoatRoughness = 0.06) {
  const m = new MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness })
  m.name = name
  return m
}

export const MATERIALS = {
  /** Frame + fork paint. Default = Gloss Black. Replaced at runtime by the paint system. */
  paintFrame: physical('paint_frame', 0x0b0c0e, 0.32, 0.1, 1, 0.04),
  carbonMatte: standard('carbon_matte', 0x17181b, 0.52, 0.25),
  carbonGloss: physical('carbon_gloss', 0x101113, 0.3, 0.3, 1, 0.08),
  alloySilver: standard('alloy_silver', 0xb9bdc3, 0.32, 1),
  alloyDark: standard('alloy_dark', 0x3a3d42, 0.38, 0.9),
  groupset: standard('groupset_metal', 0x2a2c30, 0.32, 0.85),
  chain: standard('chain_steel', 0x8e9298, 0.42, 1),
  tyre: standard('rubber_tyre', 0x161618, 0.88, 0),
  hood: standard('rubber_hood', 0x1e1f22, 0.72, 0),
  barTape: standard('bar_tape', 0x1b1b1d, 0.82, 0),
  saddle: standard('saddle_cover', 0x18181a, 0.62, 0.05),
  rotor: Object.assign(standard('rotor_steel', 0xc3c6cb, 0.28, 1), { side: DoubleSide }),
}
