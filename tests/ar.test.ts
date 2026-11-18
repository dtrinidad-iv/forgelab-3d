import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js'
import { describe, expect, it } from 'vitest'
import { FORGELAB_ROAD_BIKE as MAP } from '~/config/assetMap'
import { exportUsdz } from '~/utils/three/ar'
import { ConfiguratorScene } from '~/utils/three/configuratorScene'
import { loadGlb } from './helpers/loadGlb'

describe('AR Quick Look export (USDZ)', () => {
  it('exports the CURRENT configuration (after part swaps) as a valid USDZ at 1:1 scale', async () => {
    const root = await loadGlb(MAP.url)
    const scene = new ConfiguratorScene(root, MAP, loadGlb)
    await scene.setVariant('wheels', 'carbon-deep')
    await scene.setVariant('frame', 'steel@xl')
    scene.applyPaint({ color: '#C8102E', finish: 'gloss' }, false)

    const usdz = await exportUsdz(root)
    expect(usdz.byteLength).toBeGreaterThan(50_000)
    expect(String.fromCharCode(usdz[0]!, usdz[1]!)).toBe('PK') // zip archive

    const files = unzipSync(usdz)
    const names = Object.keys(files)
    expect(names[0]).toBe('model.usda') // Quick Look requires the model file first
    const usda = strFromU8(files['model.usda']!)
    expect(usda).toContain('metersPerUnit = 1') // real-world scale
    expect(usda).toContain('upAxis = "Y"')
    expect(usda).toContain('preliminary:anchoring:type = "plane"')
    // the swapped parts are what gets exported
    expect(usda).toMatch(/wheel_front/)
    expect(usda).toMatch(/carbon_gloss/) // deep-section rim material
    expect(usda).toMatch(/alloy_silver/) // steel frame lugs

    // Meshopt-quantized vertices must be exported DEQUANTIZED (floats, not raw int16 up to 32767).
    // Geometry lives in geometries/*.usda; points are local to each Xform (which carries any scale).
    const geometry = names.filter((n) => n.startsWith('geometries/')).map((n) => strFromU8(files[n]!)).join('\n')
    expect(names.filter((n) => n.startsWith('geometries/')).length).toBeGreaterThan(10)
    const nums = [...geometry.matchAll(/point3f\[\] points = \[([^\]]+)\]/g)].flatMap((m) => m[1]!.match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number))
    expect(nums.length).toBeGreaterThan(1000)
    expect(nums.reduce((m, n) => Math.max(m, Math.abs(n)), 0)).toBeLessThan(5)
  })
})
