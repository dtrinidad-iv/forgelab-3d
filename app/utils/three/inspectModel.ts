/**
 * Asset inspection utility. Pure Three.js (no Vue, no DOM) so it runs in the browser and in Node
 * (`npm run inspect:glb`). Reports hierarchy, meshes, materials, geometry counts and bounds.
 */
import { Box3, type BufferGeometry, type Material, type Mesh, type Object3D, Vector3 } from 'three'

export interface BoundsReport {
  min: [number, number, number]
  max: [number, number, number]
  size: [number, number, number]
}

export interface HierarchyNode {
  name: string
  type: string
  children: HierarchyNode[]
}

export interface MeshReport {
  name: string
  path: string
  materials: string[]
  vertices: number
  triangles: number
  bounds: BoundsReport | null
}

export interface MaterialReport {
  name: string
  type: string
  color?: string
  metalness?: number
  roughness?: number
  clearcoat?: number
  maps: string[]
  usedBy: number
}

export interface ModelReport {
  totals: { nodes: number; meshes: number; materials: number; geometries: number; vertices: number; triangles: number }
  bounds: BoundsReport | null
  hierarchy: HierarchyNode
  objects: string[]
  meshes: MeshReport[]
  materials: MaterialReport[]
}

const round = (n: number) => Math.round(n * 1000) / 1000
const tuple = (v: Vector3): [number, number, number] => [round(v.x), round(v.y), round(v.z)]

function bounds(object: Object3D): BoundsReport | null {
  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return null
  return { min: tuple(box.min), max: tuple(box.max), size: tuple(box.getSize(new Vector3())) }
}

function pathOf(object: Object3D, root: Object3D): string {
  const parts: string[] = []
  let o: Object3D | null = object
  while (o && o !== root) {
    parts.unshift(o.name || `<${o.type}>`)
    o = o.parent
  }
  return parts.join(' / ')
}

function triangleCount(g: BufferGeometry): number {
  return Math.round((g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3)
}

const MAP_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'clearcoatNormalMap'] as const

export function inspectModel(root: Object3D): ModelReport {
  root.updateMatrixWorld(true)

  const materials = new Map<Material, MaterialReport>()
  const geometries = new Set<BufferGeometry>()
  const meshes: MeshReport[] = []
  const objects: string[] = []
  let nodes = 0

  const walk = (o: Object3D): HierarchyNode => {
    nodes++
    if (o.name) objects.push(o.name)
    return { name: o.name || `<${o.type}>`, type: o.type, children: o.children.map(walk) }
  }
  const hierarchy = walk(root)

  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    geometries.add(mesh.geometry)
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]
    for (const m of mats) {
      const existing = materials.get(m)
      if (existing) {
        existing.usedBy++
        continue
      }
      const any = m as Material & Record<string, unknown>
      const color = any.color as { getHexString?: () => string } | undefined
      materials.set(m, {
        name: m.name || '<unnamed>',
        type: m.type,
        color: color?.getHexString ? `#${color.getHexString()}` : undefined,
        metalness: typeof any.metalness === 'number' ? round(any.metalness) : undefined,
        roughness: typeof any.roughness === 'number' ? round(any.roughness) : undefined,
        clearcoat: typeof any.clearcoat === 'number' ? round(any.clearcoat) : undefined,
        maps: MAP_KEYS.filter((k) => any[k]),
        usedBy: 1,
      })
    }
    meshes.push({
      name: mesh.name || '<unnamed>',
      path: pathOf(mesh, root),
      materials: mats.map((m) => m.name || '<unnamed>'),
      vertices: mesh.geometry.attributes.position?.count ?? 0,
      triangles: triangleCount(mesh.geometry),
      bounds: bounds(mesh),
    })
  })

  return {
    totals: {
      nodes,
      meshes: meshes.length,
      materials: materials.size,
      geometries: geometries.size,
      vertices: meshes.reduce((s, m) => s + m.vertices, 0),
      triangles: meshes.reduce((s, m) => s + m.triangles, 0),
    },
    bounds: bounds(root),
    hierarchy,
    objects,
    meshes,
    materials: [...materials.values()],
  }
}

/** Human-readable Markdown rendering of a report. */
export function formatReport(report: ModelReport, title = 'Model report'): string {
  const lines: string[] = [`# ${title}`, '']
  const t = report.totals
  lines.push(`**Nodes** ${t.nodes} · **Meshes** ${t.meshes} · **Materials** ${t.materials} · **Geometries** ${t.geometries} · **Vertices** ${t.vertices.toLocaleString('en-US')} · **Triangles** ${t.triangles.toLocaleString('en-US')}`, '')
  if (report.bounds) lines.push(`**Bounds (m)** min ${report.bounds.min.join(', ')} · max ${report.bounds.max.join(', ')} · size ${report.bounds.size.join(' × ')}`, '')

  lines.push('## Hierarchy', '', '```')
  const tree = (n: HierarchyNode, depth: number) => {
    lines.push(`${'  '.repeat(depth)}${n.name} (${n.type})`)
    n.children.forEach((c) => tree(c, depth + 1))
  }
  tree(report.hierarchy, 0)
  lines.push('```', '')

  lines.push('## Materials', '', '| Name | Type | Colour | Metal | Rough | Clearcoat | Maps | Meshes |', '|---|---|---|---|---|---|---|---|')
  for (const m of report.materials) {
    lines.push(`| ${m.name} | ${m.type} | ${m.color ?? ''} | ${m.metalness ?? ''} | ${m.roughness ?? ''} | ${m.clearcoat ?? ''} | ${m.maps.join(', ') || '—'} | ${m.usedBy} |`)
  }
  lines.push('', '## Meshes', '', '| Path | Materials | Vertices | Triangles | Size (m) |', '|---|---|---|---|---|')
  for (const m of report.meshes) {
    lines.push(`| ${m.path} | ${m.materials.join(', ')} | ${m.vertices} | ${m.triangles} | ${m.bounds?.size.join(' × ') ?? ''} |`)
  }
  return lines.join('\n') + '\n'
}
