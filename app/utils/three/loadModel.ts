import type { Group, Object3D, PerspectiveCamera } from 'three'
import { Box3, Mesh, Vector3 } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/** Thrown when the model file simply isn't there yet (expected during early development). */
export class ModelNotFoundError extends Error {
  constructor(url: string) {
    super(`Model not found: ${url}`)
    this.name = 'ModelNotFoundError'
  }
}

/**
 * Loads a .glb/.gltf. Resolves to the scene root, or throws:
 *  - ModelNotFoundError  → file missing (caller should show the placeholder)
 *  - Error               → file exists but failed to parse/load (caller should show error UI)
 *
 * TODO: add DRACOLoader / MeshoptDecoder here if the Blender export uses compression.
 */
export async function loadModel(
  url: string,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<Group> {
  // Cheap existence check first. Nuxt's dev server may answer missing files with an HTML
  // 404 page, so also reject HTML content types.
  const head = await fetch(url, { method: 'HEAD', signal })
  const type = head.headers.get('content-type') ?? ''
  if (head.status === 404 || type.includes('text/html')) throw new ModelNotFoundError(url)
  if (!head.ok) throw new Error(`Failed to fetch model (${head.status} ${head.statusText})`)

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url, (e) => {
    if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total)
  })

  gltf.scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return gltf.scene
}

/**
 * Centres the object on the origin with its lowest point on y = 0,
 * then positions the camera so the whole object fits the view.
 */
export interface CameraView {
  position: Vector3
  target: Vector3
}

export function frameObject(object: Object3D, camera: PerspectiveCamera, controls: OrbitControls): CameraView {
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())

  object.position.x -= center.x
  object.position.z -= center.z
  object.position.y -= box.min.y

  const radius = Math.max(size.length() / 2, 0.001)
  const fov = (camera.fov * Math.PI) / 180
  const fitHeight = radius / Math.sin(fov / 2)
  const fitWidth = fitHeight / Math.max(camera.aspect, 0.5)
  const distance = Math.max(fitHeight, fitWidth) * 0.82

  const target = new Vector3(0, size.y * 0.45, 0)
  const direction = new Vector3(0.62, 0.28, 0.78).normalize()

  controls.target.copy(target)
  camera.position.copy(target).addScaledVector(direction, distance)
  camera.near = distance / 100
  camera.far = distance * 20
  camera.updateProjectionMatrix()

  controls.minDistance = distance * 0.4
  controls.maxDistance = distance * 2
  controls.update()
  return { position: camera.position.clone(), target: target.clone() }
}
