import { type Object3D, Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { FORGELAB_ROAD_BIKE as MAP } from '~/config/assetMap'
import { ConfiguratorScene } from '~/utils/three/configuratorScene'
import { ExplodedView } from '~/utils/three/explodedView'
import { loadGlb } from './helpers/loadGlb'

const world = (o: Object3D) => {
  o.updateWorldMatrix(true, false)
  return o.getWorldPosition(new Vector3())
}

describe('ExplodedView (real generated GLBs)', () => {
  let root: Object3D
  let scene: ConfiguratorScene
  let view: ExplodedView

  beforeEach(async () => {
    root = await loadGlb(MAP.url)
    scene = new ConfiguratorScene(root, MAP, loadGlb)
    view = new ExplodedView(root, MAP.explode, 900)
  })

  it('every offset targets a real node', () => {
    for (const name of Object.keys(MAP.explode)) expect(root.getObjectByName(name), name).toBeTruthy()
  })

  it('animates parts apart and back to the exact assembled positions', () => {
    const names = ['wheel_front', 'saddle', 'crankset', 'handlebar']
    const before = Object.fromEntries(names.map((n) => [n, world(root.getObjectByName(n)!)]))

    view.set(true, 0)
    view.update(450) // halfway
    expect(view.progress).toBeGreaterThan(0)
    expect(view.progress).toBeLessThan(1)
    view.update(2000)
    expect(view.progress).toBe(1)

    expect(world(root.getObjectByName('wheel_front')!).x - before.wheel_front!.x).toBeCloseTo(0.34, 5)
    expect(world(root.getObjectByName('saddle')!).y - before.saddle!.y).toBeCloseTo(0.3, 5)
    expect(world(root.getObjectByName('crankset')!).z - before.crankset!.z).toBeCloseTo(0.24, 5)
    // nested: handlebar = stem offset + its own
    expect(world(root.getObjectByName('handlebar')!).y - before.handlebar!.y).toBeCloseTo(0.16 + 0.08, 5)

    view.set(false, 3000)
    view.update(5000)
    for (const n of names) expect(world(root.getObjectByName(n)!).distanceTo(before[n]!)).toBeLessThan(1e-9)
  })

  it('parts swapped in while exploded are mounted assembled-correct and shown exploded', async () => {
    const assembled = world(root.getObjectByName('wheel_front')!)
    view.set(true, 0)
    view.update(2000)
    await scene.setVariant('wheels', 'carbon-deep')
    view.update(2100) // next frame applies the offset to the new wheel
    expect(world(root.getObjectByName('wheel_front')!).x - assembled.x).toBeCloseTo(0.34, 5)
    view.set(false, 3000)
    view.update(5000)
    expect(world(root.getObjectByName('wheel_front')!).distanceTo(assembled)).toBeLessThan(1e-9)
  })

  it('a frame swap while exploded keeps the frame-mounted parts consistent', async () => {
    const saddle0 = world(root.getObjectByName('saddle')!)
    view.set(true, 0)
    view.update(2000)
    await scene.setVariant('frame', 'steel@m')
    view.update(2100)
    view.set(false, 3000)
    view.update(5000)
    expect(world(root.getObjectByName('saddle')!).distanceTo(saddle0)).toBeLessThan(1e-6) // shared saddle height
  })
})
