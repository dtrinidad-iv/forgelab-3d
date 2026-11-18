/**
 * Crankset, cassette, chain, derailleurs and brake calipers (drive side = +Z).
 */
import { ExtrudeGeometry, Group, Path, Shape, Vector3 } from 'three'
import { GEO } from './frame'
import { arc, between, deg, part, profileTube, tubeAlong, v } from './geometry'
import { MATERIALS } from './materials'

const CHAINLINE = 0.046
const pitchRadius = (teeth: number) => (0.0127 / 2) / Math.sin(Math.PI / teeth)

function chainring(teeth: number, z: number) {
  const r = pitchRadius(teeth)
  const shape = new Shape()
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2
    const rr = i % 2 === 0 ? r + 0.0032 : r - 0.0012
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  shape.holes.push(new Path().absarc(0, 0, r - 0.02, 0, Math.PI * 2, true))
  const g = new ExtrudeGeometry(shape, { depth: 0.0028, bevelEnabled: false, curveSegments: 48 })
  g.translate(GEO.bb.x, GEO.bb.y, z)
  return g
}

export function buildCrankset(): Group {
  const { bb } = GEO
  const rings = [chainring(52, CHAINLINE + 0.002), chainring(36, CHAINLINE - 0.006)]
  const spider = [0, 1, 2, 3].map((k) => {
    const a = deg(45 + k * 90)
    return profileTube(bb.clone().setZ(CHAINLINE + 0.004), v(bb.x + Math.cos(a) * 0.088, bb.y + Math.sin(a) * 0.088, CHAINLINE + 0.004), 0.006, 0.018, { taper: 0.6 })
  })
  const armAngle = deg(-18)
  const armDir = v(Math.cos(armAngle), Math.sin(armAngle))
  const armLen = 0.1725
  const driveEnd = bb.clone().addScaledVector(armDir, armLen)
  const nonDriveEnd = bb.clone().addScaledVector(armDir, -armLen)
  const arms = [
    profileTube(bb.clone().setZ(0.06), driveEnd.clone().setZ(0.074), 0.016, 0.034, { taper: 0.62 }),
    profileTube(bb.clone().setZ(-0.06), nonDriveEnd.clone().setZ(-0.074), 0.016, 0.034, { taper: 0.62 }),
    profileTube(bb.clone().setZ(-0.064), bb.clone().setZ(0.064), 0.024, 0.024), // spindle
  ]
  const pedals = [
    [driveEnd, 1],
    [nonDriveEnd, -1],
  ].flatMap(([p, s]) => {
    const end = p as Vector3
    const side = s as number
    return [
      profileTube(end.clone().setZ(0.076 * side), end.clone().setZ(0.13 * side), 0.012, 0.012), // pedal axle
      profileTube(end.clone().add(v(-0.04, 0, 0.105 * side)), end.clone().add(v(0.045, 0, 0.105 * side)), 0.06, 0.016, { radialSegments: 8 }), // body
    ]
  })
  return part('crankset', [
    [MATERIALS.groupset, [...rings, ...spider]],
    [MATERIALS.carbonMatte, arms],
    [MATERIALS.alloyDark, pedals],
  ])
}

const COGS = [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30, 34]
const cogZ = (i: number) => 0.0605 - i * 0.0035
const CHAIN_COG = 5 // 17T

export function buildCassette(): Group {
  const { rearAxle } = GEO
  const cogs = COGS.map((teeth, i) => {
    const r = pitchRadius(teeth) + 0.002
    return profileTube(rearAxle.clone().setZ(cogZ(i) - 0.0009), rearAxle.clone().setZ(cogZ(i) + 0.0009), r * 2, r * 2, { radialSegments: 48 })
  })
  return part('cassette', [[MATERIALS.alloySilver, cogs]])
}

const PULLEY_R = 0.017
function pulleyCentres() {
  const { rearAxle } = GEO
  const cogR = pitchRadius(COGS[CHAIN_COG]!)
  const upper = v(rearAxle.x - PULLEY_R + 0.002, rearAxle.y - cogR - 0.03)
  const lower = v(upper.x + 0.022, upper.y - 0.072)
  return { upper, lower, cogR }
}

export function buildChain(): Group {
  const { bb, rearAxle } = GEO
  const ringR = pitchRadius(52)
  const { upper, lower, cogR } = pulleyCentres()
  const z = CHAINLINE + 0.003
  const ringTop = v(bb.x, bb.y + ringR, z)
  const cogTop = v(rearAxle.x, rearAxle.y + cogR, z)
  const ringBottom = v(bb.x, bb.y - ringR, z)
  const lowerBottom = v(lower.x, lower.y - PULLEY_R, z)

  const pts: Vector3[] = [
    ringTop,
    ...between(ringTop, cogTop, 6),
    ...arc(rearAxle.clone().setZ(z), cogR, 90, 270, 10),
    ...arc(upper.clone().setZ(z), PULLEY_R, 10, -100, 5),
    ...arc(lower.clone().setZ(z), PULLEY_R, 170, 270, 5),
    ...between(lowerBottom, ringBottom, 6),
    ...arc(bb.clone().setZ(z), ringR, -90, 80, 18),
  ]
  const chain = tubeAlong(pts, 0.0034, { closed: true, segments: 720, radialSegments: 6 })
  return part('chain', [[MATERIALS.chain, [chain]]])
}

export function buildRearDerailleur(): Group {
  const { rearAxle } = GEO
  const { upper, lower } = pulleyCentres()
  const geos = [
    ...[upper, lower].map((c) => profileTube(c.clone().setZ(CHAINLINE - 0.004), c.clone().setZ(CHAINLINE + 0.01), PULLEY_R * 2, PULLEY_R * 2, { radialSegments: 24 })),
    profileTube(upper.clone().setZ(CHAINLINE + 0.013), lower.clone().setZ(CHAINLINE + 0.013), 0.004, 0.034), // outer cage plate
    profileTube(upper.clone().add(v(0, 0.01, CHAINLINE + 0.016)), rearAxle.clone().add(v(0.006, -0.012, 0.072)), 0.022, 0.03), // body
    profileTube(rearAxle.clone().add(v(0.006, -0.012, 0.064)), rearAxle.clone().add(v(0.006, -0.012, 0.08)), 0.03, 0.03), // knuckle
  ]
  return part('derailleur_rear', [[MATERIALS.groupset, geos]])
}

export function buildFrontDerailleur(): Group {
  const p = GEO.bb.clone().addScaledVector(GEO.seatDir, 0.165)
  const geos = [
    profileTube(p.clone().setZ(0.016), p.clone().setZ(0.05), 0.022, 0.024), // mount
    profileTube(p.clone().add(v(-0.03, -0.004, 0.056)), p.clone().add(v(0.045, -0.026, 0.056)), 0.004, 0.024), // cage
  ]
  return part('derailleur_front', [[MATERIALS.groupset, geos]])
}

function caliper(name: string, centre: Vector3) {
  return part(name, [[MATERIALS.groupset, [profileTube(centre.clone().setZ(-0.034), centre.clone().setZ(-0.06), 0.052, 0.03)]]])
}

export function buildBrakes(): Group[] {
  const { frontAxle, rearAxle } = GEO
  return [
    caliper('brake_front', frontAxle.clone().add(v(Math.cos(deg(150)) * 0.072, Math.sin(deg(150)) * 0.072))),
    caliper('brake_rear', rearAxle.clone().add(v(Math.cos(deg(28)) * 0.072, Math.sin(deg(28)) * 0.072))),
  ]
}
