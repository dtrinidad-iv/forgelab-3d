import type { Material, Mesh, Object3D } from 'three'
import { PropertyBinding } from 'three'
import { COMPONENT_IDS, type ComponentId, type ModelAssetMap } from '../../config/assetMap'

export interface AssetMappingResult {
  components: Partial<Record<ComponentId, Object3D>>
  found: ComponentId[]
  missing: ComponentId[]
  materials: { paint: Material[]; barTape: Material[] }
  missingMaterials: string[]
}

const key = (name: string) => PropertyBinding.sanitizeNodeName(name).toLowerCase()

/**
 * Resolves logical components and named materials inside a loaded model.
 * Never throws for missing parts — callers must check `missing` and degrade gracefully.
 */
export function resolveAssetMap(root: Object3D, map: ModelAssetMap): AssetMappingResult {
  const nodes = new Map<string, Object3D>()
  const materials = new Map<string, Material>()

  root.traverse((o) => {
    if (o.name && !nodes.has(key(o.name))) nodes.set(key(o.name), o)
    const mesh = o as Mesh
    if (mesh.isMesh) {
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) {
        if (m.name && !materials.has(key(m.name))) materials.set(key(m.name), m)
      }
    }
  })

  const components: Partial<Record<ComponentId, Object3D>> = {}
  for (const id of COMPONENT_IDS) {
    const candidates = map.components[id] ?? []
    const hit = candidates.map((c) => nodes.get(key(c))).find(Boolean)
    if (hit) components[id] = hit
  }

  const missingMaterials: string[] = []
  const pick = (names: string[]) =>
    names.flatMap((n) => {
      const m = materials.get(key(n))
      if (!m) missingMaterials.push(n)
      return m ? [m] : []
    })

  const found = COMPONENT_IDS.filter((id) => components[id])
  return {
    components,
    found,
    missing: COMPONENT_IDS.filter((id) => !components[id]),
    materials: { paint: pick(map.materials.paint), barTape: pick(map.materials.barTape) },
    missingMaterials,
  }
}
