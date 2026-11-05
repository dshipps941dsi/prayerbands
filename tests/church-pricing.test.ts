// Church quantity pricing: which tier a quantity lands in, and what the
// editor is allowed to save.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CHURCH_TIERS, churchTierFor, churchMinQty, churchTierLabel, churchQuickQuantities,
  validateChurchTiers, normalizeChurchTiers, readChurchTiers, formatCents, MAX_CHURCH_QTY,
  type ChurchTier,
} from '../lib/church-pricing.ts'

const cents = (qty: number, tiers: ChurchTier[] = DEFAULT_CHURCH_TIERS) => churchTierFor(qty, tiers)?.cents ?? null

// The five bands David asked for: 1-500, 501-999, 1000-1499, 1500-1999, 2000+.
const DAVID: ChurchTier[] = [
  { min: 1, cents: 475 }, { min: 501, cents: 420 }, { min: 1000, cents: 400 }, { min: 1500, cents: 385 }, { min: 2000, cents: 360 },
]

test('the built-in tiers charge what the checkout charged before they were editable', () => {
  // Old code: >=500 3.75, >=250 4.00, >=100 4.20, else 4.75.
  assert.equal(cents(50), 475)
  assert.equal(cents(99), 475)
  assert.equal(cents(100), 420)
  assert.equal(cents(249), 420)
  assert.equal(cents(250), 400)
  assert.equal(cents(499), 400)
  assert.equal(cents(500), 375)
  assert.equal(cents(5000), 375)
})

test('a quantity below the lowest tier is under the minimum order', () => {
  assert.equal(churchMinQty(DEFAULT_CHURCH_TIERS), 50)
  assert.equal(cents(49), null)
  assert.equal(cents(0), null)
  assert.equal(cents(-5), null)
})

test('a quantity that is not a whole number matches no tier', () => {
  assert.equal(cents(100.5), null)
  assert.equal(cents(Number.NaN), null)
})

test('custom tiers: each boundary lands on the right side', () => {
  assert.equal(cents(1, DAVID), 475)
  assert.equal(cents(500, DAVID), 475)
  assert.equal(cents(501, DAVID), 420)
  assert.equal(cents(999, DAVID), 420)
  assert.equal(cents(1000, DAVID), 400)
  assert.equal(cents(1499, DAVID), 400)
  assert.equal(cents(1500, DAVID), 385)
  assert.equal(cents(1999, DAVID), 385)
  assert.equal(cents(2000, DAVID), 360)
  assert.equal(cents(25000, DAVID), 360)
})

test('the price table labels read as ranges, with the last one open-ended', () => {
  assert.deepEqual(DEFAULT_CHURCH_TIERS.map((_, i) => churchTierLabel(DEFAULT_CHURCH_TIERS, i)),
    ['50–99 bands', '100–249 bands', '250–499 bands', '500+ bands'])
  assert.deepEqual(DAVID.map((_, i) => churchTierLabel(DAVID, i)),
    ['1–500 bands', '501–999 bands', '1,000–1,499 bands', '1,500–1,999 bands', '2,000+ bands'])
})

test('a single tier is one open-ended price', () => {
  const one = [{ min: 25, cents: 500 }]
  assert.equal(churchTierLabel(one, 0), '25+ bands')
  assert.equal(cents(25, one), 500)
  assert.equal(cents(24, one), null)
})

test('tiers saved out of order are put in order', () => {
  const r = validateChurchTiers([{ min: 500, cents: 375 }, { min: 50, cents: 475 }, { min: 100, cents: 420 }])
  assert.ok('tiers' in r)
  assert.deepEqual(r.tiers.map(t => t.min), [50, 100, 500])
})

test('the editor refuses tiers that cannot be priced', () => {
  const bad = (raw: unknown) => { const r = validateChurchTiers(raw); return 'error' in r ? r.error : null }
  assert.ok(bad([]))
  assert.ok(bad(null))
  assert.ok(bad('nope'))
  assert.ok(bad([{ min: 0, cents: 400 }]))
  assert.ok(bad([{ min: 50.5, cents: 400 }]))
  assert.ok(bad([{ min: 50, cents: 0 }]))
  assert.ok(bad([{ min: 50, cents: 4.75 }]))
  assert.ok(bad([{ min: '50', cents: 475 }]))
  assert.ok(bad([{ min: 50, cents: 475 }, { min: 50, cents: 420 }]))
  assert.ok(bad([{ min: MAX_CHURCH_QTY + 1, cents: 100 }]))
  assert.equal(bad(DAVID), null)
})

test('nothing saved yet, or a saved value that does not parse, uses the built-in tiers', () => {
  assert.deepEqual(readChurchTiers(null), { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: false })
  assert.deepEqual(readChurchTiers(''), { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: false })
  assert.deepEqual(readChurchTiers('{not json'), { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: true })
  assert.deepEqual(readChurchTiers('[{"min":0,"cents":1}]'), { tiers: DEFAULT_CHURCH_TIERS, usedDefault: true, corrupt: true })
})

test('a saved value round-trips', () => {
  const read = readChurchTiers(JSON.stringify(DAVID))
  assert.equal(read.usedDefault, false)
  assert.deepEqual(read.tiers, DAVID)
  assert.deepEqual(normalizeChurchTiers(JSON.parse(JSON.stringify(DAVID))), DAVID)
})

test('shortcut buttons: the old five for the built-in tiers, round numbers only for custom ones', () => {
  assert.deepEqual(churchQuickQuantities(DEFAULT_CHURCH_TIERS), [50, 100, 250, 500, 1000])
  assert.deepEqual(churchQuickQuantities(DAVID), [50, 100, 250, 500, 1000, 1500, 2000])
  assert.deepEqual(churchQuickQuantities([{ min: 100, cents: 420 }, { min: 3000, cents: 300 }]), [100, 250, 500, 1000, 1500, 2000, 2500, 3000])
  assert.deepEqual(churchQuickQuantities([]), [])
})

test('every shortcut button is an orderable quantity', () => {
  for (const tiers of [DEFAULT_CHURCH_TIERS, DAVID]) {
    for (const q of churchQuickQuantities(tiers)) assert.ok(churchTierFor(q, tiers), 'no tier for ' + q)
  }
})

test('prices print with two decimals', () => {
  assert.equal(formatCents(420), '$4.20')
  assert.equal(formatCents(400), '$4.00')
  assert.equal(formatCents(375), '$3.75')
})
