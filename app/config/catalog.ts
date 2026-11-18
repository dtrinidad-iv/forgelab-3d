import type { CatalogOption, Configuration, GroupDefinition, GroupId, StepDefinition } from '~/types/configurator'

/**
 * ForgeLab demo catalog.
 *
 * Everything here is FICTIONAL demonstration data: specs, prices and model names are invented.
 * Third-party brand names (groupsets) are used only to label demo options; ForgeLab is not
 * affiliated with them and makes no compatibility or specification claims about their products.
 *
 * Prices are USD, per component (absolute). Total = sum of selected components.
 * Prices shown in the browser are for display only — real commerce must re-price server-side.
 */

export const CURRENCY = 'USD'
export const LOCALE = 'en-US'

export const STEPS: StepDefinition[] = [
  { id: 'frame', label: 'Frame', title: 'Choose your frame', description: 'Four platforms, four materials. Each frameset is built for a different kind of ride.', groups: ['frame'] },
  { id: 'size', label: 'Size', title: 'Select your size', description: 'Sized to your height. Not sure? Book a fit session after you order.', groups: ['size'] },
  { id: 'paint', label: 'Paint', title: 'Paint & finish', description: 'Hand-sprayed in the studio. Choose a signature finish or mix your own colour.', groups: ['paint'] },
  { id: 'groupset', label: 'Groupset', title: 'Select a groupset', description: 'Drivetrain, shifters and brakes. Demo options with illustrative pricing.', groups: ['groupset'] },
  { id: 'wheels', label: 'Wheels', title: 'Choose your wheels', description: 'The single biggest change to how a bike rides.', groups: ['wheels'] },
  { id: 'cockpit', label: 'Cockpit', title: 'Cockpit & seating', description: 'Your contact points: bar, stem, tape and saddle.', groups: ['handlebar', 'stem', 'barTape', 'saddle'] },
  { id: 'review', label: 'Review', title: 'Review your build', description: 'Check every detail before you commit.', groups: [] },
]

export const GROUPS: Record<GroupId, GroupDefinition> = {
  frame: { id: 'frame', label: 'Frame', required: true },
  size: { id: 'size', label: 'Size', required: true },
  paint: { id: 'paint', label: 'Paint', required: true },
  groupset: { id: 'groupset', label: 'Groupset', required: true },
  wheels: { id: 'wheels', label: 'Wheels', required: true },
  handlebar: { id: 'handlebar', label: 'Handlebar', required: true },
  stem: { id: 'stem', label: 'Stem', required: true },
  barTape: { id: 'barTape', label: 'Bar tape', required: true },
  saddle: { id: 'saddle', label: 'Saddle', required: true },
}

export const GROUP_IDS = Object.keys(GROUPS) as GroupId[]

export const CATALOG: Record<GroupId, CatalogOption[]> = {
  frame: [
    { id: 'aero-carbon', name: 'Aero Carbon', tagline: 'Wind-cheating race frameset', specs: ['Truncated aero tube profiles', 'Integrated seatpost', '30 mm tyre clearance'], price: 1900, weightGrams: 920, badge: 'Race', attrs: { tyreClearanceMm: 30, bottomBracket: 'press-fit', position: 'race' } },
    { id: 'endurance-carbon', name: 'Endurance Carbon', tagline: 'Long-day comfort, race-day stiffness', specs: ['Compliant rear triangle', 'Taller stack geometry', '35 mm tyre clearance'], price: 1500, weightGrams: 980, attrs: { tyreClearanceMm: 35, bottomBracket: 'press-fit', position: 'endurance' } },
    { id: 'titanium', name: 'Titanium', tagline: 'Brushed 3Al/2.5V, built for decades', specs: ['Hand-welded tubeset', 'Threaded bottom bracket', '32 mm tyre clearance'], price: 2200, weightGrams: 1450, badge: 'Heirloom', attrs: { tyreClearanceMm: 32, bottomBracket: 'threaded', position: 'endurance' } },
    { id: 'steel', name: 'Steel', tagline: 'Classic lugged chromoly', specs: ['Lugged construction', 'Threaded bottom bracket', '32 mm tyre clearance'], price: 1200, weightGrams: 1850, attrs: { tyreClearanceMm: 32, bottomBracket: 'threaded', position: 'endurance' } },
  ],
  size: [
    { id: 'xs', name: 'XS', tagline: '155–165 cm', specs: ['Stack 505 mm', 'Reach 370 mm'], price: 0 },
    { id: 's', name: 'S', tagline: '163–172 cm', specs: ['Stack 525 mm', 'Reach 378 mm'], price: 0 },
    { id: 'm', name: 'M', tagline: '170–179 cm', specs: ['Stack 545 mm', 'Reach 386 mm'], price: 0 },
    { id: 'l', name: 'L', tagline: '177–186 cm', specs: ['Stack 567 mm', 'Reach 393 mm'], price: 0 },
    { id: 'xl', name: 'XL', tagline: '184–194 cm', specs: ['Stack 590 mm', 'Reach 401 mm'], price: 0 },
  ],
  paint: [
    { id: 'matte-black', name: 'Matte Black', tagline: 'Stealth satin finish', specs: ['Matte clear coat'], price: 0, paint: { color: '#141518', finish: 'matte' } },
    { id: 'gloss-black', name: 'Gloss Black', tagline: 'Deep piano-gloss', specs: ['Gloss clear coat'], price: 0, paint: { color: '#0B0C0E', finish: 'gloss' } },
    { id: 'metallic-silver', name: 'Metallic Silver', tagline: 'Fine flake, liquid-metal look', specs: ['Metallic flake', 'Gloss clear coat'], price: 150, paint: { color: '#B9BDC2', finish: 'metallic' } },
    { id: 'racing-red', name: 'Racing Red', tagline: 'Saturated race red', specs: ['Gloss clear coat'], price: 150, paint: { color: '#C8102E', finish: 'gloss' } },
    { id: 'forged-pattern', name: 'Forged Pattern', tagline: 'Folded-steel pattern, rendered live', specs: ['Procedural GPU shader · 0 KB textures', 'Satin clear coat'], price: 600, badge: 'Showcase', paint: { color: '#8E9298', finish: 'forged' } },
    { id: 'custom', name: 'Custom Colour', tagline: 'Any colour, your choice of finish', specs: ['Colour-matched in studio'], price: 300, badge: 'Bespoke', paint: { color: '#E4572E', finish: 'gloss', custom: true } },
  ],
  groupset: [
    { id: 'shimano-demo', name: 'Shimano', tagline: 'Demo 2×12 electronic option', specs: ['2×12 electronic shifting', 'Hydraulic disc brakes', 'Demo spec & pricing'], price: 850, attrs: { speeds: 12 } },
    { id: 'sram-demo', name: 'SRAM', tagline: 'Demo 2×12 wireless option', specs: ['2×12 wireless shifting', 'Hydraulic disc brakes', 'Demo spec & pricing'], price: 950, attrs: { speeds: 12 } },
    { id: 'campagnolo-demo', name: 'Campagnolo', tagline: 'Demo 2×13 mechanical option', specs: ['2×13 mechanical shifting', 'Hydraulic disc brakes', 'Demo spec & pricing'], price: 1100, attrs: { speeds: 13 } },
  ],
  wheels: [
    { id: 'alloy', name: 'Alloy', tagline: 'Durable everyday wheelset', specs: ['28 mm rim depth', '32 mm tyres', 'Up to 12-speed freehub', '1,650 g'], price: 250, attrs: { tyreWidthMm: 32, freehubMaxSpeeds: 12 } },
    { id: 'carbon-climbing', name: 'Carbon Climbing', tagline: 'Low-profile, low-weight', specs: ['35 mm rim depth', '28 mm tyres', 'Up to 13-speed freehub', '1,250 g'], price: 650, attrs: { tyreWidthMm: 28, freehubMaxSpeeds: 13 } },
    { id: 'carbon-deep', name: 'Carbon Deep-Section', tagline: 'Aero speed for flat and fast', specs: ['60 mm rim depth', '28 mm tyres', 'Up to 13-speed freehub', '1,480 g'], price: 800, badge: 'Fastest', attrs: { tyreWidthMm: 28, freehubMaxSpeeds: 13 } },
  ],
  handlebar: [
    { id: 'alloy-compact', name: 'Alloy Compact', tagline: 'Short-reach, shallow-drop', specs: ['Round tops', 'Round clamp section'], price: 80, attrs: { clamp: 'round' } },
    { id: 'carbon-ergo', name: 'Carbon Ergo', tagline: 'Flattened tops, ergonomic bend', specs: ['Flat aero tops', 'Round clamp section'], price: 220, attrs: { clamp: 'round' } },
    { id: 'carbon-aero', name: 'Carbon Aero', tagline: 'Narrow hoods, flared drops', specs: ['Wing-profile tops', 'Aero clamp section'], price: 300, attrs: { clamp: 'aero' } },
  ],
  stem: [
    { id: 'alloy-stem', name: 'Alloy', tagline: 'Forged, 6° rise', specs: ['−6° angle', 'Round bars only'], price: 80, attrs: { acceptsClamps: ['round'] } },
    { id: 'carbon-stem', name: 'Carbon', tagline: 'Lightweight, flush cover', specs: ['−10° angle', 'Round & aero bars'], price: 160, attrs: { acceptsClamps: ['round', 'aero'] } },
  ],
  barTape: [
    { id: 'tape-black', name: 'Classic Black', tagline: 'Grippy microfibre', specs: ['2.5 mm thickness'], price: 30 },
    { id: 'tape-gel', name: 'Gel Comfort', tagline: 'Gel-backed for long rides', specs: ['3.5 mm thickness'], price: 45 },
    { id: 'tape-tan', name: 'Tan Leather', tagline: 'Hand-stitched, ages beautifully', specs: ['Natural leather'], price: 70, badge: 'Classic' },
  ],
  saddle: [
    { id: 'saddle-comfort', name: 'Comfort', tagline: 'Wider, more padding', specs: ['Steel rails', '155 mm width'], price: 100, attrs: { widthMm: 155 } },
    { id: 'saddle-short', name: 'Short-Nose', tagline: 'Pressure relief for aggressive positions', specs: ['Ti rails', '143 mm width'], price: 140, attrs: { widthMm: 143 } },
    { id: 'saddle-race', name: 'Race Carbon', tagline: 'Minimal, lightweight', specs: ['Carbon rails', '138 mm width'], price: 180, attrs: { widthMm: 138 } },
  ],
}

/** Size is deliberately unselected: it depends on the rider and must be chosen. */
export const DEFAULT_CONFIGURATION: Configuration = {
  selections: {
    frame: 'aero-carbon',
    size: null,
    paint: 'gloss-black',
    groupset: 'shimano-demo',
    wheels: 'carbon-climbing',
    handlebar: 'carbon-ergo',
    stem: 'alloy-stem',
    barTape: 'tape-black',
    saddle: 'saddle-race',
  },
  customPaint: { color: '#E4572E', finish: 'gloss' },
  uniqueCover: null,
}
