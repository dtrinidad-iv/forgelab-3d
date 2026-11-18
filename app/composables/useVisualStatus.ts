import type { GroupId } from '~/types/configurator'
import type { VisualStatus } from '~/utils/three/configuratorScene'

/**
 * What the 3D viewer ACTUALLY did for each group, as reported by ProductViewer.
 * Empty until the viewer has loaded (and always empty during SSR).
 */
export function useVisualStatus() {
  const statuses = useState<Partial<Record<GroupId, VisualStatus>>>('forgelab-visual-status', () => ({}))
  const set = (next: Partial<Record<GroupId, VisualStatus>>) => (statuses.value = next)
  return { statuses: readonly(statuses), set }
}
