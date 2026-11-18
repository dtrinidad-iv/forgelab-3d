import { type Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { FORGELAB_ROAD_BIKE as MAP } from '~/config/assetMap'
import { ConfiguratorScene } from '~/utils/three/configuratorScene'
import { RidePlayer } from '~/utils/three/ridePlayer'
import { loadGlb } from './helpers/loadGlb'

const angleZ = (o: Object3D) => {
  const q = o.quaternion
  return 2 * Math.atan2(q.z, q.w) // rotation about Z only
}

describe('"ride" glTF animation (authored into road-bike.glb)', () => {
  it('ships a ride clip targeting crankset and both wheels', async () => {
    const root = await loadGlb(MAP.url)
    const clip = root.animations.find((c) => c.name === 'ride')!
    expect(clip.duration).toBeCloseTo(2, 5)
    expect(clip.tracks.map((t) => t.name).sort()).toEqual(['crankset.quaternion', 'wheel_front.quaternion', 'wheel_rear.quaternion'])
  })

  it('crankset pivots on the bottom bracket (rotates in place)', async () => {
    const root = await loadGlb(MAP.url)
    const crank = root.getObjectByName('crankset')!
    expect(crank.position.distanceTo(new Vector3(0, 0.27, 0))).toBeLessThan(1e-4)
  })

  it('turns the wheels ~3× faster than the cranks, and keeps working after part swaps', async () => {
    const root = await loadGlb(MAP.url)
    const scene = new ConfiguratorScene(root, MAP, loadGlb)
    const ride = new RidePlayer(root)
    ride.play()
    ride.update(1 / 12) // 1/24 of the loop: crank 15°, wheels 45°
    expect(angleZ(root.getObjectByName('crankset')!)).toBeCloseTo(-Math.PI / 12, 2)
    expect(angleZ(root.getObjectByName('wheel_front')!)).toBeCloseTo(-Math.PI / 4, 2)

    await scene.setVariant('wheels', 'carbon-deep')
    await scene.setVariant('groupset', 'sram-demo')
    ride.rebind()
    ride.update(1 / 12)
    expect(Math.abs(angleZ(root.getObjectByName('wheel_front')!))).toBeGreaterThan(0.1) // the NEW wheel turns
    expect(Math.abs(angleZ(root.getObjectByName('crankset')!))).toBeGreaterThan(0.1) // the NEW crankset turns

    ride.stop()
    expect(root.getObjectByName('wheel_front')!.quaternion.angleTo(new Quaternion())).toBeLessThan(1e-6) // rest pose
  })
})
