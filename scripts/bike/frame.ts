/**
 * Frame, fork and seatpost + anchor positions.
 * Geometry is loosely based on a size-M race road bike (73° head, 73.5° seat, ~990 mm wheelbase).
 */
import { Group, Object3D, SphereGeometry, Vector3 } from 'three'
import { deg, part, profileTube, v } from './geometry'
import { MATERIALS } from './materials'

export const GEO = (() => {
  const bb = v(0, 0.27)
  const rearAxle = v(-0.405, 0.34)
  const frontAxle = v(0.585, 0.34)
  const headDown = v(Math.cos(deg(73)), -Math.sin(deg(73)))
  const steerUp = headDown.clone().negate()
  const seatDir = v(-Math.cos(deg(73.5)), Math.sin(deg(73.5)))
  const headTop = v(0.385, 0.825)
  const headBottom = headTop.clone().addScaledVector(headDown, 0.15)
  const seatTop = bb.clone().addScaledVector(seatDir, 0.5)
  const postTop = seatTop.clone().addScaledVector(seatDir, 0.17)
  return {
    bb,
    rearAxle,
    frontAxle,
    headDown,
    steerUp,
    seatDir,
    headTop,
    headBottom,
    seatTop,
    postTop,
    /** Top of the headset cover — the stem's mounting point. */
    stemMount: headTop.clone().addScaledVector(steerUp, 0.012),
    saddleMount: postTop.clone().add(v(0, 0.012)),
  }
})()

const z = (p: Vector3, zz: number) => p.clone().setZ(zz)

export function buildFrame(): Group {
  const { bb, rearAxle, frontAxle, headDown, steerUp, seatDir, headTop, headBottom, seatTop } = GEO
  const paint: ReturnType<typeof profileTube>[] = []
  const dark: ReturnType<typeof profileTube>[] = []

  // Main triangle (aero profiles: narrow laterally, deep fore-aft)
  paint.push(profileTube(headBottom.clone().addScaledVector(headDown, 0.005), headTop, 0.048, 0.06, { taper: 0.86 })) // head tube
  paint.push(profileTube(bb, headBottom.clone().addScaledVector(steerUp, 0.03), 0.046, 0.062)) // down tube
  paint.push(profileTube(seatTop.clone().addScaledVector(seatDir, -0.01), headTop.clone().addScaledVector(headDown, 0.03), 0.032, 0.036, { taper: 1.12 })) // top tube
  paint.push(profileTube(bb, seatTop, 0.03, 0.05, { taper: 0.9 })) // seat tube
  paint.push(profileTube(z(bb, -0.043), z(bb, 0.043), 0.047, 0.047)) // BB shell
  const cluster = new SphereGeometry(0.019, 24, 16)
  cluster.translate(seatTop.x, seatTop.y, 0)
  paint.push(cluster)

  // Rear triangle
  const stayJunction = bb.clone().addScaledVector(seatDir, 0.43)
  for (const s of [-1, 1]) {
    paint.push(profileTube(z(bb, 0.036 * s), z(rearAxle, 0.062 * s), 0.02, 0.03, { taper: 0.72 })) // chainstay
    paint.push(profileTube(z(stayJunction, 0.016 * s), z(rearAxle, 0.062 * s), 0.014, 0.02, { taper: 0.85 })) // seatstay
    paint.push(profileTube(z(rearAxle, 0.054 * s), z(rearAxle, 0.068 * s), 0.036, 0.036)) // dropout
  }
  dark.push(profileTube(z(rearAxle, -0.075), z(rearAxle, 0.075), 0.012, 0.012)) // thru-axle

  return part('frame_main', [
    [MATERIALS.paintFrame, paint],
    [MATERIALS.groupset, dark],
  ])
}

export function buildFork(): Group {
  const { frontAxle, headDown, headTop, headBottom, steerUp } = GEO
  const crown = headBottom.clone().addScaledVector(headDown, 0.012)
  const paint = [
    profileTube(z(crown, -0.05), z(crown, 0.05), 0.05, 0.032), // crown
    profileTube(headTop, headTop.clone().addScaledVector(steerUp, 0.012), 0.05, 0.05), // headset cover
  ]
  for (const s of [-1, 1]) {
    paint.push(profileTube(z(crown, 0.034 * s), z(frontAxle, 0.05 * s), 0.022, 0.036, { taper: 0.62 }))
    paint.push(profileTube(z(frontAxle, 0.046 * s), z(frontAxle, 0.058 * s), 0.03, 0.03))
  }
  const dark = [profileTube(z(frontAxle, -0.062), z(frontAxle, 0.062), 0.012, 0.012)]
  return part('fork', [
    [MATERIALS.paintFrame, paint],
    [MATERIALS.groupset, dark],
  ])
}

export function buildSeatpost(): Group {
  const { seatTop, seatDir, postTop } = GEO
  const post = profileTube(seatTop.clone().addScaledVector(seatDir, -0.03), postTop, 0.025, 0.042)
  const head = profileTube(z(postTop, -0.016), z(postTop, 0.016), 0.05, 0.02)
  return part('seatpost', [[MATERIALS.carbonMatte, [post, head]]])
}

/** Empty node marking where a swappable component mounts. */
export function anchor(name: string, position: Vector3): Object3D {
  const o = new Object3D()
  o.name = `anchor_${name}`
  o.position.copy(position)
  return o
}
