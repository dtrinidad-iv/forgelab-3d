import type { Group, Object3D, PerspectiveCamera } from 'three'
import { Box3, Mesh, Vector3 } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

/** Thrown when the model file simply isn't there yet (expected during early development). */
export class ModelNotFoundError extends Error {
  constructor(url: string) {
    super(`Model not found: ${url}`)
    this.name = 'ModelNotFoundError'
  }
}

/**
 * Loads a .glb (Meshopt-compressed or plain) with a SINGLE request. Resolves to the scene root, or throws:
 *  - ModelNotFoundError  → file missing (caller should show the placeholder / report a missing asset)
 *  - Error               → file exists but failed to download or parse (caller should show error UI)
 */
export async function loadModel(
  url: string,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<Group> {
  const res = await fetch(url, { signal })
  const type = res.headers.get('content-type') ?? ''
  // Missing = a real 404, or an HTML fallback page served with 200 (SPA-style hosting).
  if (res.status === 404 || (res.ok && type.includes('text/html'))) throw new ModelNotFoundError(url)
  // A login wall (e.g. Netlify visitor access) is NOT a missing file — say what actually happened.
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Access to ${url} was denied (${res.status}). The hosting site requires a login — check the host's visitor access settings.`)
  }
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`)

  const buffer = await readWithProgress(res, onProgress)
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.parseAsync(buffer, url.slice(0, url.lastIndexOf('/') + 1))

  gltf.scene.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  gltf.scene.animations = gltf.animations // authored clips (e.g. "ride") travel with the scene
  return gltf.scene
}

async function readWithProgress(res: Response, onProgress?: (ratio: number) => void): Promise<ArrayBuffer> {
  const total = Number(res.headers.get('content-length')) || 0
  if (!onProgress || !total || !res.body) return res.arrayBuffer()
  const reader = res.body.getReader()
  const out = new Uint8Array(total)
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (received + value.length > out.length) return concatFallback(out.subarray(0, received), value, reader)
    out.set(value, received)
    received += value.length
    onProgress(received / total)
  }
  return out.buffer.slice(0, received)
}

/** content-length was wrong (e.g. compressed transfer): collect the rest without pre-sizing. */
async function concatFallback(head: Uint8Array, chunk: Uint8Array, reader: ReadableStreamDefaultReader<Uint8Array>): Promise<ArrayBuffer> {
  const parts = [head.slice(), chunk]
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
  }
  return new Blob(parts as BlobPart[]).arrayBuffer()
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
