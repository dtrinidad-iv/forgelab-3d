import type { CatalogOption, GroupId } from '~/types/configurator'

/**
 * FICTIONAL demo compatibility rules. They use only the invented `attrs` in `catalog.ts` and make
 * no claims about real manufacturers' products. Shown in the UI as "demo rules".
 *
 * `check` receives the resolved selected options and returns a message when the rule is
 * triggered, or null when it doesn't apply / is satisfied.
 */

export type Severity = 'error' | 'warning' | 'info'

export type ResolvedOptions = Partial<Record<GroupId, CatalogOption>>

export interface CompatibilityRule {
  id: string
  severity: Severity
  /** Groups this rule relates; used for fixes, step badges and card hints. */
  groups: GroupId[]
  title: string
  check: (o: ResolvedOptions) => string | null
}

export const COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: 'tyre-clearance',
    severity: 'error',
    groups: ['frame', 'wheels'],
    title: 'Tyre clearance',
    check: ({ frame, wheels }) => {
      const clearance = frame?.attrs?.tyreClearanceMm
      const tyre = wheels?.attrs?.tyreWidthMm
      if (!clearance || !tyre || tyre <= clearance) return null
      return `${wheels!.name} wheels ship with ${tyre} mm tyres, but the ${frame!.name} frame clears ${clearance} mm.`
    },
  },
  {
    id: 'freehub-speeds',
    severity: 'error',
    groups: ['groupset', 'wheels'],
    title: 'Drivetrain speeds',
    check: ({ groupset, wheels }) => {
      const speeds = groupset?.attrs?.speeds
      const max = wheels?.attrs?.freehubMaxSpeeds
      if (!speeds || !max || speeds <= max) return null
      return `The ${groupset!.name} demo groupset is ${speeds}-speed; the ${wheels!.name} freehub supports up to ${max}-speed.`
    },
  },
  {
    id: 'bar-clamp',
    severity: 'error',
    groups: ['handlebar', 'stem'],
    title: 'Bar clamp',
    check: ({ handlebar, stem }) => {
      const clamp = handlebar?.attrs?.clamp
      const accepts = stem?.attrs?.acceptsClamps
      if (!clamp || !accepts || accepts.includes(clamp)) return null
      return `The ${handlebar!.name} bar has an ${clamp} clamp section; the ${stem!.name} stem only fits ${accepts.join(' / ')} bars.`
    },
  },
  {
    id: 'saddle-position',
    severity: 'warning',
    groups: ['frame', 'saddle'],
    title: 'Riding position',
    check: ({ frame, saddle }) => {
      const width = saddle?.attrs?.widthMm
      if (frame?.attrs?.position !== 'race' || !width || width < 150) return null
      return `The ${saddle!.name} saddle (${width} mm) is wide for the aggressive ${frame.name} position. A narrower saddle usually suits it better.`
    },
  },
  {
    id: 'bottom-bracket',
    severity: 'info',
    groups: ['frame', 'groupset'],
    title: 'Bottom bracket',
    check: ({ frame, groupset }) => {
      const bb = frame?.attrs?.bottomBracket
      if (!bb || !groupset) return null
      return `${bb === 'threaded' ? 'Threaded' : 'Press-fit'} bottom bracket matched to the ${frame!.name} frame and ${groupset.name} crankset — included.`
    },
  },
]
