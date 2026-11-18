/**
 * Wheelsets. Each wheel's local origin is its axle centre (mounts on anchor_wheel_front/rear).
 * Disc rotor on the non-drive side (−Z). Tyre is a child node (tire_front / tire_rear).
 */
import { type BufferGeometry, ExtrudeGeometry, Group, LatheGeometry, type Material, Path, Shape, TorusGeometry, Vector2 } from 'three'
import { part, profileTube, v } from './geometry'
import { MATERIALS } from './materials'

export interface WheelsetSpec {
  id: string
  rimDepth: number
  rimMaterial: Material
  spokeMaterial: Material
  hubMaterial: Material
  spokes: number
}

export const WHEELSETS: WheelsetSpec[] = [
  { id: 'alloy', rimDepth: 0.026, rimMaterial: MATERIALS.alloySilver, spokeMaterial: MATERIALS.alloySilver, hubMaterial: MATERIALS.alloySilver, spokes: 28 },
  { id: 'carbon-climbing', rimDepth: 0.035, rimMaterial: MATERIALS.carbonMatte, spokeMaterial: MATERIALS.groupset, hubMaterial: MATERIALS.groupset, spokes: 24 },
  { id: 'carbon-deep', rimDepth: 0.06, rimMaterial: MATERIALS.carbonGloss, spokeMaterial: MATERIALS.groupset, hubMaterial: MATERIALS.groupset, spokes: 20 },
]

const BEAD_RADIUS = 0.311 // ISO 622 bead seat
const TYRE_SECTION = 0.0145

function rimGeometry(depth: number) {
  const r = BEAD_RADIUS
  const inner = r - depth
  const profile = [
    new Vector2(r + 0.001, -0.0125),
    new Vector2(r - depth * 0.35, -0.0138),
    new Vector2(r - depth * 0.75, -0.0118),
    new Vector2(inner + 0.002, -0.006),
    new Vector2(inner, 0),
    new Vector2(inner + 0.002, 0.006),
    new Vector2(r - depth * 0.75, 0.0118),
    new Vector2(r - depth * 0.35, 0.0138),
    new Vector2(r + 0.001, 0.0125),
    new Vector2(r + 0.001, -0.0125),
  ]
  const g = new LatheGeometry(profile, 128)
  g.rotateX(Math.PI / 2) // lathe axis Y → axle Z
  return g
}

function rotorGeometry() {
  const outer = new Shape().absarc(0, 0, 0.08, 0, Math.PI * 2, false)
  outer.holes.push(new Path().absarc(0, 0, 0.064, 0, Math.PI * 2, true))
  const ring = new ExtrudeGeometry(outer, { depth: 0.0018, bevelEnabled: false, curveSegments: 64 })
  ring.translate(0, 0, -0.047)
  const parts: BufferGeometry[] = [ring]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    parts.push(profileTube(v(Math.cos(a) * 0.02, Math.sin(a) * 0.02, -0.046), v(Math.cos(a + 0.35) * 0.066, Math.sin(a + 0.35) * 0.066, -0.046), 0.0022, 0.009))
  }
  return parts
}

function buildWheel(spec: WheelsetSpec, position: 'front' | 'rear'): Group {
  const isRear = position === 'rear'
  const hubHalf = isRear ? 0.062 : 0.05
  const flangeZ = isRear ? [-0.034, 0.024] : [-0.03, 0.03]
  const spokeEnd = BEAD_RADIUS - spec.rimDepth - 0.001

  const hub = [
    profileTube(v(0, 0, -hubHalf), v(0, 0, hubHalf), 0.03, 0.03),
    ...flangeZ.map((fz) => profileTube(v(0, 0, fz - 0.002), v(0, 0, fz + 0.002), 0.056, 0.056)),
  ]

  const spokes = []
  for (let i = 0; i < spec.spokes; i++) {
    const a = (i / spec.spokes) * Math.PI * 2
    const side = i % 2
    const fz = flangeZ[side]!
    // Rear: tangential lacing; front: radial.
    const hubA = isRear ? a + (side ? 0.32 : -0.32) : a
    spokes.push(profileTube(v(Math.cos(hubA) * 0.026, Math.sin(hubA) * 0.026, fz), v(Math.cos(a) * spokeEnd, Math.sin(a) * spokeEnd, 0), 0.0022, 0.0022, { radialSegments: 6 }))
  }

  const wheel = part(`wheel_${position}`, [
    [spec.rimMaterial, [rimGeometry(spec.rimDepth)]],
    [spec.spokeMaterial, spokes],
    [spec.hubMaterial, hub],
    [MATERIALS.rotor, rotorGeometry()],
  ])

  const tyreGeo = new TorusGeometry(BEAD_RADIUS + TYRE_SECTION, TYRE_SECTION, 24, 160)
  const tyre = part(`tire_${position}`, [[MATERIALS.tyre, [tyreGeo]]])
  wheel.add(tyre)
  return wheel
}

/** Returns a group whose children are `wheel_front` and `wheel_rear`, both at the origin. */
export function buildWheelset(spec: WheelsetSpec): Group {
  const g = new Group()
  g.name = `wheels_${spec.id}`
  g.add(buildWheel(spec, 'front'), buildWheel(spec, 'rear'))
  return g
}
