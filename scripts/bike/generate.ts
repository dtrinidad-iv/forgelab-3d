/**
 * ForgeLab procedural road bike generator.
 *
 *   npm run generate:bike
 *
 * Writes ORIGINAL, procedurally generated glTF assets (no third-party geometry):
 *   public/models/bicycle/road-bike.glb               default assembled bike (with anchors)
 *   public/models/bicycle/components/<slot>-<id>.glb  swappable component variants
 *   public/models/bicycle/manifest.json               what was generated
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Group, type Object3D } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { Logger, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { buildHandlebar, buildStem, HANDLEBARS, STEMS } from './cockpit'
import { buildBrakes, buildGroupset, GROUPSETS } from './drivetrain'
import { buildFork, buildFrame, buildFrameset, buildSeatpost, FRAMES, SIZE_M, SIZES } from './frame'
import { buildSaddle, SADDLES } from './saddle'
import { buildWheelset, WHEELSETS } from './wheels'

// --- Node polyfill: GLTFExporter uses the browser FileReader for binary output.
class NodeFileReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onloadend?.()
    })
  }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`
      this.onloadend?.()
    })
  }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'public/models/bicycle')
const COPYRIGHT = 'ForgeLab 3D — original procedural asset (scripts/bike). Not derived from third-party models.'

const DEFAULTS = { frame: 'aero-carbon', size: 'm', groupset: 'shimano-demo', wheels: 'carbon-climbing', stem: 'alloy', handlebar: 'carbon-ergo', saddle: 'race-carbon' }

const find = <T extends { id: string }>(list: T[], id: string) => {
  const item = list.find((x) => x.id === id)
  if (!item) throw new Error(`Unknown variant ${id}`)
  return item
}

function buildBike(): Group {
  const bike = new Group()
  bike.name = 'forgelab_road_bike'

  const frameSpec = find(FRAMES, DEFAULTS.frame)
  const frame = buildFrame(frameSpec, SIZE_M)
  bike.add(frame, buildFork(frameSpec, SIZE_M), buildSeatpost(frameSpec, SIZE_M))
  bike.add(...buildGroupset(find(GROUPSETS, DEFAULTS.groupset)).children.slice(), ...buildBrakes())

  // Mounted parts hang off the frame's anchors, so swapping the frame carries them along.
  const mount = (anchorName: string, part: Object3D) => frame.getObjectByName(`anchor_${anchorName}`)!.add(part)
  const wheels = buildWheelset(find(WHEELSETS, DEFAULTS.wheels))
  mount('wheel_front', wheels.getObjectByName('wheel_front')!)
  mount('wheel_rear', wheels.getObjectByName('wheel_rear')!)

  const stem = buildStem(find(STEMS, DEFAULTS.stem))
  stem.getObjectByName('anchor_handlebar')!.add(buildHandlebar(find(HANDLEBARS, DEFAULTS.handlebar)))
  mount('stem', stem)
  mount('saddle', buildSaddle(find(SADDLES, DEFAULTS.saddle)))
  return bike
}

/**
 * Meshopt compression (EXT_meshopt_compression + quantization). Chosen over Draco after measuring
 * the real bike: 2.5 MB → ~540 KB (≈190 KB gzipped, within ~12 KB of Draco) with a ~20 KB decoder,
 * no WASM files to host, fast decode, and it works in Node tests. See docs/performance.md.
 * Node names, empty anchor nodes, material names and clearcoat are preserved.
 */
async function compress(glb: ArrayBuffer): Promise<Uint8Array> {
  await MeshoptEncoder.ready
  const io = new NodeIO()
    .setLogger(new Logger(Logger.Verbosity.WARN))
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
  const doc = await io.readBinary(new Uint8Array(glb))
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  return io.writeBinary(doc)
}

async function exportGlb(object: Object3D, file: string) {
  const exporter = new GLTFExporter()
  const raw = (await exporter.parseAsync(object, { binary: true, onlyVisible: false, copyright: COPYRIGHT } as Parameters<GLTFExporter['parseAsync']>[1])) as ArrayBuffer
  const data = process.env.NO_COMPRESS ? new Uint8Array(raw) : await compress(raw)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, data)
  return data.byteLength
}

function stats(object: Object3D) {
  let meshes = 0
  let triangles = 0
  object.traverse((o) => {
    const mesh = o as unknown as { isMesh?: boolean; geometry?: { index: { count: number } | null; attributes: { position: { count: number } } } }
    if (mesh.isMesh && mesh.geometry) {
      meshes++
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3
    }
  })
  return { meshes, triangles: Math.round(triangles) }
}

async function main() {
  const manifest: Record<string, unknown>[] = []
  const write = async (object: Object3D, path: string, meta: Record<string, string>) => {
    const file = join(OUT, path)
    const bytes = await exportGlb(object, file)
    const s = stats(object)
    manifest.push({ file: `/models/bicycle/${path}`, bytes, ...s, ...meta })
    console.log(`  ✓ ${relative(ROOT, file).padEnd(58)} ${(bytes / 1024).toFixed(0).padStart(5)} KB  ${String(s.triangles).padStart(7)} tris`)
  }

  console.log('ForgeLab bike generator')
  // Start clean so renamed/removed variants never linger in public/.
  await rm(join(OUT, 'components'), { recursive: true, force: true })
  await write(buildBike(), 'road-bike.glb', { kind: 'assembly' })

  for (const spec of FRAMES) {
    for (const size of SIZES) await write(buildFrameset(spec, size), `components/frame-${spec.id}-${size.id}.glb`, { kind: 'component', slot: 'frame', variant: `${spec.id}@${size.id}` })
  }
  for (const spec of GROUPSETS) await write(buildGroupset(spec), `components/groupset-${spec.id}.glb`, { kind: 'component', slot: 'groupset', variant: spec.id })
  for (const spec of WHEELSETS) await write(buildWheelset(spec), `components/wheels-${spec.id}.glb`, { kind: 'component', slot: 'wheels', variant: spec.id })
  for (const spec of HANDLEBARS) await write(wrap(buildHandlebar(spec), `handlebar_${spec.id}`), `components/handlebar-${spec.id}.glb`, { kind: 'component', slot: 'handlebar', variant: spec.id })
  for (const spec of STEMS) await write(wrap(buildStem(spec), `stem_${spec.id}`), `components/stem-${spec.id}.glb`, { kind: 'component', slot: 'stem', variant: spec.id })
  for (const spec of SADDLES) await write(wrap(buildSaddle(spec), `saddle_${spec.id}`), `components/saddle-${spec.id}.glb`, { kind: 'component', slot: 'saddle', variant: spec.id })

  await writeFile(
    join(OUT, 'manifest.json'),
    JSON.stringify({ generator: 'scripts/bike/generate.ts', copyright: COPYRIGHT, units: 'metres', up: '+Y', forward: '+X', driveSide: '+Z', defaults: DEFAULTS, assets: manifest }, null, 2),
  )
  console.log(`  ✓ manifest.json (${manifest.length} assets)`)
}

/** Component files use a named root whose child is the slot node (e.g. `handlebar`). */
function wrap(child: Object3D, name: string): Group {
  const g = new Group()
  g.name = name
  g.add(child)
  return g
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
