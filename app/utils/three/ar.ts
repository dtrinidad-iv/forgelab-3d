/**
 * Mobile AR at 1:1 scale, always showing the CURRENT configuration (no pre-baked files).
 *
 *  - iOS:     AR Quick Look. The live model is exported to USDZ in the browser at tap time
 *             (metres, Y-up, horizontal-plane anchoring) and opened via <a rel="ar">.
 *  - Android: WebXR `immersive-ar` (Chrome + ARCore) places the live Three.js scene on the floor
 *             with hit-testing. (Scene Viewer would need a publicly hosted GLB per configuration.)
 *
 * Limits: procedural shader finishes (Forged Pattern) are not part of USDZ materials, so iOS AR
 * shows their base colour. Device behaviour must be verified on real phones.
 */
import type { Object3D } from 'three'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'

/** True on iOS/iPadOS Safari (and in-app browsers) that support AR Quick Look. */
export function supportsQuickLook(): boolean {
  if (typeof document === 'undefined') return false
  const a = document.createElement('a')
  return Boolean(a.relList?.supports?.('ar'))
}

/** True when the browser can start a WebXR AR session (e.g. Chrome on ARCore Android). */
export async function supportsWebXRAR(): Promise<boolean> {
  const xr = (typeof navigator !== 'undefined' ? (navigator as Navigator & { xr?: XRSystem }).xr : undefined)
  if (!xr?.isSessionSupported) return false
  try {
    return await xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

/** Exports an object (the configured bike) to a USDZ archive for AR Quick Look. */
export async function exportUsdz(model: Object3D): Promise<Uint8Array> {
  const exporter = new USDZExporter()
  return exporter.parseAsync(model, {
    quickLookCompatible: true,
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
  } as Parameters<USDZExporter['parseAsync']>[1])
}

/** Opens AR Quick Look for a USDZ file (must be called from a user gesture). */
export function openQuickLook(usdz: Uint8Array, fileName = 'forgelab-bike.usdz') {
  const url = URL.createObjectURL(new Blob([usdz as BlobPart], { type: 'model/vnd.usdz+zip' }))
  const a = document.createElement('a')
  a.rel = 'ar'
  a.href = url
  a.download = fileName
  a.appendChild(document.createElement('img')) // Quick Look requires an <img> child
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
