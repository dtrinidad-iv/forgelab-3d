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

  it('replaces the frame and carries every mounted part onto the new frame', async () => {
    scene.applyPaint({ color: '#C8102E', finish: 'gloss' }, false)
    const wheel = root.getObjectByName('wheel_rear')!
    const stem = root.getObjectByName('stem')!
    const bar = root.getObjectByName('handlebar')!
    const saddle = root.getObjectByName('saddle')!
    const oldFrame = root.getObjectByName('frame_main')!
    const oldFork = root.getObjectByName('fork')!
    const saddlePos = worldPos(saddle)
    const stemPos = worldPos(stem)
    const wheelPos = worldPos(wheel)

    const status = await scene.setVariant('frame', 'endurance-carbon@m')

    expect(status).toEqual({ state: 'applied', kind: 'component' })
    const frame = root.getObjectByName('frame_main')!
    expect(frame).not.toBe(oldFrame)
    expect(root.getObjectByName('fork')).not.toBe(oldFork)
    expect(wheel.parent).toBe(frame.getObjectByName('anchor_wheel_rear'))
    expect(stem.parent).toBe(frame.getObjectByName('anchor_stem'))
    expect(saddle.parent).toBe(frame.getObjectByName('anchor_saddle'))
    expect(bar.parent?.parent).toBe(stem) // handlebar still on the stem
    expect(worldPos(wheel).distanceTo(wheelPos)).toBeLessThan(1e-6) // shared axle
    expect(worldPos(saddle).distanceTo(saddlePos)).toBeLessThan(1e-6) // shared saddle height
    expect(worldPos(stem).y).toBeGreaterThan(stemPos.y + 0.03) // taller endurance head tube

    // The current paint follows the new frame and fork.
    const painted: string[] = []
    root.traverse((o) => (o as Mesh).isMesh && (o as Mesh).material === scene.paintMaterial && painted.push(o.name))
    expect(painted.filter((n) => n.startsWith('frame_main') || n.startsWith('fork')).length).toBeGreaterThanOrEqual(2)
    expect(materialNames(frame)).not.toContain('paint_frame')
  })

  it('steel frame brings chrome lugs and an alloy seatpost', async () => {
    await scene.setVariant('frame', 'steel@m')
    expect(materialNames(root.getObjectByName('frame_main')!)).toContain('alloy_silver')
    expect(materialNames(root.getObjectByName('seatpost')!)).toEqual(['alloy_silver'])
  })

  it('size changes real frame geometry: bar and saddle height follow the size', async () => {
    const saddle = root.getObjectByName('saddle')!
    const stem = root.getObjectByName('stem')!
    const wheel = root.getObjectByName('wheel_front')!
    const m = { saddle: worldPos(saddle), stem: worldPos(stem), wheel: worldPos(wheel) }

    await scene.setVariant('frame', 'aero-carbon@xl')
    expect(worldPos(saddle).y - m.saddle.y).toBeGreaterThan(0.045) // +55 mm along the seat tube
    expect(worldPos(stem).y - m.stem.y).toBeGreaterThan(0.04) // +45 mm stack
    expect(worldPos(wheel).distanceTo(m.wheel)).toBeLessThan(1e-6) // axles are shared hard points
    expect(await scene.setVariant('size', 'xl')).toMatchObject({ state: 'applied', kind: 'component' })

    await scene.setVariant('frame', 'aero-carbon@xs')
    expect(worldPos(saddle).y).toBeLessThan(m.saddle.y - 0.045)
    expect(worldPos(stem).y).toBeLessThan(m.stem.y - 0.035)
  })

  it('size only claims "shown in 3D" when the frame for that size is mounted', async () => {
    await scene.setVariant('frame', 'aero-carbon@l')
    expect((await scene.setVariant('size', 'l')).state).toBe('applied')
    expect((await scene.setVariant('size', 'xs')).state).toBe('missing-asset')
  })

  it('groupset swaps the whole drivetrain — the 13-speed demo option has a 13-cog cassette', async () => {
    const cassette12 = root.getObjectByName('cassette')!
    const tris = (o: Object3D) => {
      let n = 0
      o.traverse((c) => {
        const g = (c as Mesh).geometry
        if ((c as Mesh).isMesh) n += (g.index?.count ?? g.attributes.position!.count) / 3
      })
      return n
    }
    const t12 = tris(cassette12)

    expect(await scene.setVariant('groupset', 'campagnolo-demo')).toEqual({ state: 'applied', kind: 'component' })
    for (const slot of ['crankset', 'cassette', 'chain', 'derailleur_front', 'derailleur_rear']) {
      expect(root.getObjectByName(slot), slot).toBeTruthy()
    }
    const cassette13 = root.getObjectByName('cassette')!
    expect(cassette13).not.toBe(cassette12)
    expect(tris(cassette13)).toBeCloseTo((t12 * 13) / 12, 0) // one more cog of the same tessellation
    expect(materialNames(root.getObjectByName('derailleur_rear')!)).toEqual(['groupset_silver'])

    await scene.setVariant('groupset', 'sram-demo')
    expect(materialNames(root.getObjectByName('crankset')!)).toContain('groupset_black')
  })

  it('reports groups the model cannot show instead of pretending', async () => {
    const noGroupset: ModelAssetMap = { ...MAP, visuals: { ...MAP.visuals, groupset: undefined }, notes: { groupset: 'Not modelled.' } }
    const s = new ConfiguratorScene(root, noGroupset, loadGlb)
    expect(await s.setVariant('groupset', 'sram-demo')).toEqual({ state: 'unsupported', message: 'Not modelled.' })
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
