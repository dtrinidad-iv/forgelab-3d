/**
 * ⚠️ TEMPORARY PLACEHOLDER ⚠️
 * A primitive, neutral-grey bicycle silhouette shown until the real Blender asset
 * (`public/models/bicycle/road-bike.glb`) exists. It intentionally does NOT react to
 * configurator selections — no fake component replacement.
 * Delete this file once the real model ships.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three'

export const PLACEHOLDER_NAME = 'PLACEHOLDER_BIKE'

const UP = new Vector3(0, 1, 0)

function tube(from: Vector3, to: Vector3, radius: number, material: MeshStandardMaterial): Mesh {
  const dir = new Vector3().subVectors(to, from)
  const mesh = new Mesh(new CylinderGeometry(radius, radius, dir.length(), 20), material)
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(UP, dir.normalize()))
  mesh.castShadow = true
  return mesh
}

function wheel(center: Vector3, tyreMat: MeshStandardMaterial, rimMat: MeshStandardMaterial): Group {
  const g = new Group()
  const tyre = new Mesh(new TorusGeometry(0.335, 0.014, 16, 96), tyreMat)
  const rim = new Mesh(new TorusGeometry(0.305, 0.02, 12, 96), rimMat)
  const hub = new Mesh(new CylinderGeometry(0.018, 0.018, 0.1, 16), rimMat)
  hub.rotation.x = Math.PI / 2
  for (const m of [tyre, rim, hub]) m.castShadow = true
  g.add(tyre, rim, hub)
  g.position.copy(center)
  return g
}

/** Builds the placeholder in metres, Y-up, wheels resting on y = 0 (matches the GLB export convention). */
export function createPlaceholderBike(): Group {
  const frameMat = new MeshStandardMaterial({ color: 0x8a909a, roughness: 0.35, metalness: 0.2 })
  const darkMat = new MeshStandardMaterial({ color: 0x2f333a, roughness: 0.6, metalness: 0.3 })
  const tyreMat = new MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.9 })

  const rearAxle = new Vector3(-0.5, 0.35, 0)
  const frontAxle = new Vector3(0.5, 0.35, 0)
  const bb = new Vector3(-0.08, 0.28, 0)
  const seatTop = new Vector3(-0.22, 0.8, 0)
  const headTop = new Vector3(0.36, 0.84, 0)
  const headBottom = new Vector3(0.4, 0.7, 0)
  const saddle = new Vector3(-0.27, 0.97, 0)
  const stemEnd = new Vector3(0.48, 0.88, 0)

  const bike = new Group()
  bike.name = PLACEHOLDER_NAME
  bike.userData.isPlaceholder = true

  // Main triangle + rear triangle
  bike.add(
    tube(bb, seatTop, 0.017, frameMat), // seat tube
    tube(seatTop, headTop, 0.016, frameMat), // top tube
    tube(bb, headBottom, 0.022, frameMat), // down tube
    tube(headBottom, headTop, 0.024, frameMat), // head tube
  )
  for (const side of [-0.045, 0.045]) {
    const axle = rearAxle.clone().setZ(side)
    bike.add(tube(bb, axle, 0.01, frameMat), tube(seatTop, axle, 0.009, frameMat)) // chainstay, seatstay
    bike.add(tube(headBottom, frontAxle.clone().setZ(side), 0.012, frameMat)) // fork legs
  }

  // Contact points
  bike.add(tube(seatTop, saddle, 0.012, darkMat))
  const saddleMesh = new Mesh(new BoxGeometry(0.26, 0.025, 0.12), darkMat)
  saddleMesh.position.copy(saddle).add(new Vector3(0, 0.015, 0))
  saddleMesh.castShadow = true
  bike.add(saddleMesh)
  bike.add(tube(headTop, stemEnd, 0.014, darkMat))
  bike.add(tube(stemEnd.clone().setZ(-0.2), stemEnd.clone().setZ(0.2), 0.012, darkMat)) // bar tops

  // Crank + chainring
  const ring = new Mesh(new TorusGeometry(0.1, 0.006, 8, 48), darkMat)
  ring.position.copy(bb).setZ(0.06)
  bike.add(ring)

  bike.add(wheel(rearAxle, tyreMat, darkMat), wheel(frontAxle, tyreMat, darkMat))

  return bike
}
