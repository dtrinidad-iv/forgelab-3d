/**
 * ConfiguratorScene — applies a configuration to a loaded bike model.
 *
 *  - Paint:      one shared MeshPhysicalMaterial takes over every `paint` material; updates are
 *                animated parameter changes — never a scene reload.
 *  - Components: genuine geometry replacement. The variant GLB is loaded (cached), the slot node is
 *                cloned and mounted in place of the current one, preserving its local position,
 *                rotation and scale. Parts mounted on anchors inside the replaced node (e.g. the
 *                handlebar on the stem) move to the new node's matching anchor.
 *  - Materials:  bar tape colour via a shared material.
 *
 * Every call returns what ACTUALLY happened, so the UI never claims a change that didn't occur.
 * Pure Three.js — no Vue — so it is unit-tested in Node against the real GLB files.
 */
import { Color, type Material, type Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D } from 'three'
import type { ComponentId, GroupVisual, ModelAssetMap } from '../../config/assetMap'
import type { GroupId, PaintFinish, PaintSpec } from '../../types/configurator'
import { type AssetMappingResult, resolveAssetMap } from './assetMapping'

export type VisualState = 'applied' | 'loading' | 'unsupported' | 'missing-asset' | 'error'

export interface VisualStatus {
  state: VisualState
  /** What kind of 3D change this group makes, when supported. */
  kind?: GroupVisual['kind']
  message?: string
}

export interface VisualTarget {
  paint?: PaintSpec
  /** Selected option id per group (null = nothing selected). */
  variants: Partial<Record<GroupId, string | null>>
}

/** Loads a GLB and resolves to its scene root. Injected so tests can read from disk. */
export type TemplateLoader = (url: string) => Promise<Object3D>

export class MissingAssetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MissingAssetError'
  }
}

/** Approximate PBR presets — no flake/weave textures, so finishes are visual approximations. */
export const FINISH_PRESETS: Record<PaintFinish, { roughness: number; metalness: number; clearcoat: number; clearcoatRoughness: number }> = {
  matte: { roughness: 0.66, metalness: 0.04, clearcoat: 0, clearcoatRoughness: 0.6 },
  gloss: { roughness: 0.3, metalness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 },
  metallic: { roughness: 0.34, metalness: 0.78, clearcoat: 1, clearcoatRoughness: 0.08 },
}

interface PaintParams {
  color: Color
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
}

const slotKey = (slot: string, variant: string) => `${slot}|${variant}`

function meshesOf(root: Object3D): Mesh[] {
  const out: Mesh[] = []
  root.traverse((o) => (o as Mesh).isMesh && out.push(o as Mesh))
  return out
}

export class ConfiguratorScene {
  readonly paintMaterial = new MeshPhysicalMaterial({ name: 'forgelab_paint' })
  readonly tapeMaterial = new MeshStandardMaterial({ name: 'forgelab_bar_tape' })

  private mapping: AssetMappingResult
  private readonly templates = new Map<string, Promise<Object3D>>()
  /** Detached component instances kept for instant re-selection. */
  private readonly stash = new Map<string, Object3D>()
  /** Option currently shown per component/material group. */
  private readonly shown = new Map<GroupId, string>()
  private readonly requests = new Map<GroupId, number>()
  private paintTween: { from: PaintParams; to: PaintParams; start: number; duration: number } | null = null
  private disposed = false

  constructor(
    private readonly root: Object3D,
    private readonly map: ModelAssetMap,
    private readonly loadTemplate: TemplateLoader,
  ) {
    this.mapping = resolveAssetMap(root, map)
    // Start from the model's own paint so the first transition is smooth.
    const original = this.mapping.materials.paint[0] as Partial<MeshPhysicalMaterial> | undefined
    if (original?.color) this.paintMaterial.color.copy(original.color)
    this.takeOverMaterials(map.materials.paint, this.paintMaterial, root)
    this.takeOverMaterials(map.materials.barTape, this.tapeMaterial, root)
    // The originals are no longer referenced by any mesh.
    ;[...this.mapping.materials.paint, ...this.mapping.materials.barTape].forEach((m) => m.dispose())
    for (const [group, option] of Object.entries(map.bakedVariants)) this.shown.set(group as GroupId, option!)
  }

  getMapping(): AssetMappingResult {
    return this.mapping
  }

  /** Option currently visible for a group (component/material groups only). */
  shownVariant(group: GroupId): string | undefined {
    return this.shown.get(group)
  }

  /** Applies a whole target. Groups are processed in parallel; returns a status per group. */
  async apply(target: VisualTarget, opts: { animate?: boolean } = {}): Promise<Partial<Record<GroupId, VisualStatus>>> {
    const groups = new Set<GroupId>([...(Object.keys(target.variants) as GroupId[]), ...(target.paint ? (['paint'] as GroupId[]) : [])])
    const entries = await Promise.all(
      [...groups].map(async (group) => {
        const status = group === 'paint' ? this.applyPaint(target.paint, opts.animate ?? true) : await this.setVariant(group, target.variants[group] ?? null)
        return [group, status] as const
      }),
    )
    return Object.fromEntries(entries)
  }

  applyPaint(paint: PaintSpec | undefined, animate = true): VisualStatus {
    if (!this.map.visuals.paint) return this.unsupported('paint')
    if (!this.uses(this.paintMaterial)) return { state: 'missing-asset', kind: 'paint', message: 'This model has no paintable frame material.' }
    if (!paint) return { state: 'applied', kind: 'paint' }

    const preset = FINISH_PRESETS[paint.finish]
    const to: PaintParams = { color: new Color(paint.color), ...preset }
    if (animate) {
      this.paintTween = { from: this.currentPaint(), to, start: performance.now(), duration: 450 }
    } else {
      this.paintTween = null
      this.setPaint(to)
    }
    return { state: 'applied', kind: 'paint', message: 'Live paint preview — finishes are approximated without texture maps.' }
  }

  async setVariant(group: GroupId, optionId: string | null): Promise<VisualStatus> {
    const visual = this.map.visuals[group]
    if (!visual || visual.kind === 'paint') return this.unsupported(group)

    if (visual.kind === 'derived') {
      // Only claim it if the source group's mounted variant really is the one for this option.
      const shown = this.shown.get(visual.from) ?? ''
      const key = optionId ?? 'm'
      return shown.endsWith(`@${key}`)
        ? { state: 'applied', kind: 'component', message: visual.note }
        : { state: 'missing-asset', kind: 'component', message: `The ${visual.from} for this ${group} is not shown.` }
    }

    if (!optionId) return { state: 'applied', kind: visual.kind }

    if (visual.kind === 'material') {
      const spec = visual.variants[optionId]
      if (!spec) return { state: 'missing-asset', kind: 'material', message: 'No 3D material is defined for this option.' }
      if (!this.uses(this.tapeMaterial)) return { state: 'missing-asset', kind: 'material', message: 'This model has no bar-tape material.' }
      this.tapeMaterial.color.set(spec.color)
      this.tapeMaterial.roughness = spec.roughness
      this.tapeMaterial.metalness = spec.metalness ?? 0
      this.shown.set(group, optionId)
      return { state: 'applied', kind: 'material' }
    }

    // ---- component replacement ----
    if (this.shown.get(group) === optionId) return { state: 'applied', kind: 'component' }
    const url = visual.variants[optionId]
    if (!url) return { state: 'missing-asset', kind: 'component', message: 'No 3D model exists for this option.' }

    const request = (this.requests.get(group) ?? 0) + 1
    this.requests.set(group, request)

    let parts: Object3D[]
    try {
      parts = await Promise.all(visual.slots.map((slot) => this.obtain(slot, optionId, url)))
    } catch (err) {
      if (err instanceof MissingAssetError) return { state: 'missing-asset', kind: 'component', message: err.message }
      return { state: 'error', kind: 'component', message: err instanceof Error ? err.message : String(err) }
    }

    // A newer selection for this group (or disposal) superseded this one: keep parts for later.
    if (this.disposed || this.requests.get(group) !== request) {
      visual.slots.forEach((slot, i) => this.stash.set(slotKey(slot, optionId), parts[i]!))
      return { state: 'applied', kind: 'component' }
    }

    const previous = this.shown.get(group)
    try {
      visual.slots.forEach((slot, i) => {
        const removed = this.replace(slot, parts[i]!)
        if (previous) this.stash.set(slotKey(slot, previous), removed)
      })
    } catch (err) {
      return { state: 'missing-asset', kind: 'component', message: err instanceof Error ? err.message : String(err) }
    }

    this.shown.set(group, optionId)
    this.mapping = resolveAssetMap(this.root, this.map)
    // Newly mounted parts arrive with their own copies of the named materials.
    this.takeOverMaterials(this.map.materials.paint, this.paintMaterial, this.root)
    this.takeOverMaterials(this.map.materials.barTape, this.tapeMaterial, this.root)
    return { state: 'applied', kind: 'component' }
  }

  /** Advance animations. Call once per frame. */
  update(now: number) {
    if (!this.paintTween) return
    const { from, to, start, duration } = this.paintTween
    const t = Math.min((now - start) / duration, 1)
    const e = 1 - Math.pow(1 - t, 3)
    this.setPaint({
      color: from.color.clone().lerp(to.color, e),
      roughness: from.roughness + (to.roughness - from.roughness) * e,
      metalness: from.metalness + (to.metalness - from.metalness) * e,
      clearcoat: from.clearcoat + (to.clearcoat - from.clearcoat) * e,
      clearcoatRoughness: from.clearcoatRoughness + (to.clearcoatRoughness - from.clearcoatRoughness) * e,
    })
    if (t >= 1) this.paintTween = null
  }

  /** Frees everything this scene created or cached (not the root model itself). */
  async dispose() {
    this.disposed = true
    this.paintMaterial.dispose()
    this.tapeMaterial.dispose()
    const freed = new Set<unknown>()
    const free = (o: Object3D) =>
      meshesOf(o).forEach((m) => {
        if (!freed.has(m.geometry)) m.geometry.dispose()
        freed.add(m.geometry)
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as Material[]) {
          if (!freed.has(mat)) mat.dispose()
          freed.add(mat)
        }
      })
    this.stash.forEach(free)
    this.stash.clear()
    const templates = await Promise.allSettled([...this.templates.values()])
    templates.forEach((r) => r.status === 'fulfilled' && free(r.value))
    this.templates.clear()
  }

  // ------------------------------------------------------------------ internals

  /** True when at least one mesh in the bike currently renders with `material`. */
  private uses(material: Material): boolean {
    return meshesOf(this.root).some((m) => (Array.isArray(m.material) ? m.material.includes(material) : m.material === material))
  }

  private unsupported(group: GroupId): VisualStatus {
    return { state: 'unsupported', message: this.map.notes[group] ?? 'Not visualised in 3D.' }
  }

  private currentPaint(): PaintParams {
    const m = this.paintMaterial
    return { color: m.color.clone(), roughness: m.roughness, metalness: m.metalness, clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness }
  }

  private setPaint(p: PaintParams) {
    const m = this.paintMaterial
    m.color.copy(p.color)
    m.roughness = p.roughness
    m.metalness = p.metalness
    m.clearcoat = p.clearcoat
    m.clearcoatRoughness = p.clearcoatRoughness
  }

  /** Points every mesh using one of the named materials at `replacement`. */
  private takeOverMaterials(names: string[], replacement: Material, scope: Object3D) {
    const wanted = new Set(names.map((n) => n.toLowerCase()))
    for (const mesh of meshesOf(scope)) {
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => (wanted.has(m.name.toLowerCase()) ? replacement : m))
      } else if (mesh.material !== replacement && wanted.has(mesh.material.name.toLowerCase())) {
        mesh.material = replacement
      }
    }
  }

  private loadTemplateCached(url: string): Promise<Object3D> {
    let p = this.templates.get(url)
    if (!p) {
      p = this.loadTemplate(url)
      this.templates.set(url, p)
      p.catch(() => this.templates.delete(url)) // allow retry after a failure
    }
    return p
  }

  /** A fresh (or stashed) instance of `slot` from the variant file. */
  private async obtain(slot: ComponentId, variant: string, url: string): Promise<Object3D> {
    const stashed = this.stash.get(slotKey(slot, variant))
    if (stashed) {
      this.stash.delete(slotKey(slot, variant))
      return stashed
    }
    const template = await this.loadTemplateCached(url)
    const node = template.getObjectByName(slot)
    if (!node) throw new MissingAssetError(`3D asset ${url} has no "${slot}" part.`)
    const instance = node.clone(true)
    instance.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return instance
  }

  /** Mounts `replacement` where `slot` currently is. Returns the detached old node. */
  private replace(slot: ComponentId, replacement: Object3D): Object3D {
    const current = this.mapping.components[slot]
    if (!current?.parent) throw new MissingAssetError(`The base model has no "${slot}" to replace.`)
    const parent = current.parent

    replacement.position.copy(current.position)
    replacement.quaternion.copy(current.quaternion)
    replacement.scale.copy(current.scale)

    // Re-home parts mounted on anchors inside the outgoing node (stem → handlebar).
    current.traverse((o) => {
      if (o === current || !o.name.startsWith('anchor_')) return
      const target = replacement.getObjectByName(o.name)
      if (target) [...o.children].forEach((child) => target.add(child))
    })

    parent.add(replacement)
    parent.remove(current)
    return current
  }
}
