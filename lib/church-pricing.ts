// Church (organisation) band pricing by order size.
//
// A church account orders bands under its own prefix and pays per band, with
// the price dropping as the quantity rises. The tiers are edited in Admin >
// Pricing and stored as JSON in site_config under CHURCH_TIERS_KEY. The
// checkout, the church dashboard and the admin editor all go through this
// file, so the price a church is shown is always the price it is charged.
//
// A tier applies from its `min` quantity up to one below the next tier's
// `min`. The lowest tier's `min` is the minimum order. This file has no
// imports on purpose: the tests load it directly.

export type ChurchTier = { min: number; cents: number }

export const CHURCH_TIERS_KEY = 'church_price_tiers'

// Sanity ceilings, not business rules.
export const MAX_CHURCH_QTY = 100000
export const MAX_CHURCH_TIERS = 20
const MAX_CENTS = 100000

// What the checkout charged while these were written into the code. They
// apply until tiers are saved from the admin, so nothing changes on deploy.
export const DEFAULT_CHURCH_TIERS: ChurchTier[] = [
  { min: 50, cents: 475 },
  { min: 100, cents: 420 },
  { min: 250, cents: 400 },
  { min: 500, cents: 375 },
]

// Strict check with a plain-words reason, for the admin editor and its API.
export function validateChurchTiers(raw: unknown): { tiers: ChurchTier[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Add at least one tier.' }
  if (raw.length > MAX_CHURCH_TIERS) return { error: 'That is more tiers than the list holds (' + MAX_CHURCH_TIERS + ').' }
  const tiers: ChurchTier[] = []
  const seen = new Set<number>()
  for (const row of raw) {
    const min = (row as { min?: unknown } | null)?.min
    const cents = (row as { cents?: unknown } | null)?.cents
    if (typeof min !== 'number' || !Number.isInteger(min) || min < 1) return { error: 'Each quantity must be a whole number of 1 or more.' }
    if (min > MAX_CHURCH_QTY) return { error: 'A quantity cannot be more than ' + MAX_CHURCH_QTY.toLocaleString('en-US') + '.' }
    if (typeof cents !== 'number' || !Number.isInteger(cents) || cents < 1) return { error: 'Each price must be more than $0.00.' }
    if (cents > MAX_CENTS) return { error: 'A price per band cannot be more than ' + formatCents(MAX_CENTS) + '.' }
    if (seen.has(min)) return { error: 'Two tiers start at ' + min.toLocaleString('en-US') + ' bands. Each tier needs its own quantity.' }
    seen.add(min)
    tiers.push({ min, cents })
  }
  tiers.sort((a, b) => a.min - b.min)
  return { tiers }
}

export function normalizeChurchTiers(raw: unknown): ChurchTier[] | null {
  const r = validateChurchTiers(raw)
  return 'tiers' in r ? r.tiers : null
}

// Read the stored setting. A missing row means "not set yet" and uses the
// defaults; a row that does not parse also uses them, and says so.
export function readChurchTiers(value: string | null | undefined): { tiers: ChurchTier[]; usedDefault: boolean; corrupt: boolean } {
  if (typeof value !== 'string' || value.trim() === '') return { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: false }
  let parsed: unknown = null
  try { parsed = JSON.parse(value) } catch { parsed = null }
  const tiers = normalizeChurchTiers(parsed)
  if (!tiers) return { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: true }
  return { tiers, usedDefault: false, corrupt: false }
}

// The tier a quantity falls in, or null when it is below the minimum order
// or is not a whole number. `tiers` must be sorted, as the functions above return.
export function churchTierFor(qty: number, tiers: ChurchTier[]): ChurchTier | null {
  if (!Number.isInteger(qty) || tiers.length === 0 || qty < tiers[0].min) return null
  let hit = tiers[0]
  for (const t of tiers) { if (t.min <= qty) hit = t; else break }
  return hit
}

export function churchMinQty(tiers: ChurchTier[]): number {
  return tiers.length ? tiers[0].min : 0
}

// "50-99 bands", "500+ bands" (with an en dash), for the price table.
export function churchTierLabel(tiers: ChurchTier[], i: number): string {
  const t = tiers[i]
  const next = tiers[i + 1]
  const n = (x: number) => x.toLocaleString('en-US')
  if (!next) return n(t.min) + '+ bands'
  const top = next.min - 1
  if (top === t.min) return n(t.min) + (t.min === 1 ? ' band' : ' bands')
  return n(t.min) + '–' + n(top) + ' bands'
}

export function formatCents(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

// Shortcut buttons on the church order form. Round order sizes between the
// minimum order and the top tier (never stopping short of 1,000, which the
// form has always offered), plus any tier that itself starts on a round
// number. A tier starting at 501 gets no button; the form also takes any
// typed quantity.
const QUICK_LADDER = [50, 100, 250, 500, 1000, 1500, 2000, 2500, 5000, 10000]
export function churchQuickQuantities(tiers: ChurchTier[]): number[] {
  if (!tiers.length) return []
  const min = tiers[0].min
  const top = Math.max(1000, tiers[tiers.length - 1].min)
  const set = new Set(QUICK_LADDER.filter(q => q >= min && q <= top))
  for (const t of tiers) if (t.min % 50 === 0) set.add(t.min)
  return [...set].sort((a, b) => a - b)
}
