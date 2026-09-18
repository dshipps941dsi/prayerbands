// The real cases. Each one is an incident, a support question, or a flow that
// has to keep working. Run with `npm test`. If a change here makes one of
// these fail, the change is wrong, not the test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandStanding, type StandingBand, type StandingStop } from '../lib/band-standing.ts'

const DAVID = 'david', JEFF = 'jeff', SARAH = 'sarah', DAVE = 'dave', MATT = 'matt', EMILY = 'emily'
const KATHY_NAME = 'Kathy Miller', JENNIFER = 'jennifer', SUSAN_A = 'susan-a', SUSAN_B = 'susan-b'
const NOW = Date.parse('2026-09-17T17:00:00Z')
const minutesAgo = (m: number) => new Date(NOW - m * 60000).toISOString()

const band = (o: Partial<StandingBand> = {}): StandingBand => ({ band_id: 'PB-TEST', owner_id: null, upline_user_id: null, status: 'registered', ...o })
const stop = (o: Partial<StandingStop> = {}): StandingStop => ({ user_id: null, registered_by: null, user_name: null, registered_at: minutesAgo(60), source: 'tap', ...o })
const standing = (b: StandingBand, stops: StandingStop[], viewerId: string | null, extra: Record<string, unknown> = {}) =>
  bandStanding({ band: b, stops, viewerId, now: NOW, ...extra })

// ── Jeff buys five bands (PB-RACWD) ─────────────────────────────
test('a purchased band, still in the box, is the buyer’s to give away', () => {
  const s = standing(band({ upline_user_id: JEFF }), [], JEFF)
  assert.equal(s.role, 'giver_stock')
  assert.equal(s.giving, true)
  assert.equal(s.canPassOn, true)
  assert.equal(s.leadWithGiving, true)
})

test('the same band to a stranger who taps it is a blank band', () => {
  const s = standing(band({ upline_user_id: JEFF }), [], SARAH)
  assert.equal(s.role, 'stranger')
  assert.equal(s.giving, false)
  assert.equal(s.leadWithGiving, false)
})

test('a band assigned to an order before upline credit existed still counts, via the order', () => {
  const s = standing(band(), [], JEFF, { orderedByViewer: true })
  assert.equal(s.role, 'giver_stock')
  assert.equal(s.giving, true)
})

test('once Sarah registers it as a guest, it leaves Jeff’s drawer', () => {
  const s = standing(band({ upline_user_id: JEFF }), [stop({ user_name: 'Sarah Jones' })], JEFF)
  assert.equal(s.role, 'giver_given')
  assert.equal(s.giving, false)
  assert.equal(s.offerClaim, false)   // Sarah's name is not Jeff's: nothing is offered
  assert.equal(s.leadWithGiving, false)
})

test('Jeff taps his own new band signed out, types his own name, then opens the app: he is offered it', () => {
  const s = standing(band({ upline_user_id: JEFF }), [stop({ user_name: 'Jeff Kondel', registered_at: minutesAgo(3) })], JEFF, { viewerName: 'Jeff Kondel' })
  assert.equal(s.role, 'giver_given')
  assert.equal(s.offerClaim, true)
  assert.equal(s.canClaim, true)
  assert.equal(s.giving, false)
})

test('the same on the same phone, minutes later, attaches without asking', () => {
  const s = standing(band({ upline_user_id: JEFF }), [stop({ user_name: 'Jeff Kondel', registered_at: minutesAgo(3) })], JEFF, { viewerName: 'Jeff Kondel', onThisDevice: true })
  assert.equal(s.autoClaim, true)
})

test('David, who credited a band now attached to Dave, is a giver who has given', () => {
  const s = standing(band({ owner_id: DAVE, upline_user_id: DAVID }), [stop({ user_id: DAVE })], DAVID)
  assert.equal(s.role, 'giver_given')
  assert.equal(s.canClaim, false)
  assert.equal(s.canPassOn, false)
})

test('a pile handed to Jeff by an admin (owner Jeff, upline David) is Jeff’s to give, not David’s', () => {
  const b = band({ owner_id: JEFF, upline_user_id: DAVID })
  assert.equal(standing(b, [], JEFF).giving, true)
  assert.equal(standing(b, [], DAVID).role, 'giver_given')
  assert.equal(standing(b, [], DAVID).giving, false)
  assert.equal(standing(b, [], DAVID).canPassOn, false)
})

// ── Dave Brower: guest stop, then Google sign-up a minute later ──
test('finishing sign-up on the same phone, same name, minutes later attaches the band without asking', () => {
  const s = standing(band(), [stop({ user_name: 'David Brower', registered_at: minutesAgo(1) })], DAVE,
    { viewerName: 'David Brower', onThisDevice: true })
  assert.equal(s.autoClaim, true)
  assert.equal(s.offerClaim, false)
  assert.equal(s.canClaim, true)
})

test('the same case an hour later asks first', () => {
  const s = standing(band(), [stop({ user_name: 'David Brower', registered_at: minutesAgo(61) })], DAVE,
    { viewerName: 'David Brower', onThisDevice: true })
  assert.equal(s.autoClaim, false)
  assert.equal(s.offerClaim, true)
})

test('a shared phone: a spouse’s guest stop is not offered to the other spouse', () => {
  const s = standing(band(), [stop({ user_name: 'Pat Smith', registered_at: minutesAgo(1) })], DAVE,
    { viewerName: 'David Brower', onThisDevice: true })
  assert.equal(s.autoClaim, false)
  assert.equal(s.offerClaim, false)
  assert.equal(s.canClaim, true) // still possible on purpose, never suggested
})

test('a nameless account on the phone that made the stop is asked', () => {
  const s = standing(band(), [stop({ user_name: 'Pat Smith', registered_at: minutesAgo(1) })], DAVE,
    { viewerName: null, onThisDevice: true })
  assert.equal(s.offerClaim, true)
})

test('same name on a different phone asks first', () => {
  const s = standing(band(), [stop({ user_name: 'David Brower', registered_at: minutesAgo(1) })], DAVE,
    { viewerName: 'David Brower', onThisDevice: false })
  assert.equal(s.autoClaim, false)
  assert.equal(s.offerClaim, true)
})

test('a nameless account is offered nothing by name', () => {
  const s = standing(band(), [stop({ user_name: 'David Brower' })], DAVE, { viewerName: null })
  assert.equal(s.offerClaim, false)
  assert.equal(s.canClaim, true) // a deliberate claim is still allowed
})

// ── Matt and Emily: the incident that made the rule ──────────────
test('Matt tapping a band he gave Emily gets nothing back', () => {
  const b = band({ owner_id: EMILY, upline_user_id: MATT })
  const s = standing(b, [stop({ user_id: EMILY, user_name: 'Emily' })], MATT)
  assert.equal(s.role, 'giver_given')
  assert.equal(s.canClaim, false)
  assert.equal(s.offerClaim, false)
  assert.equal(s.canPassOn, false)
})

test('Emily holds it', () => {
  const b = band({ owner_id: EMILY, upline_user_id: MATT })
  const s = standing(b, [stop({ user_id: EMILY })], EMILY)
  assert.equal(s.role, 'holder')
  assert.equal(s.canPassOn, true)
})

// ── Kathy and Jennifer: registered on a helper’s phone ───────────
test('Jennifer, who registered the band for Kathy, is a helper and cannot claim it', () => {
  const s = standing(band(), [stop({ user_name: KATHY_NAME, registered_by: JENNIFER })], JENNIFER,
    { viewerName: 'Jennifer Lee', onThisDevice: true })
  assert.equal(s.role, 'helper')
  assert.equal(s.canClaim, false)
  assert.equal(s.offerClaim, false)
  assert.equal(s.autoClaim, false)
})

test('Kathy, signing in on her own phone, is offered it by name', () => {
  const s = standing(band(), [stop({ user_name: KATHY_NAME, registered_by: JENNIFER })], 'kathy', { viewerName: 'Kathy Miller' })
  assert.equal(s.canClaim, true)
  assert.equal(s.offerClaim, true)
})

// ── Susan’s two accounts ─────────────────────────────────────────
test('bands credited to Susan’s second account show there, not on her first', () => {
  const b = band({ upline_user_id: SUSAN_B })
  assert.equal(standing(b, [], SUSAN_B).giving, true)
  assert.equal(standing(b, [], SUSAN_A).giving, false)
})

// ── Everyday holding and passing on ──────────────────────────────
test('a band you bought and tapped yourself: owner and holder, yours to pass on', () => {
  const s = standing(band({ owner_id: DAVID }), [stop({ user_id: DAVID })], DAVID)
  assert.equal(s.role, 'holder')
  assert.equal(s.canPassOn, true)
  assert.equal(s.giving, false)
})

test('an owned band nobody has tapped is the owner’s and still in the drawer', () => {
  const s = standing(band({ owner_id: DAVID }), [], DAVID)
  assert.equal(s.role, 'owner')
  assert.equal(s.giving, true)
  assert.equal(s.canPassOn, true)
})

test('nobody can pass on a band that is already being passed on', () => {
  const b = band({ owner_id: DAVID, status: 'pending_transfer' })
  assert.equal(standing(b, [stop({ user_id: DAVID })], DAVID).canPassOn, false)
  assert.equal(standing(band({ upline_user_id: JEFF, status: 'pending_transfer' }), [], JEFF).canPassOn, false)
})

test('a guest who registered on this device, still signed out, is a guest holder', () => {
  const s = standing(band(), [stop({ user_name: 'Sarah' })], null, { onThisDevice: true })
  assert.equal(s.role, 'guest_holder')
})

test('a signed-out stranger has no standing', () => {
  assert.equal(standing(band({ upline_user_id: JEFF }), [], null).role, 'stranger')
})

// ── Wall posts are not stops ─────────────────────────────────────
test('a wall prayer on a band does not make it held', () => {
  const s = standing(band({ upline_user_id: JEFF }), [stop({ source: 'wall', user_name: 'Anon' })], JEFF)
  assert.equal(s.taken, false)
  assert.equal(s.role, 'giver_stock')
})

test('a stranger cannot claim a band whose latest real stop belongs to another account, even with a wall post after it', () => {
  const stops = [stop({ user_id: EMILY, registered_at: minutesAgo(30) }), stop({ source: 'wall', registered_at: minutesAgo(5) })]
  const s = standing(band(), stops, MATT)
  assert.equal(s.canClaim, false)
  assert.equal(s.holderUserId, EMILY)
})

// ── Ordering ─────────────────────────────────────────────────────
test('the latest stop is found by time, whatever order the rows arrive in', () => {
  const stops = [stop({ user_id: EMILY, registered_at: minutesAgo(5) }), stop({ user_id: MATT, registered_at: minutesAgo(50) })]
  assert.equal(standing(band(), stops, EMILY).role, 'holder')
  assert.equal(standing(band(), stops, MATT).role, 'stranger')
})
