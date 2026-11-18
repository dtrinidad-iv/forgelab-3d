/**
 * Exports an object to a plain, widely compatible GLB (for Android Scene Viewer):
 *  - geometry is DEQUANTIZED to float32 (our sources are Meshopt-quantized; plain viewers may not
 *    support EXT_meshopt_compression / KHR_mesh_quantization)
 *  - works in Node (server route, tests) via a tiny FileReader polyfill used by GLTFExporter.
 */
import { BufferAttribute, type BufferGeometry, type Mesh, type Object3D } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

function ensureFileReader() {
  const g = globalThis as unknown as { FileReader?: unknown }
  if (typeof g.FileReader !== 'undefined') return
  g.FileReader = class {
    result: ArrayBuffer | string | null = null
    onloadend: (() => void) | null = null
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buf) => {
        this.result = buf
        this.onloadend?.()
      })
    }
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then((buf) => {
        let binary = ''
        const bytes = new Uint8Array(buf)
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
        this.onloadend?.()
      })
    }
  }
}

type AnyAttribute = BufferGeometry['attributes'][string]
const getters = ['getX', 'getY', 'getZ', 'getW'] as const

function toFloat32(attribute: AnyAttribute): BufferAttribute {
  const { count, itemSize } = attribute
  const out = new Float32Array(count * itemSize)
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < itemSize; k++) out[i * itemSize + k] = attribute[getters[k]!](i) // getX… denormalize
  }
  return new BufferAttribute(out, itemSize)
}

/** Converts every quantized / interleaved vertex attribute to plain float32, in place. */
export function dequantize(root: Object3D) {
  const done = new Set<BufferGeometry>()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || done.has(mesh.geometry)) return
    done.add(mesh.geometry)
    for (const [name, attr] of Object.entries(mesh.geometry.attributes)) {
      const plain = !('isInterleavedBufferAttribute' in attr && attr.isInterleavedBufferAttribute) && attr.array instanceof Float32Array && !attr.normalized
      if (!plain) {
        const out = toFloat32(attr)
        // Quantized normals decode to almost-unit length; glTF requires unit normals.
        if (name === 'normal') {
          const v = out.array as Float32Array
          for (let i = 0; i < v.length; i += 3) {
            const len = Math.hypot(v[i]!, v[i + 1]!, v[i + 2]!) || 1
            v[i]! /= len
            v[i + 1]! /= len
            v[i + 2]! /= len
          }
        }
        mesh.geometry.setAttribute(name, out)
      }
    }
  })
}

export async function exportGlb(root: Object3D): Promise<ArrayBuffer> {
  ensureFileReader()
  dequantize(root)
  return (await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true })) as ArrayBuffer
}
