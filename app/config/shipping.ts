/**
 * Shipping destinations + FICTIONAL region rules (demo). Rules are enforced by the commerce server
 * before a cart can be created; with Shopify they'd run as a Cart & Checkout Validation Function on
 * the delivery address, so an edited cart still can't check out.
 */
import type { Selections } from '~/types/configurator'

export interface Region {
  code: string
  name: string
}

export interface Destination {
  code: string
  name: string
  regions?: Region[]
}

const US_STATES: Region[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'],
  ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code: code!, name: name! }))

const CA_PROVINCES: Region[] = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'], ['NL', 'Newfoundland and Labrador'],
  ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'], ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'],
  ['QC', 'Quebec'], ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
].map(([code, name]) => ({ code: code!, name: name! }))

export const DESTINATIONS: Destination[] = [
  { code: 'US', name: 'United States', regions: US_STATES },
  { code: 'CA', name: 'Canada', regions: CA_PROVINCES },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
]

export interface ShipTo {
  country: string
  region?: string | null
}

export interface ShippingRule {
  id: string
  title: string
  appliesTo: (selections: Selections) => boolean
  /** Blocked destinations: country ("JP") or country-region ("US-CA"). */
  blocked: string[]
  message: string
}

export const SHIPPING_RULES: ShippingRule[] = [
  {
    id: 'forged-finish-regions',
    title: 'Restricted finish (demo rule)',
    appliesTo: (s) => s.paint === 'forged-pattern',
    blocked: ['US-CA', 'US-NY'],
    message: "The Forged Pattern finish can't be shipped to California or New York. (Fictional demo rule showing region-based checkout blocking.)",
  },
]

export interface ShippingIssue {
  ruleId: string
  title: string
  message: string
}

export function destinationOf(country: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.code === country)
}

/** Validates a destination shape (unknown country/region → error string). */
export function validateShipTo(shipTo: ShipTo): string | null {
  const d = destinationOf(shipTo.country)
  if (!d) return `We don't ship to ${shipTo.country}.`
  if (d.regions) {
    if (!shipTo.region) return `Please choose a ${d.code === 'US' ? 'state' : 'province'}.`
    if (!d.regions.some((r) => r.code === shipTo.region)) return `Unknown region ${shipTo.region}.`
  }
  return null
}

export function shippingIssues(selections: Selections, shipTo: ShipTo): ShippingIssue[] {
  const keys = [shipTo.country, shipTo.region ? `${shipTo.country}-${shipTo.region}` : null].filter(Boolean) as string[]
  return SHIPPING_RULES.filter((r) => r.appliesTo(selections) && r.blocked.some((b) => keys.includes(b))).map((r) => ({ ruleId: r.id, title: r.title, message: r.message }))
}
