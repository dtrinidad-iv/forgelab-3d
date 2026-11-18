import type { CatalogOption, CategoryId, Selections, StepDefinition } from '~/types/configurator'

/**
 * ForgeLab catalog — sample data.
 * Names, specs and prices are original placeholders, not real products.
 * Prices in EUR. Frame price = base build price; other categories are deltas.
 */

export const STEPS: StepDefinition[] = [
  { id: 'frame', label: 'Frame', title: 'Choose your platform', description: 'Every ForgeLab starts with a hand-laid carbon frameset, built for one kind of ride.' },
  { id: 'size', label: 'Size', title: 'Find your size', description: 'Six sizes with proportional tube lengths. Not sure? Book a fit session after ordering.' },
  { id: 'paint', label: 'Paint', title: 'Pick your finish', description: 'Hand-sprayed in our studio. Each finish is cured, clear-coated and inspected by hand.' },
  { id: 'groupset', label: 'Groupset', title: 'Select a groupset', description: 'Drivetrain and brakes. All options are 2×12 or 1×13 electronic with hydraulic discs.' },
  { id: 'wheels', label: 'Wheels', title: 'Choose your wheels', description: 'The biggest single upgrade to how a bike feels. All tubeless-ready, all hookless-compatible.' },
  { id: 'cockpit', label: 'Cockpit', title: 'Set up the cockpit', description: 'Bar, stem and contact points. Fully internal routing on every option.' },
  { id: 'review', label: 'Review', title: 'Review your build', description: 'Check every detail before you commit. Your build is assembled and tuned by hand.' },
]

export const CATALOG: Record<CategoryId, CatalogOption[]> = {
  frame: [
    {
      id: 'aero-r1',
      name: 'Aero R1',
      tagline: 'Wind-tunnel race frame',
      specs: ['Kamm-tail tube profiles', 'Integrated seatpost', '32 mm tyre clearance'],
      price: 3900,
      weightGrams: 890,
      badge: 'Race',
      modelNode: 'frame_aero_r1',
    },
    {
      id: 'climb-sl',
      name: 'Climb SL',
      tagline: 'Featherweight climbing frame',
      specs: ['Ultra-high modulus layup', 'Round-tube stiffness', '30 mm tyre clearance'],
      price: 4200,
      weightGrams: 720,
      badge: 'Lightest',
      modelNode: 'frame_climb_sl',
    },
    {
      id: 'endure-gr',
      name: 'Endure GR',
      tagline: 'All-road endurance frame',
      specs: ['Compliant rear triangle', 'Mudguard mounts', '38 mm tyre clearance'],
      price: 3400,
      weightGrams: 960,
      modelNode: 'frame_endure_gr',
    },
  ],
  size: [
    { id: 'xs', name: 'XS', tagline: 'Rider 155–165 cm', specs: ['Stack 505 mm', 'Reach 370 mm'], price: 0 },
    { id: 's', name: 'S', tagline: 'Rider 163–172 cm', specs: ['Stack 525 mm', 'Reach 378 mm'], price: 0 },
    { id: 'm', name: 'M', tagline: 'Rider 170–179 cm', specs: ['Stack 545 mm', 'Reach 386 mm'], price: 0, badge: 'Most common' },
    { id: 'l', name: 'L', tagline: 'Rider 177–186 cm', specs: ['Stack 567 mm', 'Reach 393 mm'], price: 0 },
    { id: 'xl', name: 'XL', tagline: 'Rider 184–193 cm', specs: ['Stack 590 mm', 'Reach 401 mm'], price: 0 },
    { id: 'xxl', name: 'XXL', tagline: 'Rider 191–200 cm', specs: ['Stack 612 mm', 'Reach 410 mm'], price: 0 },
  ],
  paint: [
    { id: 'obsidian', name: 'Obsidian', tagline: 'Gloss black, raw carbon logos', specs: ['Gloss clear coat'], price: 0, swatch: ['#121316', '#2A2D33'] },
    { id: 'chalk', name: 'Chalk', tagline: 'Matte warm white', specs: ['Matte clear coat'], price: 0, swatch: ['#EDEBE6', '#CFCBC3'] },
    { id: 'forge-ember', name: 'Forge Ember', tagline: 'Signature burnt orange fade', specs: ['Hand-sprayed fade', 'Gloss clear coat'], price: 450, swatch: ['#E4572E', '#3A1A12'], badge: 'Signature' },
    { id: 'glacier', name: 'Glacier', tagline: 'Ice blue over graphite', specs: ['Two-tone mask', 'Satin clear coat'], price: 350, swatch: ['#A9C7D8', '#3B4249'] },
    { id: 'moss', name: 'Moss', tagline: 'Deep olive, bronze details', specs: ['Metallic flake', 'Satin clear coat'], price: 350, swatch: ['#4A5340', '#9C7A4B'] },
    { id: 'prism', name: 'Prism', tagline: 'Colour-shift chameleon', specs: ['Interference pigment', 'Gloss clear coat'], price: 900, swatch: ['#5A3F8C', '#2E8A86'], badge: 'Limited' },
  ],
  groupset: [
    { id: 'gs-sport', name: 'Sport E12', tagline: 'Electronic 2×12, alloy cranks', specs: ['Wireless shifting', '160/140 mm rotors', 'Groupset 2,780 g'], price: 0, modelNode: 'groupset_sport' },
    { id: 'gs-pro', name: 'Pro E12', tagline: 'Electronic 2×12, carbon cranks', specs: ['Wireless shifting', 'Integrated power meter', 'Groupset 2,490 g'], price: 1400, badge: 'Most popular', modelNode: 'groupset_pro' },
    { id: 'gs-team', name: 'Team E12', tagline: 'Top-tier electronic 2×12', specs: ['Dual-sided power meter', 'Ceramic bearings', 'Groupset 2,310 g'], price: 2900, modelNode: 'groupset_team' },
    { id: 'gs-mono', name: 'Mono E13', tagline: 'Electronic 1×13 wide range', specs: ['10–46T cassette', 'Clutch derailleur', 'Groupset 2,420 g'], price: 1100, modelNode: 'groupset_mono' },
  ],
  wheels: [
    { id: 'wh-alloy', name: 'Forge A30', tagline: 'Alloy training wheelset', specs: ['30 mm depth', '21 mm internal', '1,650 g'], price: 0, modelNode: 'wheels_a30' },
    { id: 'wh-c45', name: 'Forge C45', tagline: 'All-round carbon', specs: ['45 mm depth', '23 mm internal', '1,390 g'], price: 1300, badge: 'Recommended', modelNode: 'wheels_c45' },
    { id: 'wh-c60', name: 'Forge C60', tagline: 'Aero carbon', specs: ['60 mm depth', '23 mm internal', '1,480 g'], price: 1700, modelNode: 'wheels_c60' },
    { id: 'wh-c35', name: 'Forge C35 SL', tagline: 'Climbing carbon', specs: ['35 mm depth', '22 mm internal', '1,190 g'], price: 1900, modelNode: 'wheels_c35sl' },
  ],
  cockpit: [
    { id: 'ck-split', name: 'Split Alloy', tagline: 'Alloy bar and stem', specs: ['Internal routing', 'Adjustable stack'], price: 0, modelNode: 'cockpit_split' },
    { id: 'ck-integrated', name: 'Integrated Carbon', tagline: 'One-piece carbon bar/stem', specs: ['Aero tops', '−95 g vs split'], price: 650, badge: 'Clean look', modelNode: 'cockpit_integrated' },
    { id: 'ck-aero', name: 'Aero Carbon Narrow', tagline: 'Narrow one-piece, flared drops', specs: ['36 cm hoods / 40 cm drops', 'Wind-tunnel shaped'], price: 850, modelNode: 'cockpit_aero_narrow' },
  ],
}

export const DEFAULT_SELECTIONS: Selections = {
  frame: 'aero-r1',
  size: 'm',
  paint: 'obsidian',
  groupset: 'gs-pro',
  wheels: 'wh-c45',
  cockpit: 'ck-integrated',
}

export const CURRENCY = 'EUR'
export const LOCALE = 'en-IE'
