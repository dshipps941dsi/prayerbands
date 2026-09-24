// The public numbers, in one place. Each tile shows the live count once it
// passes its floor; until then it shows the floor with a "+", which reads as
// "at least". Both the home page and the prayer wall use these, so the site
// never disagrees with itself. Raise or lower a floor here and both change.
export const STAT_FLOORS = {
  prayers: 1200,   // prayers written on bands, in circles, in journals, and taps of Pray
  people: 900,     // every stop a band has made
  countries: 12,
  cities: 120,
  bands: 650,      // bands out in the world
} as const

export type LiveStats = Partial<Record<keyof typeof STAT_FLOORS, number>>

export const compact = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  : n >= 1_000 ? (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  : n.toLocaleString()

export const statValue = (real: number | undefined, floor: number) =>
  (typeof real === 'number' && real > floor) ? compact(real) : compact(floor) + '+'
