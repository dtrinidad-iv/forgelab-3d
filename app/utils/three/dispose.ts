import type { Material, Object3D } from 'three'
import { Mesh, Texture } from 'three'

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose()
  }
  material.dispose()
}

/** Frees GPU resources (geometries, materials, textures) owned by an object tree. */
export function disposeObject3D(root: Object3D) {
  root.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry?.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((m: Material | undefined) => m && disposeMaterial(m))
    }
  })
  root.removeFromParent()
}
