/**
 * Stems and handlebars.
 * Stem origin = steerer mount (anchor_stem); it contains `anchor_handlebar` at its bar clamp.
 * Handlebar origin = bar clamp centre; bar runs along Z, drops extend forward (+X) and down.
 * Bar tape (`bar_tape`) and shifters are children of the handlebar.
 */
import { Group, type Material, Vector3 } from 'three'
import { anchor, GEO } from './frame'
import { deg, part, profileTube, tubeAlong, v } from './geometry'
import { MATERIALS } from './materials'

// ---------------- Stems ----------------

export interface StemSpec {
  id: string
  length: number
  /** Angle above horizontal, degrees. */
  angle: number
  material: Material
  square: boolean
}

export const STEMS: StemSpec[] = [
  { id: 'alloy', length: 0.11, angle: 11, material: MATERIALS.alloySilver, square: false },
  { id: 'carbon', length: 0.11, angle: 7, material: MATERIALS.carbonMatte, square: true },
]

export function buildStem(spec: StemSpec): Group {
  const up = GEO.steerUp
  const clampCentre = up.clone().multiplyScalar(0.021)
  const end = clampCentre.clone().add(v(Math.cos(deg(spec.angle)) * spec.length, Math.sin(deg(spec.angle)) * spec.length))

  const body = spec.square
    ? profileTube(clampCentre, end, 0.03, 0.032, { radialSegments: 4 })
    : profileTube(clampCentre, end, 0.028, 0.03, { taper: 0.9 })

  const geos = [
    profileTube(v(0, 0), up.clone().multiplyScalar(0.042), 0.04, 0.04), // steerer clamp
    profileTube(up.clone().multiplyScalar(0.042), up.clone().multiplyScalar(0.047), 0.034, 0.034), // top cap
    body,
    profileTube(end.clone().setZ(-0.022), end.clone().setZ(0.022), 0.042, 0.042), // bar clamp
  ]
  const stem = part('stem', [[spec.material, geos]])
  stem.add(anchor('handlebar', end))
  return stem
}

// ---------------- Handlebars ----------------

export interface HandlebarSpec {
  id: string
  /** Half-width at the hoods / at the drop ends (m). */
  hoods: number
  drops: number
  reach: number
  drop: number
  flatTops: null | { foreAft: number; thickness: number }
  material: Material
}

export const HANDLEBARS: HandlebarSpec[] = [
  { id: 'alloy-compact', hoods: 0.2, drops: 0.2, reach: 0.072, drop: 0.124, flatTops: null, material: MATERIALS.alloySilver },
  { id: 'carbon-ergo', hoods: 0.2, drops: 0.206, reach: 0.08, drop: 0.128, flatTops: { foreAft: 0.034, thickness: 0.015 }, material: MATERIALS.carbonMatte },
  { id: 'carbon-aero', hoods: 0.18, drops: 0.205, reach: 0.085, drop: 0.13, flatTops: { foreAft: 0.048, thickness: 0.011 }, material: MATERIALS.carbonGloss },
]

/** Right-hand (+Z) bar path from the inner tops to the drop end. */
function barPath(spec: HandlebarSpec): Vector3[] {
  const { hoods: W, drops: D, reach: R, drop: H } = spec
  const flare = (t: number) => W + (D - W) * t
  return [
    v(0, 0, W - 0.034),
    v(0.012, 0, W - 0.006),
    v(0.035, 0, W),
    v(R - 0.01, 0, W),
    v(R + 0.022, -0.03, flare(0.2)),
    v(R + 0.025, -0.07, flare(0.5)),
    v(R, -H + 0.016, flare(0.8)),
    v(R - 0.04, -H, D),
    v(R - 0.12, -H, D),
  ]
}

const mirror = (pts: Vector3[]) => pts.map((p) => p.clone().setZ(-p.z))

function buildShifter(spec: HandlebarSpec, side: 1 | -1): Group {
  const W = spec.hoods
  const h = v(spec.reach + 0.004, 0.012, W * side)
  const hood = profileTube(h.clone().add(v(-0.032, -0.006)), h.clone().add(v(0.036, 0.016)), 0.028, 0.036, { taper: 0.62 })
  const lever = tubeAlong([h.clone().add(v(0.028, 0.004)), h.clone().add(v(0.046, -0.04)), h.clone().add(v(0.04, -0.092)), h.clone().add(v(0.026, -0.118))], 0.0055, { radialSegments: 8 })
  return part(side === 1 ? 'shifter_right' : 'shifter_left', [
    [MATERIALS.hood, [hood]],
    [MATERIALS.carbonMatte, [lever]],
  ])
}

export function buildHandlebar(spec: HandlebarSpec): Group {
  const right = barPath(spec)
  const left = mirror(right)
  const bar = [profileTube(v(0, 0, -0.052), v(0, 0, 0.052), 0.0318, 0.0318)] // clamp section
  const tape = []

  if (spec.flatTops) {
    const t = spec.flatTops
    bar.push(profileTube(v(0, 0, -(spec.hoods - 0.012)), v(0, 0, spec.hoods - 0.012), t.foreAft, t.thickness))
    bar.push(tubeAlong(right, 0.0119), tubeAlong(left, 0.0119))
    tape.push(tubeAlong(right.slice(2), 0.0136), tubeAlong(mirror(right.slice(2)), 0.0136))
  } else {
    const full = [...left.slice().reverse(), v(0, 0, 0), ...right]
    bar.push(tubeAlong(full, 0.0119, { segments: 360 }))
    const tapeRight = [v(0, 0, 0.06), ...right]
    tape.push(tubeAlong(tapeRight, 0.0136), tubeAlong(mirror(tapeRight), 0.0136))
  }

  const handlebar = part('handlebar', [[spec.material, bar]])
  handlebar.add(part('bar_tape', [[MATERIALS.barTape, tape]]))
  // Bar-end plugs
  const plugs = [right, left].map((p) => {
    const end = p[p.length - 1]!
    return profileTube(end, end.clone().add(v(-0.006, 0)), 0.026, 0.026)
  })
  handlebar.add(part('bar_plugs', [[MATERIALS.groupset, plugs]]))
  handlebar.add(buildShifter(spec, 1), buildShifter(spec, -1))
  return handlebar
}

