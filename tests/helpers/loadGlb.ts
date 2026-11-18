import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MissingAssetError } from '~/utils/three/configuratorScene'

const PUBLIC = join(import.meta.dirname, '../../public')

/** Loads a GLB from `public/` by its URL path, like the browser would. */
export async function loadGlb(url: string): Promise<Object3D> {
  let buffer: Buffer
  try {
    buffer = await readFile(join(PUBLIC, url))
  } catch {
    throw new MissingAssetError(`Missing 3D asset: ${url}`)
  }
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '')
  return gltf.scene
}
