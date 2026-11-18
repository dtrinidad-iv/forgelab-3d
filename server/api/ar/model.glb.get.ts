import type { Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { FORGELAB_ROAD_BIKE } from '~/config/assetMap'
import { sanitizeConfiguration } from '~/utils/configuration'
import { assembleConfiguration } from '~/utils/three/assembleConfiguration'
import { exportGlb } from '~/utils/three/exportGlb'

/**
 * GET /api/ar/model.glb?c=<base64url JSON configuration>
 * Assembles the EXACT configured bike server-side (same swap engine as the viewer) and returns a
 * plain GLB for Android Scene Viewer, which needs a public URL to a file. Deterministic per
 * configuration + build, so it is safely cacheable.
 */
export default defineEventHandler(async (event) => {
  const raw = getQuery(event).c
  let input: unknown
  try {
    input = JSON.parse(Buffer.from(String(raw ?? ''), 'base64url').toString('utf8'))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid configuration parameter' })
  }
  const config = sanitizeConfiguration(input)

  // Model files are static assets: fetch them from this same deployment.
  // Behind Netlify/CDN proxies, trust the forwarded host/protocol for the public origin.
  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  const templates = new Map<string, Promise<Object3D>>()
  const load = (url: string) => {
    let p = templates.get(url)
    if (!p) {
      p = (async () => {
        const res = await fetch(new URL(url, origin))
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
        const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await res.arrayBuffer(), '')
        return gltf.scene
      })()
      templates.set(url, p)
    }
    return p
  }

  let glb: ArrayBuffer
  try {
    glb = await exportGlb(await assembleConfiguration(FORGELAB_ROAD_BIKE, config, load))
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: err instanceof Error ? err.message : 'Assembly failed' })
  }

  setResponseHeaders(event, {
    'content-type': 'model/gltf-binary',
    'cache-control': 'public, max-age=86400',
    'access-control-allow-origin': '*',
  })
  return Buffer.from(glb)
})
