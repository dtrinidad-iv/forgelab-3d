/**
 * Exploded assembly view. Each listed node slides from its assembled ("base") position by an
 * offset (metres, in its parent's space — anchors have no rotation, so this is world-aligned).
 * Offsets nest: a handlebar on the stem moves with the stem plus its own offset.
 *
 * The base position is stored in `userData.basePosition`; ConfiguratorScene mounts replacement
 * parts at the BASE position, so swapping parts while exploded keeps everything consistent.
 * Pure Three.js, unit-tested.
 */
import { type Object3D, Quaternion, Vector3 } from 'three'

export type ExplodeOffsets = Record<string, [number, number, number]>

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

export function basePositionOf(node: Object3D): Vector3 {
  const stored = node.userData.basePosition as Vector3 | undefined
  return stored ? stored.clone() : node.position.clone()
}

/** Rest rotation (recorded by animations such as the ride player before they rotate a node). */
export function baseQuaternionOf(node: Object3D): Quaternion {
  const stored = node.userData.baseQuaternion as Quaternion | undefined
  return stored ? stored.clone() : node.quaternion.clone()
}

export class ExplodedView {
  private t = 0
  private from = 0
  private to = 0
  private start = 0
  private readonly offset = new Vector3()

  constructor(
    private readonly root: Object3D,
    private readonly offsets: ExplodeOffsets,
    private readonly duration = 900,
  ) {}

  /** 0 = assembled, 1 = fully exploded. */
  get progress() {
    return this.t
  }

  get target() {
    return this.to === 1
  }

  set(exploded: boolean, now = performance.now()) {
    this.from = this.t
    this.to = exploded ? 1 : 0
    this.start = now
  }

  /** Call every frame. Returns true while anything moved. */
  update(now: number): boolean {
    if (this.t !== this.to) {
      const k = Math.min(Math.max((now - this.start) / this.duration, 0), 1)
      this.t = this.from + (this.to - this.from) * ease(k)
      if (k >= 1) this.t = this.to
      this.apply()
      return true
    }
    // Keep newly mounted parts (swapped in while exploded) in their exploded place.
    if (this.t > 0) this.apply()
    return false
  }

  private apply() {
    for (const [name, [x, y, z]] of Object.entries(this.offsets)) {
      const node = this.root.getObjectByName(name)
      if (!node) continue
      if (!node.userData.basePosition) node.userData.basePosition = node.position.clone()
      node.position.copy(node.userData.basePosition as Vector3).add(this.offset.set(x, y, z).multiplyScalar(this.t))
    }
  }
}
