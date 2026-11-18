/**
 * Viewer lighting presets with smooth transitions. Operates on the lights created by createScene.
 */
import { Color, type Scene, type ShadowMaterial, Vector3 } from 'three'
import type { ViewerContext } from './createScene'

export type LightingPresetId = 'studio' | 'daylight' | 'dramatic'

interface LightSpec {
  intensity: number
  color: string
  position: [number, number, number]
}

export interface LightingPreset {
  id: LightingPresetId
  label: string
  exposure: number
  environment: number
  hemi: { intensity: number; sky: string; ground: string }
  key: LightSpec
  rim: LightSpec
  shadow: number
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'studio',
    label: 'Studio',
    exposure: 0.82,
    environment: 0.75,
    hemi: { intensity: 0.35, sky: '#ffffff', ground: '#d9d4cc' },
    key: { intensity: 1.4, color: '#ffffff', position: [1.6, 3.2, 2.2] },
    rim: { intensity: 0, color: '#cfe0ff', position: [-2, 1.6, -3] },
    shadow: 0.12,
  },
  {
    id: 'daylight',
    label: 'Daylight',
    exposure: 0.92,
    environment: 0.9,
    hemi: { intensity: 0.75, sky: '#fff4e2', ground: '#cbbfa8' },
    key: { intensity: 2.3, color: '#fff0d4', position: [-2.4, 4.6, 1.6] },
    rim: { intensity: 0.35, color: '#dbe8ff', position: [2.4, 2, -2.6] },
    shadow: 0.22,
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    exposure: 0.66,
    environment: 0.22,
    hemi: { intensity: 0.06, sky: '#ffffff', ground: '#b9b2a6' },
    key: { intensity: 2.8, color: '#ffffff', position: [0.6, 3.6, 3.1] },
    rim: { intensity: 3.2, color: '#cfe0ff', position: [-2.2, 1.4, -3.2] },
    shadow: 0.32,
  },
]

interface State {
  exposure: number
  environment: number
  hemi: number
  hemiSky: Color
  hemiGround: Color
  key: number
  keyColor: Color
  keyPos: Vector3
  rim: number
  rimColor: Color
  rimPos: Vector3
  shadow: number
}

const toState = (p: LightingPreset): State => ({
  exposure: p.exposure,
  environment: p.environment,
  hemi: p.hemi.intensity,
  hemiSky: new Color(p.hemi.sky),
  hemiGround: new Color(p.hemi.ground),
  key: p.key.intensity,
  keyColor: new Color(p.key.color),
  keyPos: new Vector3(...p.key.position),
  rim: p.rim.intensity,
  rimColor: new Color(p.rim.color),
  rimPos: new Vector3(...p.rim.position),
  shadow: p.shadow,
})

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export class LightingRig {
  private current: State
  private tween: { from: State; to: State; start: number; duration: number } | null = null

  constructor(private readonly ctx: ViewerContext) {
    this.current = toState(LIGHTING_PRESETS[0]!)
    this.write(this.current)
  }

  set(id: LightingPresetId, now = performance.now(), duration = 600) {
    const preset = LIGHTING_PRESETS.find((p) => p.id === id)
    if (!preset) return
    this.tween = { from: this.snapshot(), to: toState(preset), start: now, duration }
  }

  update(now: number) {
    if (!this.tween) return
    const { from, to, start, duration } = this.tween
    const t = Math.min((now - start) / duration, 1)
    const e = 1 - Math.pow(1 - t, 3)
    this.current = {
      exposure: lerp(from.exposure, to.exposure, e),
      environment: lerp(from.environment, to.environment, e),
      hemi: lerp(from.hemi, to.hemi, e),
      hemiSky: from.hemiSky.clone().lerp(to.hemiSky, e),
      hemiGround: from.hemiGround.clone().lerp(to.hemiGround, e),
      key: lerp(from.key, to.key, e),
      keyColor: from.keyColor.clone().lerp(to.keyColor, e),
      keyPos: from.keyPos.clone().lerp(to.keyPos, e),
      rim: lerp(from.rim, to.rim, e),
      rimColor: from.rimColor.clone().lerp(to.rimColor, e),
      rimPos: from.rimPos.clone().lerp(to.rimPos, e),
      shadow: lerp(from.shadow, to.shadow, e),
    }
    this.write(this.current)
    if (t >= 1) this.tween = null
  }

  private snapshot(): State {
    const c = this.current
    return { ...c, hemiSky: c.hemiSky.clone(), hemiGround: c.hemiGround.clone(), keyColor: c.keyColor.clone(), keyPos: c.keyPos.clone(), rimColor: c.rimColor.clone(), rimPos: c.rimPos.clone() }
  }

  private write(s: State) {
    const { renderer, ground, lights } = this.ctx
    const scene = this.ctx.scene as Scene
    renderer.toneMappingExposure = s.exposure
    scene.environmentIntensity = s.environment
    lights.hemi.intensity = s.hemi
    lights.hemi.color.copy(s.hemiSky)
    lights.hemi.groundColor.copy(s.hemiGround)
    lights.key.intensity = s.key
    lights.key.color.copy(s.keyColor)
    lights.key.position.copy(s.keyPos)
    lights.rim.intensity = s.rim
    lights.rim.color.copy(s.rimColor)
    lights.rim.position.copy(s.rimPos)
    ;(ground.material as ShadowMaterial).opacity = s.shadow
  }
}
