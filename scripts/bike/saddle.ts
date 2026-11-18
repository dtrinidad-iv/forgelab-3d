/**
 * Saddles. Origin = rail clamp point (mounts on anchor_saddle). Nose points +X.
 */
import { ExtrudeGeometry, Group, type Material, Path, Shape } from 'three'
import { part, tubeAlong, v } from './geometry'
import { MATERIALS } from './materials'

export interface SaddleSpec {
  id: string
  length: number
  width: number
  thickness: number
  cutout: boolean
  railMaterial: Material
}

export const SADDLES: SaddleSpec[] = [
  { id: 'comfort', length: 0.275, width: 0.155, thickness: 0.03, cutout: false, railMaterial: MATERIALS.alloySilver },
  { id: 'short-nose', length: 0.245, width: 0.143, thickness: 0.024, cutout: true, railMaterial: MATERIALS.alloySilver },
  { id: 'race-carbon', length: 0.27, width: 0.138, thickness: 0.016, cutout: false, railMaterial: MATERIALS.carbonMatte },
]

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

function outline(spec: SaddleSpec): Shape {
  const half = spec.length / 2
  const halfWidth = (x: number) => {
    const t = (half - x) / spec.length // 0 = nose, 1 = rear
    return 0.017 + (spec.width / 2 - 0.017) * smoothstep(0.3, 0.82, t)
  }
  const shape = new Shape()
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2
    const x = half * Math.cos(theta)
    const s = Math.sin(theta)
    const z = halfWidth(x) * Math.sign(s) * Math.pow(Math.abs(s), 0.3)
    if (i === 0) shape.moveTo(x, z)
    else shape.lineTo(x, z)
  }
  if (spec.cutout) {
    shape.holes.push(new Path().absellipse(-0.012, 0, 0.05, 0.009, 0, Math.PI * 2, true, 0))
  }
  return shape
}

export function buildSaddle(spec: SaddleSpec): Group {
  const shell = new ExtrudeGeometry(outline(spec), {
    depth: spec.thickness,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 4,
    curveSegments: 48,
  })
  shell.rotateX(-Math.PI / 2) // extrusion depth → +Y, outline in the XZ plane
  shell.translate(0, 0.034, 0)
  // Shape the top: rear kick + nose rise, and drooping wings.
  const pos = shell.attributes.position!
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const zz = pos.getZ(i)
    pos.setY(i, pos.getY(i) + 1.1 * x * x - 0.9 * zz * zz)
  }
  shell.computeVertexNormals()

  const half = spec.length / 2
  const rails = [-0.022, 0.022].map((rz) =>
    tubeAlong([v(half - 0.045, 0.036, rz * 0.6), v(0.05, 0.002, rz), v(-0.045, 0.002, rz), v(-half + 0.05, 0.036, rz)], 0.0035, { radialSegments: 8 }),
  )

  return part('saddle', [
    [MATERIALS.saddle, [shell]],
    [spec.railMaterial, rails],
  ])
}
