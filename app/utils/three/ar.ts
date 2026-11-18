/**
 * Mobile AR at 1:1 scale, always showing the CURRENT configuration.
 *
 *  - iOS:     AR Quick Look. The live model is exported to USDZ in the browser (metres, Y-up,
 *             horizontal-plane anchoring) and opened via <a rel="ar">.
 *  - Android: live WebXR AR first (worked on e.g. Galaxy S24 Ultra); where it can't start (it failed
 *             silently on another Galaxy), Google Scene Viewer is offered — it needs a public URL to a
 *             GLB, so the server assembles the exact build on demand (/api/ar/model.glb?c=…).
 *             `resizable=false` keeps Scene Viewer at real size.
 *
 * Limits: procedural shader finishes (Forged Pattern) are not part of USDZ/glTF materials, so AR
 * shows their base colour. Device behaviour must be verified on real phones.
 */
import type { Object3D } from 'three'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'
import type { Configuration } from '../../types/configurator'

/** True on iOS/iPadOS Safari (and in-app browsers) that support AR Quick Look. */
export function supportsQuickLook(): boolean {
  if (typeof document === 'undefined') return false
  const a = document.createElement('a')
  return Boolean(a.relList?.supports?.('ar'))
}

/** True when the browser reports it can start a WebXR AR session (Chrome + ARCore). */
export async function supportsWebXRAR(): Promise<boolean> {
  const xr = typeof navigator !== 'undefined' ? (navigator as Navigator & { xr?: XRSystem }).xr : undefined
  if (!xr?.isSessionSupported) return false
  try {
    return await xr.isSessionSupported('immersive-ar')
  } catch {
    return false
  }
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
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

/** base64url (no padding) of the configuration, for the AR model route. */
export function encodeConfiguration(config: Configuration): string {
  const json = JSON.stringify({ selections: config.selections, customPaint: config.customPaint })
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Path of the server-assembled GLB for a configuration (versioned by build for caching). */
export function arModelPath(config: Configuration, buildRef: string): string {
  return `/api/ar/model.glb?c=${encodeConfiguration(config)}&v=${encodeURIComponent(buildRef)}`
}

export const AR_UNAVAILABLE_HASH = '#ar-unavailable'

/**
 * Android intent that opens Google Scene Viewer in AR at real size. If Scene Viewer isn't
 * available, the browser comes back to `fallbackUrl` (we append AR_UNAVAILABLE_HASH to explain).
 */
export function sceneViewerIntent(absoluteModelUrl: string, fallbackUrl: string, title: string): string {
  const params = new URLSearchParams({ file: absoluteModelUrl, mode: 'ar_preferred', resizable: 'false', title })
  return (
    `intent://arvr.google.com/scene-viewer/1.0?${params.toString()}` +
    `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`
  )
}
