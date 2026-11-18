/**
 * Frame variants: frame, fork and seatpost + mount anchors.
 *
 * All variants share the same "hard points" so the drivetrain, brakes and wheels line up:
 * bottom bracket, both axles, head angle (73°), seat angle (73.5°), head-tube bottom and saddle
 * height. They differ in head-tube height (stack/reach), seat-tube length / top-tube slope, tube
 * profiles, fork, seatpost and lugs.
 *
 * Anchors (`anchor_wheel_*`, `anchor_stem`, `anchor_saddle`) live INSIDE `frame_main`, so replacing
 * the frame carries every mounted part across to the new frame's anchors.
 */
import { Group, type Material, Object3D, SphereGeometry, type BufferGeometry, Vector3 } from 'three'
import { deg, part, profileTube, v } from './geometry'
import { MATERIALS } from './materials'

/** Hard points shared by every frame variant (size M). */
export const GEO = (() => {
  const bb = v(0, 0.27)
  const headDown = v(Math.cos(deg(73)), -Math.sin(deg(73)))
  const seatDir = v(-Math.cos(deg(73.5)), Math.sin(deg(73.5)))
  const headBottom = v(0.385, 0.825).addScaledVector(headDown, 0.15)
  const postTop = bb.clone().addScaledVector(seatDir, 0.67)
  return {
    bb,
    rearAxle: v(-0.405, 0.34),
    frontAxle: v(0.585, 0.34),
    headDown,
    steerUp: headDown.clone().negate(),
    seatDir,
    headBottom,
    postTop,
    saddleMount: postTop.clone().add(v(0, 0.012)),
  }
})()

type Profile = [width: number, depth: number, taper?: number]

export interface FrameSpec {
  id: string
  /** Head tube length (m), measured up the steering axis from the shared head-tube bottom. */
  headTube: number
  /** Seat tube length (m), BB centre → top of seat tube. */
  seatTube: number
  /** Where the seatstays meet the seat tube (m from BB). */
  stayJunction: number
  tubes: { head: Profile; down: Profile; top: Profile; seat: Profile; chainstay: Profile; seatstay: Profile }
  fork: { leg: Profile; crownMaterial: Material }
  seatpost: { profile: Profile; material: Material }
  /** Classic brazed lugs (chrome sleeves at the joints). */
  lugs: boolean
}

export const FRAMES: FrameSpec[] = [
  {
    id: 'aero-carbon',
    headTube: 0.15,
    seatTube: 0.5,
    stayJunction: 0.43,
    tubes: { head: [0.048, 0.06, 0.86], down: [0.046, 0.062], top: [0.032, 0.036, 1.12], seat: [0.03, 0.05, 0.9], chainstay: [0.02, 0.03, 0.72], seatstay: [0.014, 0.02, 0.85] },
    fork: { leg: [0.022, 0.036, 0.62], crownMaterial: MATERIALS.paintFrame },
    seatpost: { profile: [0.025, 0.042], material: MATERIALS.carbonMatte },
    lugs: false,
  },
  {
    id: 'endurance-carbon',
    headTube: 0.19,
    seatTube: 0.47,
    stayJunction: 0.38,
    tubes: { head: [0.05, 0.052, 0.9], down: [0.05, 0.05], top: [0.034, 0.034, 1.05], seat: [0.032, 0.034], chainstay: [0.022, 0.026, 0.75], seatstay: [0.014, 0.016, 0.8] },
    fork: { leg: [0.022, 0.03, 0.66], crownMaterial: MATERIALS.paintFrame },
    seatpost: { profile: [0.0272, 0.0272], material: MATERIALS.carbonMatte },
    lugs: false,
  },
  {
    id: 'titanium',
    headTube: 0.16,
    seatTube: 0.52,
    stayJunction: 0.47,
    tubes: { head: [0.044, 0.044], down: [0.038, 0.038], top: [0.0318, 0.0318], seat: [0.0318, 0.0318], chainstay: [0.019, 0.022, 0.8], seatstay: [0.014, 0.014, 0.9] },
    fork: { leg: [0.022, 0.03, 0.66], crownMaterial: MATERIALS.paintFrame },
    seatpost: { profile: [0.0272, 0.0272], material: MATERIALS.alloySilver },
    lugs: false,
  },
  {
    id: 'steel',
    headTube: 0.155,
    // Level top tube: seat-tube top at (almost) the same height as the head-tube top.
    seatTube: 0.575,
    stayJunction: 0.55,
    tubes: { head: [0.034, 0.034], down: [0.0318, 0.0318], top: [0.0286, 0.0286], seat: [0.0286, 0.0286], chainstay: [0.019, 0.022, 0.75], seatstay: [0.014, 0.014] },
    fork: { leg: [0.02, 0.024, 0.7], crownMaterial: MATERIALS.alloySilver },
    seatpost: { profile: [0.0272, 0.0272], material: MATERIALS.alloySilver },
    lugs: true,
  },
]

const z = (p: Vector3, zz: number) => p.clone().setZ(zz)
const tube = (a: Vector3, b: Vector3, [w, d, taper]: Profile) => profileTube(a, b, w, d, { taper })

/** Variant-specific points. */
export function frameGeometry(spec: FrameSpec) {
  const headTop = GEO.headBottom.clone().addScaledVector(GEO.steerUp, spec.headTube)
  const seatTop = GEO.bb.clone().addScaledVector(GEO.seatDir, spec.seatTube)
  return {
    headTop,
    seatTop,
    /** Top of the headset cover — the stem's mounting point. */
    stemMount: headTop.clone().addScaledVector(GEO.steerUp, 0.012),
  }
}

/** Empty node marking where a swappable component mounts. */
export function anchor(name: string, position: Vector3): Object3D {
  const o = new Object3D()
  o.name = `anchor_${name}`
  o.position.copy(position)
  return o
}

export function buildFrame(spec: FrameSpec): Group {
  const { bb, rearAxle, frontAxle, headDown, steerUp, seatDir, headBottom, saddleMount } = GEO
  const { headTop, seatTop, stemMount } = frameGeometry(spec)
  const t = spec.tubes
  const paint: BufferGeometry[] = []
  const chrome: BufferGeometry[] = []
  const dark: BufferGeometry[] = []

  // Main triangle
  paint.push(tube(headBottom.clone().addScaledVector(headDown, 0.005), headTop, t.head))
  paint.push(tube(bb, headBottom.clone().addScaledVector(steerUp, 0.03), t.down))
  paint.push(tube(seatTop.clone().addScaledVector(seatDir, -0.01), headTop.clone().addScaledVector(headDown, 0.03), t.top))
  paint.push(tube(bb, seatTop, t.seat))
  paint.push(profileTube(z(bb, -0.043), z(bb, 0.043), 0.047, 0.047)) // BB shell
  const cluster = new SphereGeometry(Math.max(t.seat[0], t.top[0]) * 0.62, 24, 16)
  cluster.translate(seatTop.x, seatTop.y, 0)
  paint.push(cluster)

  // Rear triangle
  const junction = bb.clone().addScaledVector(seatDir, spec.stayJunction)
  for (const s of [-1, 1]) {
    paint.push(tube(z(bb, 0.036 * s), z(rearAxle, 0.062 * s), t.chainstay))
    paint.push(tube(z(junction, 0.016 * s), z(rearAxle, 0.062 * s), t.seatstay))
    paint.push(profileTube(z(rearAxle, 0.054 * s), z(rearAxle, 0.068 * s), 0.036, 0.036)) // dropout
  }
  dark.push(profileTube(z(rearAxle, -0.075), z(rearAxle, 0.075), 0.012, 0.012)) // thru-axle

  if (spec.lugs) {
    // Chrome lug sleeves at head tube ends, seat cluster and BB.
    chrome.push(tube(headTop.clone().addScaledVector(headDown, 0.035), headTop.clone().addScaledVector(steerUp, 0.003), [t.head[0] + 0.006, t.head[1] + 0.006]))
    chrome.push(tube(headBottom.clone().addScaledVector(headDown, 0.004), headBottom.clone().addScaledVector(steerUp, 0.035), [t.head[0] + 0.006, t.head[1] + 0.006]))
    chrome.push(tube(seatTop.clone().addScaledVector(seatDir, -0.045), seatTop.clone().addScaledVector(seatDir, 0.004), [t.seat[0] + 0.007, t.seat[1] + 0.007]))
    chrome.push(profileTube(z(bb, -0.046), z(bb, 0.046), 0.052, 0.052))
  }

  const frame = part('frame_main', [
    [MATERIALS.paintFrame, paint],
    [MATERIALS.alloySilver, chrome],
    [MATERIALS.groupset, dark],
  ])
  frame.add(anchor('wheel_front', frontAxle), anchor('wheel_rear', rearAxle), anchor('stem', stemMount), anchor('saddle', saddleMount))
  return frame
}

export function buildFork(spec: FrameSpec): Group {
  const { frontAxle, headDown, headBottom, steerUp } = GEO
  const { headTop } = frameGeometry(spec)
  const crown = headBottom.clone().addScaledVector(headDown, 0.012)
  const paint = [profileTube(headTop, headTop.clone().addScaledVector(steerUp, 0.012), 0.05, 0.05)] // headset cover
  for (const s of [-1, 1]) {
    paint.push(tube(z(crown, 0.034 * s), z(frontAxle, 0.05 * s), spec.fork.leg))
    paint.push(profileTube(z(frontAxle, 0.046 * s), z(frontAxle, 0.058 * s), 0.03, 0.03))
  }
  const crownGeo = [profileTube(z(crown, -0.05), z(crown, 0.05), 0.05, 0.032)]
  const dark = [profileTube(z(frontAxle, -0.062), z(frontAxle, 0.062), 0.012, 0.012)]
  return part('fork', [
    [MATERIALS.paintFrame, paint],
    [spec.fork.crownMaterial, crownGeo],
    [MATERIALS.groupset, dark],
  ])
}

export function buildSeatpost(spec: FrameSpec): Group {
  const { seatDir, postTop } = GEO
  const { seatTop } = frameGeometry(spec)
  const [w, d] = spec.seatpost.profile
  const post = profileTube(seatTop.clone().addScaledVector(seatDir, -0.03), postTop, w, d)
  const head = profileTube(z(postTop, -0.016), z(postTop, 0.016), 0.05, 0.02)
  return part('seatpost', [[spec.seatpost.material, [post, head]]])
}

/** Frame + fork + seatpost as one swappable set (root children named after their slots). */
export function buildFrameset(spec: FrameSpec): Group {
  const g = new Group()
  g.name = `frameset_${spec.id}`
  g.add(buildFrame(spec), buildFork(spec), buildSeatpost(spec))
  return g
}
