/**
 * Inspect a GLB/GLTF file and print a Markdown report.
 *
 *   npm run inspect:glb -- public/models/bicycle/road-bike.glb [--out docs/asset-report.md]
 *
 * Works for any model without embedded textures that need a DOM to decode
 * (texture decoding is skipped in Node; materials still report which maps exist).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { formatReport, inspectModel } from '../app/utils/three/inspectModel'

// Node lacks image decoding; stub so the loader doesn't fail on textured models.
const g = globalThis as Record<string, unknown>
g.self ??= globalThis
g.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} })

async function main() {
  const args = process.argv.slice(2)
  const file = args.find((a) => !a.startsWith('--'))
  const outIndex = args.indexOf('--out')
  const out = outIndex >= 0 ? args[outIndex + 1] : undefined
  if (!file) {
    console.error('Usage: npm run inspect:glb -- <file.glb> [--out report.md]')
    process.exit(1)
  }

  const buffer = await readFile(resolve(file))
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(arrayBuffer, '')

  const report = inspectModel(gltf.scene)
  const markdown = formatReport(report, `Asset report — ${basename(file)}`) + `\nGenerator: ${gltf.asset?.generator ?? 'unknown'}${gltf.asset?.copyright ? ` · ${gltf.asset.copyright}` : ''}\n`

  if (out) {
    await writeFile(resolve(out), markdown)
    console.log(`Wrote ${out}`)
  } else {
    console.log(markdown)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
