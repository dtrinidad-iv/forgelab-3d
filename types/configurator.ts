/**
 * Domain types for the ForgeLab configurator.
 * Catalog data lives in `data/catalog.ts`; state lives in `composables/useConfigurator.ts`.
 */

export type StepId = 'frame' | 'size' | 'paint' | 'groupset' | 'wheels' | 'cockpit' | 'review'

/** Steps that map to a selectable catalog category (everything except review). */
export type CategoryId = Exclude<StepId, 'review'>

export interface StepDefinition {
  id: StepId
  label: string
  title: string
  description: string
}

export interface CatalogOption {
  id: string
  name: string
  /** Short one-line descriptor shown under the name. */
  tagline: string
  /** Key specs shown as compact chips/rows. */
  specs: string[]
  /** Price in EUR. For `frame` this is the base price; for all others it's a delta. */
  price: number
  /** Optional badge, e.g. "Most popular". */
  badge?: string
  /** Paint options only: swatch colors (primary, secondary). */
  swatch?: [string, string]
  /** Frame options only: weight in grams (frameset). */
  weightGrams?: number
  /**
   * Name of the node in `road-bike.glb` this option maps to.
   * Reserved for real component replacement once the Blender asset exists — not used yet.
   */
  modelNode?: string
}

export type Selections = Record<CategoryId, string>
