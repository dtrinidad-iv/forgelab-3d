import { type Mesh, type Object3D, Texture } from 'three'
import { describe, expect, it } from 'vitest'
import { addConfigurationToCart, toOrderConfiguration } from '~/commerce/addToCart'
import { createMockCart, quoteOrder } from '~/commerce/mock/service'
import type { CommerceProvider } from '~/commerce/types'
import { FORGELAB_ROAD_BIKE as MAP } from '~/config/assetMap'
import type { UniquePiece } from '~/types/pieces'
import { sanitizeConfiguration } from '~/utils/configuration'
import { ConfiguratorScene } from '~/utils/three/configuratorScene'
import { planarTopUv } from '~/utils/three/planarUv'
import { loadGlb } from './helpers/loadGlb'

const piece = (over: Partial<UniquePiece> = {}): UniquePiece => ({ id: 'p-abc123def456', name: 'Hide No. 7', story: '', price: 120, createdAt: '2026-11-18T10:00:00Z', sold: false, imageType: 'image/jpeg', ...over })

describe('one-of-a-kind covers — commerce', () => {
  const config = sanitizeConfiguration({ selections: { size: 'm' }, uniqueCover: 'p-abc123def456' })
  const order = toOrderConfiguration(config, 'm', 'USD')

  it('the server prices the piece from its own record and adds an inventory-of-one line', () => {
    const quote = quoteOrder(order, new Date(), { pieces: new Map([['p-abc123def456', piece()]]) })
    const line = quote.lines.find((l) => l.sku === 'FL-COVER-P-ABC123DEF456')!
    expect(line.price.amount).toBe(120)
    expect(line.available).toBe(true)
    expect(line.attributes).toContainEqual({ key: 'Unique piece', value: 'p-abc123def456' })
  })

  it('sold or deleted pieces cannot be bought', async () => {
    expect(quoteOrder(order, new Date(), { pieces: new Map([['p-abc123def456', piece({ sold: true })]]) }).lines.at(-1)!.available).toBe(false)
    expect(() => quoteOrder(order, new Date(), { pieces: new Map() })).toThrow(/no longer available/)
    expect(() => quoteOrder({ ...order, uniqueCover: '../../etc' })).toThrow(/Invalid unique piece/)
    expect(() => createMockCart({ lines: [{ merchandiseId: 'mock://piece/p-abc123def456', quantity: 1, attributes: [] }] }, 1, { pieces: new Map([['p-abc123def456', piece({ sold: true })]]) })).toThrow(/no longer available/)
  })

  it('cart prices the piece server-side in the requested currency', async () => {
    const pieces = new Map([['p-abc123def456', piece()]])
    const provider: CommerceProvider = {
      id: 'mock', label: 't',
      quote: async (c) => quoteOrder(JSON.parse(JSON.stringify(c)), new Date(), { pieces }),
      catalog: { resolveVariants: async () => [] },
      cart: { createCart: async (lines, attributes, currency) => createMockCart({ lines, attributes, currency }, 1, { pieces }) },
      checkout: { isDemo: true, checkoutUrl: (c) => c.checkoutUrl },
    }
    const { quote, cart } = await addConfigurationToCart(provider, { ...order, currency: 'GBP' })
    expect(cart.cost.total).toEqual(quote.total)
    expect(cart.lines.find((l) => l.sku.startsWith('FL-COVER-'))!.cost).toEqual({ amount: Math.round(120 * 0.79), currencyCode: 'GBP' })
  })
})

describe('one-of-a-kind covers — 3D (real GLBs)', () => {
  const coverMeshes = (root: Object3D) => {
    const out: Mesh[] = []
    root.traverse((o) => (o as Mesh).isMesh && o.parent?.name === 'saddle' && o.name.includes('saddle_cover') && out.push(o as Mesh))
    return out
  }

  it('planar UVs cover the part exactly once (0..1)', async () => {
    const root = await loadGlb(MAP.url)
    const g = planarTopUv(coverMeshes(root)[0]!.geometry)
    const uv = g.attributes.uv!.array as Float32Array
    expect(Math.min(...uv)).toBeCloseTo(0, 5)
    expect(Math.max(...uv)).toBeCloseTo(1, 5)
  })

  it('applies the photo to the saddle cover, survives a saddle swap, and restores the original', async () => {
    const root = await loadGlb(MAP.url)
    const scene = new ConfiguratorScene(root, MAP, loadGlb)
    const original = coverMeshes(root)[0]!
    const originalMaterial = original.material
    const originalGeometry = original.geometry
    const tex = new Texture()

    expect(scene.setCoverTexture(tex)).toEqual({ state: 'applied', kind: 'material' })
    expect(original.material).toBe(scene.coverMaterial)
    expect(scene.coverMaterial.map).toBe(tex)
    expect(original.geometry.attributes.uv).toBeTruthy()

    await scene.setVariant('saddle', 'saddle-comfort')
    expect(coverMeshes(root)[0]!.material).toBe(scene.coverMaterial) // new saddle shows the piece too

    await scene.setVariant('saddle', 'saddle-race')
    scene.setCoverTexture(null)
    expect(original.material).toBe(originalMaterial)
    expect(original.geometry).toBe(originalGeometry)
  })
})
