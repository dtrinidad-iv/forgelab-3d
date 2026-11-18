import type { Material, Mesh, Object3D } from 'three'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import { FORGELAB_ROAD_BIKE as MAP } from '~/config/assetMap'
import { sanitizeConfiguration } from '~/utils/configuration'
import { assembleConfiguration } from '~/utils/three/assembleConfiguration'
import { exportGlb } from '~/utils/three/exportGlb'
import { loadGlb } from './helpers/loadGlb'

const materials = (root: Object3D) => {
  const names = new Set<string>()
  root.traverse((o) => (o as Mesh).isMesh && ((Array.isArray((o as Mesh).material) ? (o as Mesh).material : [(o as Mesh).material]) as Material[]).forEach((m) => names.add(m.name)))
  return names
}

describe('Android AR model (server-assembled GLB for Scene Viewer)', () => {
  it('assembles the exact build and exports a plain GLB any viewer can read', async () => {
    const config = sanitizeConfiguration({ selections: { size: 'xl', frame: 'steel', wheels: 'carbon-deep', groupset: 'campagnolo-demo', paint: 'racing-red', barTape: 'tape-tan' } })
    const root = await assembleConfiguration(MAP, config, loadGlb)
    const glb = await exportGlb(root)
    expect(glb.byteLength).toBeGreaterThan(500_000)

    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(glb, 20, new DataView(glb).getUint32(12, true))))
    expect(json.extensionsRequired ?? []).toEqual([]) // nothing a plain viewer must support
    expect(JSON.stringify(json.extensionsUsed ?? [])).not.toMatch(/meshopt|quantization/)

    // A plain GLTFLoader (NO meshopt decoder) must read it.
    const back = (await new GLTFLoader().parseAsync(glb, '')).scene
    const m = materials(back)
    expect(m.has('carbon_gloss')).toBe(true) // deep-section wheels
    expect(m.has('groupset_silver')).toBe(true) // 13-speed demo groupset
    expect(m.has('alloy_silver')).toBe(true) // steel lugs
    const size = new Box3().setFromObject(back).getSize(new Vector3())
    expect(size.x).toBeGreaterThan(1.5) // real-world metres: ~1.67 m long
    expect(size.x).toBeLessThan(1.9)
    expect(size.y).toBeGreaterThan(0.95) // XL saddle height
  })

  it('refuses to produce a silently wrong model when a part is missing', async () => {
    const broken = { ...MAP, visuals: { ...MAP.visuals, saddle: { kind: 'component' as const, slots: ['saddle' as const], variants: { 'saddle-comfort': '/models/bicycle/components/nope.glb' } } } }
    await expect(assembleConfiguration(broken, sanitizeConfiguration({ selections: { saddle: 'saddle-comfort' } }), loadGlb)).rejects.toThrow(/saddle/)
  })
})
