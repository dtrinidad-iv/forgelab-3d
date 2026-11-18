/**
 * Plays the model's authored "ride" clip (glTF animation, like an open/close animation from CAD).
 * Tracks bind to nodes by name; after a part swap call rebind() so the new parts animate too.
 */
import { type AnimationAction, type AnimationClip, AnimationMixer, type Object3D } from 'three'

export class RidePlayer {
  private mixer: AnimationMixer
  private action: AnimationAction | null = null
  private readonly clip: AnimationClip | undefined

  constructor(private readonly root: Object3D, clipName = 'ride') {
    this.mixer = new AnimationMixer(root)
    this.clip = root.animations.find((c) => c.name === clipName)
  }

  get available() {
    return Boolean(this.clip)
  }

  get playing() {
    return Boolean(this.action?.isRunning())
  }

  play() {
    if (!this.clip) return
    this.recordRestPose()
    this.action = this.mixer.clipAction(this.clip)
    this.action.play()
  }

  /** Remember each animated node's rest rotation, so part swaps mount new parts at rest. */
  private recordRestPose() {
    for (const track of this.clip?.tracks ?? []) {
      const node = this.root.getObjectByName(track.name.split('.')[0]!)
      if (node && !node.userData.baseQuaternion) node.userData.baseQuaternion = node.quaternion.clone()
    }
  }

  /** Stops and returns every animated part to its rest pose. */
  stop() {
    this.mixer.stopAllAction()
    this.action = null
  }

  /** Re-bind after parts were swapped (bindings point at the old objects otherwise). */
  rebind() {
    const time = this.action?.time ?? 0
    const wasPlaying = this.playing
    this.mixer.stopAllAction()
    if (this.clip) this.mixer.uncacheClip(this.clip)
    this.mixer.uncacheRoot(this.root)
    this.action = null
    if (wasPlaying) {
      this.play()
      if (this.action) (this.action as AnimationAction).time = time
    }
  }

  update(deltaSeconds: number) {
    if (this.action) this.mixer.update(deltaSeconds)
  }
}
