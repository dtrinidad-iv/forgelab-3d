/**
 * Procedural "forged / folded-steel" pattern for the frame paint material.
 * Generated per pixel on the GPU from world position: zero texture bytes, continuous across tubes
 * (no UV stretching), endless variation. A uniform (0..1) blends it in, so switching finishes is
 * just a parameter tween — no shader recompile, no scene reload.
 */
import { Color, type MeshPhysicalMaterial, type WebGLProgramParametersWithUniforms } from 'three'

export interface ForgedUniforms {
  uForged: { value: number }
  uForgedDark: { value: Color }
  uForgedLight: { value: Color }
}

export function createForgedUniforms(): ForgedUniforms {
  return {
    uForged: { value: 0 },
    uForgedDark: { value: new Color('#3d4046') },
    uForgedLight: { value: new Color('#b4b8bf') },
  }
}

const NOISE = /* glsl */ `
varying vec3 vForgedPos;
uniform float uForged;
uniform vec3 uForgedDark;
uniform vec3 uForgedLight;
float fgHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fgNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fgHash(i), fgHash(i + vec3(1,0,0)), f.x), mix(fgHash(i + vec3(0,1,0)), fgHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fgHash(i + vec3(0,0,1)), fgHash(i + vec3(1,0,1)), f.x), mix(fgHash(i + vec3(0,1,1)), fgHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fgFbm(vec3 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * fgNoise(p); p *= 2.03; a *= 0.5; } return s; }
// Folded-steel layers: fine directional waves, strongly domain-warped by fractal noise (the
// "flow" of forged layers), plus a finer secondary layer set for depth. Soft, low-contrast edges.
// Anti-aliased: when a band set gets finer than ~a pixel (fwidth of its phase), it fades to its
// average tone instead of shimmering — crisp up close, calm from a distance.
float forgedPattern(vec3 p) {
  vec3 q = p + vec3(fgFbm(p * 14.0), fgFbm(p * 14.0 + 7.3), fgFbm(p * 14.0 + 3.1)) * 0.045;
  float warp = fgFbm(q * 30.0) * 6.0;
  float ph1 = dot(q, vec3(0.62, 0.78, 0.35)) * 380.0 + warp;
  float ph2 = dot(q, vec3(0.7, 0.55, -0.45)) * 1150.0 + warp * 1.6;
  // Fade between ~0.25 and ~0.5 band periods per pixel (Nyquist ≈ π radians of phase per pixel).
  float a1 = 1.0 - smoothstep(1.5, 3.1, fwidth(ph1));
  float a2 = 1.0 - smoothstep(1.5, 3.1, fwidth(ph2));
  float primary = mix(0.5, smoothstep(-0.7, 0.7, sin(ph1)), a1);
  float fine = mix(0.5, smoothstep(-0.6, 0.6, sin(ph2)), a2);
  return primary * 0.75 + fine * 0.25;
}
`

/** Installs the pattern on a material. Safe to call once per material. */
export function installForgedPattern(material: MeshPhysicalMaterial, uniforms: ForgedUniforms) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vForgedPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvForgedPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float forged = uForged > 0.001 ? forgedPattern(vForgedPos) : 0.0;
diffuseColor.rgb = mix(diffuseColor.rgb, mix(uForgedDark, uForgedLight, forged), uForged);`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.55, 0.16, forged), uForged);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, mix(0.55, 1.0, forged), uForged);')
  }
  material.customProgramCacheKey = () => 'forgelab-forged-v1'
}
