import { type Material, type Mesh, type Object3D, Vector3 } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FORGELAB_ROAD_BIKE, type ModelAssetMap } from '~/config/assetMap'
import { ConfiguratorScene, MissingAssetError } from '~/utils/three/configuratorScene'
import { loadGlb } from './helpers/loadGlb'

const MAP = FORGELAB_ROAD_BIKE

function materialNames(node: Object3D): string[] {
  const names: string[] = []
  node.traverse((o) => {
    const m = o as Mesh
    if (m.isMesh) names.push(...((Array.isArray(m.material) ? m.material : [m.material]) as Material[]).map((x) => x.name))
  })
  return names
}

const worldPos = (o: Object3D) => o.getWorldPosition(new Vector3())

describe('ConfiguratorScene (real generated GLBs)', () => {
  let root: Object3D
  let loader: ReturnType<typeof vi.fn<(url: string) => Promise<Object3D>>>
  let scene: ConfiguratorScene

  beforeEach(async () => {
    root = await loadGlb(MAP.url)
    loader = vi.fn(loadGlb)
    scene = new ConfiguratorScene(root, MAP, loader)
  })

  it('maps every logical component of the base model', () => {
    expect(scene.getMapping().missing).toEqual([])
    expect(scene.getMapping().found).toHaveLength(18)
  })

  it('repaints frame and fork through one shared material, without touching geometry', () => {
    const frameMeshBefore = root.getObjectByName('frame_main')!.children[0] as Mesh
    const geometry = frameMeshBefore.geometry
    const status = scene.applyPaint({ color: '#C8102E', finish: 'metallic' }, false)

    expect(status.state).toBe('applied')
    const paintUsers: string[] = []
    root.traverse((o) => (o as Mesh).isMesh && (o as Mesh).material === scene.paintMaterial && paintUsers.push(o.name))
    expect(paintUsers.some((n) => n.startsWith('frame_main'))).toBe(true)
    expect(paintUsers.some((n) => n.startsWith('fork'))).toBe(true)
    expect(scene.paintMaterial.color.getHexString()).toBe('c8102e')
    expect(scene.paintMaterial.metalness).toBeGreaterThan(0.5)
    expect(frameMeshBefore.geometry).toBe(geometry) // no reload / no rebuild
  })

  it('animates paint changes over time', () => {
    scene.applyPaint({ color: '#FFFFFF', finish: 'matte' }, true)
    const start = performance.now()
    scene.update(start + 10_000)
    expect(scene.paintMaterial.color.getHexString()).toBe('ffffff')
    expect(scene.paintMaterial.clearcoat).toBe(0)
  })

  it('genuinely replaces both wheels, preserving their mount positions', async () => {
    const frontBefore = root.getObjectByName('wheel_front')!
    const posBefore = worldPos(frontBefore)
    expect(materialNames(frontBefore)).toContain('carbon_matte')

    const status = await scene.setVariant('wheels', 'carbon-deep')

    expect(status).toEqual({ state: 'applied', kind: 'component' })
    const frontAfter = root.getObjectByName('wheel_front')!
    expect(frontAfter).not.toBe(frontBefore) // different object = different geometry
    expect(materialNames(frontAfter)).toContain('carbon_gloss')
    expect(frontAfter.parent?.name).toBe('anchor_wheel_front')
    expect(worldPos(frontAfter).distanceTo(posBefore)).toBeLessThan(1e-6)
    expect(root.getObjectByName('wheel_rear')!.parent?.name).toBe('anchor_wheel_rear')
    expect(scene.shownVariant('wheels')).toBe('carbon-deep')
  })

  it('reuses detached parts when switching back (no reload)', async () => {
    const original = root.getObjectByName('wheel_front')!
    await scene.setVariant('wheels', 'alloy')
    await scene.setVariant('wheels', 'carbon-climbing')
    expect(root.getObjectByName('wheel_front')).toBe(original)
    expect(loader).toHaveBeenCalledTimes(1) // only the alloy file was loaded
  })

  it('moves the handlebar onto the new stem when the stem is replaced', async () => {
    const bar = root.getObjectByName('handlebar')!
    const barPosBefore = worldPos(bar)
    const oldStem = root.getObjectByName('stem')!

    await scene.setVariant('stem', 'carbon-stem')

    const newStem = root.getObjectByName('stem')!
    expect(newStem).not.toBe(oldStem)
    expect(bar.parent?.name).toBe('anchor_handlebar')
    expect(bar.parent?.parent).toBe(newStem)
    const anchorPos = worldPos(newStem.getObjectByName('anchor_handlebar')!)
    expect(worldPos(bar).distanceTo(anchorPos)).toBeLessThan(1e-6)
    expect(worldPos(bar).distanceTo(barPosBefore)).toBeGreaterThan(0.001) // different stem angle
  })

  it('keeps the chosen bar-tape colour on a newly mounted handlebar', async () => {
    await scene.setVariant('barTape', 'tape-tan')
    await scene.setVariant('handlebar', 'alloy-compact')
    const tapeMesh = root.getObjectByName('bar_tape')!.children[0] as Mesh
    expect(tapeMesh.material).toBe(scene.tapeMaterial)
    expect(scene.tapeMaterial.color.getHexString()).toBe('a8703f')
  })

  it('reports groups the model cannot show instead of pretending', async () => {
    for (const group of ['frame', 'size', 'groupset'] as const) {
      const status = await scene.setVariant(group, 'anything')
      expect(status.state).toBe('unsupported')
      expect(status.message).toBeTruthy()
    }
  })

  it('reports a missing asset and leaves the model unchanged', async () => {
    const broken: ModelAssetMap = {
      ...MAP,
      visuals: { ...MAP.visuals, saddle: { kind: 'component', slots: ['saddle'], variants: { 'saddle-comfort': '/models/bicycle/components/does-not-exist.glb' } } },
    }
    const s = new ConfiguratorScene(root, broken, loadGlb)
    const before = root.getObjectByName('saddle')
    const status = await s.setVariant('saddle', 'saddle-comfort')
    expect(status.state).toBe('missing-asset')
    expect(status.message).toContain('does-not-exist.glb')
    expect(root.getObjectByName('saddle')).toBe(before)

    const unmapped = await s.setVariant('saddle', 'saddle-short')
    expect(unmapped.state).toBe('missing-asset')
  })

  it('lets the latest selection win when requests overlap', async () => {
    const slow = new ConfiguratorScene(root, MAP, (url) => new Promise((r) => setTimeout(() => r(loadGlb(url)), url.includes('alloy') ? 40 : 1)))
    const first = slow.setVariant('wheels', 'alloy')
    const second = slow.setVariant('wheels', 'carbon-deep')
    await Promise.all([first, second])
    expect(slow.shownVariant('wheels')).toBe('carbon-deep')
    expect(materialNames(root.getObjectByName('wheel_front')!)).toContain('carbon_gloss')
  })

  it('MissingAssetError is what the loader contract uses for absent files', async () => {
    await expect(loadGlb('/models/bicycle/components/nope.glb')).rejects.toBeInstanceOf(MissingAssetError)
  })
})
