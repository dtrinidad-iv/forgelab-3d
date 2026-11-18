/**
 * Geometry helpers for the ForgeLab procedural bike generator.
 * Units: metres. Axes: +X forward, +Y up, +Z = drive (right) side.
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  type Material,
  Matrix4,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const v = (x: number, y: number, z = 0) => new Vector3(x, y, z)

const WORLD_Z = new Vector3(0, 0, 1)
const WORLD_X = new Vector3(1, 0, 0)

export interface ProfileTubeOptions {
  /** Cross-section scale at `b` relative to `a` (1 = constant). */
  taper?: number
  radialSegments?: number
}

/**
 * Straight tube from `a` to `b` with an elliptical cross-section.
 * `width`  = diameter across the bike's lateral axis (Z).
 * `depth`  = diameter perpendicular to the tube and to `width` (fore-aft/vertical "aero" depth).
 * For tubes running along Z, `width` maps to X and `depth` to Y.
 */
export function profileTube(a: Vector3, b: Vector3, width: number, depth = width, opts: ProfileTubeOptions = {}): BufferGeometry {
  const dir = b.clone().sub(a)
  const length = dir.length()
  dir.normalize()

  const reference = Math.abs(dir.dot(WORLD_Z)) > 0.98 ? WORLD_X : WORLD_Z
  const lateral = reference.clone().sub(dir.clone().multiplyScalar(dir.dot(reference))).normalize()
  const m = dir.clone().cross(lateral) // right-handed basis (m, dir, lateral)

  const g = new CylinderGeometry(0.5 * (opts.taper ?? 1), 0.5, length, opts.radialSegments ?? 28, 1, false)
  g.scale(depth, 1, width)
  const basis = new Matrix4().makeBasis(m, dir, lateral)
  basis.setPosition(a.clone().add(b).multiplyScalar(0.5))
  g.applyMatrix4(basis)
  return g
}

/** Smooth tube through points (centripetal Catmull-Rom). */
export function tubeAlong(points: Vector3[], radius: number, opts: { closed?: boolean; segments?: number; radialSegments?: number } = {}): BufferGeometry {
  const curve = new CatmullRomCurve3(points, opts.closed ?? false, 'centripetal')
  return new TubeGeometry(curve, opts.segments ?? Math.max(64, points.length * 24), radius, opts.radialSegments ?? 12, opts.closed ?? false)
}

/** Merge geometries that share a material into one (normalising indexed/non-indexed). */
export function merge(geometries: BufferGeometry[]): BufferGeometry {
  if (geometries.length === 1) return geometries[0]!
  const anyNonIndexed = geometries.some((g) => !g.index)
  const normalised = geometries.map((g) => {
    const out = anyNonIndexed && g.index ? g.toNonIndexed() : g
    out.clearGroups()
    for (const name of Object.keys(out.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) out.deleteAttribute(name)
    }
    return out
  })
  const merged = mergeGeometries(normalised, false)
  if (!merged) throw new Error('mergeGeometries failed — attribute mismatch')
  return merged
}

/** Builds a named part: one mesh per material, geometries merged per material. */
export function part(name: string, entries: Array<[Material, BufferGeometry[]]>): Group {
  const group = new Group()
  group.name = name
  const byMaterial = new Map<Material, BufferGeometry[]>()
  for (const [material, geometries] of entries) {
    byMaterial.set(material, [...(byMaterial.get(material) ?? []), ...geometries])
  }
  for (const [material, geometries] of byMaterial) {
    if (!geometries.length) continue
    const mesh = new Mesh(merge(geometries), material)
    mesh.name = `${name}__${material.name}`
    group.add(mesh)
  }
  return group
}

/** Points on a circle arc in the XY plane (angles in degrees). */
export function arc(center: Vector3, radius: number, fromDeg: number, toDeg: number, steps: number, z = center.z): Vector3[] {
  const pts: Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180
    pts.push(new Vector3(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius, z))
  }
  return pts
}

/** Evenly spaced points between a and b (exclusive of both ends). */
export function between(a: Vector3, b: Vector3, count: number): Vector3[] {
  return Array.from({ length: count }, (_, i) => a.clone().lerp(b, (i + 1) / (count + 1)))
}

export const deg = (d: number) => (d * Math.PI) / 180
