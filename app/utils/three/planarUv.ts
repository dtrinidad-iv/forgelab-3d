import { BufferAttribute, type BufferGeometry } from 'three'

/**
 * Projects UVs straight down (top view, X → u, Z → v) across the geometry's bounding box, so a
 * photo covers the whole part exactly once — the same technique as mapping a photographed unique
 * piece onto its mesh. Returns a NEW geometry; the original is untouched (it may be shared).
 */
export function planarTopUv(geometry: BufferGeometry): BufferGeometry {
  const g = geometry.clone()
  const pos = g.attributes.position!
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const sx = maxX - minX || 1
  const sz = maxZ - minZ || 1
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - minX) / sx
    uv[i * 2 + 1] = 1 - (pos.getZ(i) - minZ) / sz
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  return g
}
