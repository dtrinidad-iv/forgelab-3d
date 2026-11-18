/**
 * Builds the 3D model for a configuration WITHOUT a browser: base model + component swaps + paint,
 * via the same ConfiguratorScene the viewer uses. Used by the Android AR route (Scene Viewer needs a
 * GLB file of the exact build at a public URL) and by tests.
 */
import type { Object3D } from 'three'
import { type ModelAssetMap, visualOptionFor } from '../../config/assetMap'
import { GROUP_IDS } from '../../config/catalog'
import type { Configuration } from '../../types/configurator'
import { resolvePaint } from '../configuration'
import { ConfiguratorScene, type TemplateLoader, type VisualTarget } from './configuratorScene'

export function visualTargetFor(map: ModelAssetMap, config: Configuration): VisualTarget {
  return {
    paint: resolvePaint(config),
    variants: Object.fromEntries(GROUP_IDS.filter((g) => g !== 'paint').map((g) => [g, visualOptionFor(map, g, config.selections)])),
  }
}

/** Returns the assembled root, or throws if any part could not be shown (never a silently wrong model). */
export async function assembleConfiguration(map: ModelAssetMap, config: Configuration, load: TemplateLoader): Promise<Object3D> {
  const root = await load(map.url)
  const scene = new ConfiguratorScene(root, map, load)
  const statuses = await scene.apply(visualTargetFor(map, config), { animate: false })
  const failed = Object.entries(statuses).filter(([, s]) => s && (s.state === 'missing-asset' || s.state === 'error'))
  if (failed.length) throw new Error(`Could not assemble: ${failed.map(([g, s]) => `${g} (${s!.message ?? s!.state})`).join(', ')}`)
  return root
}
