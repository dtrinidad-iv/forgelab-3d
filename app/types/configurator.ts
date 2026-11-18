/**
 * Domain types for the ForgeLab configurator.
 * Catalog data: `config/`. State: `composables/`. Pure logic: `utils/`.
 */

export type StepId = 'frame' | 'size' | 'paint' | 'groupset' | 'wheels' | 'cockpit' | 'review'

/** A selectable category. A step contains one or more groups (Cockpit has four). */
export type GroupId =
  | 'frame'
  | 'size'
  | 'paint'
  | 'groupset'
  | 'wheels'
  | 'handlebar'
  | 'stem'
  | 'barTape'
  | 'saddle'

export interface StepDefinition {
  id: StepId
  label: string
  title: string
  description: string
  /** Option groups shown on this step, in order. Empty for Review. */
  groups: GroupId[]
}

export interface GroupDefinition {
  id: GroupId
  label: string
  /** Required groups must have a selection before the user can continue. */
  required: boolean
}

export type PaintFinish = 'matte' | 'gloss' | 'metallic'

/** PBR parameters for a paint. Applied to the frame material once the real model exists. */
export interface PaintSpec {
  color: string
  finish: PaintFinish
}

export interface CatalogOption {
  id: string
  name: string
  /** Short one-line descriptor shown under the name. */
  tagline: string
  /** Key specs shown in cards and review. Fictional demo specs. */
  specs: string[]
  /** Price in USD for this component (absolute, not a delta). */
  price: number
  badge?: string
  /** Paint options only. `custom: true` means the colour comes from the customer. */
  paint?: PaintSpec & { custom?: boolean }
  /** Frame options only: frameset weight in grams. */
  weightGrams?: number
}

export type Selections = Record<GroupId, string | null>

export interface Configuration {
  selections: Selections
  /** Only meaningful when the selected paint is the custom option. */
  customPaint: PaintSpec
}
