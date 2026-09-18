// What a new stop changes — the write side. Same people as band-standing.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planStop } from '../lib/band-stop.ts'
import type { StandingBand, StandingStop } from '../lib/band-standing.ts'

const COACH = 'coach', KID = 'kid', JEFF = 'jeff', SARAH = 'sarah', JENNIFER = 'jennifer', KATHY = 'kathy', DAVE = 'dave', DAVID = 'david', EMILY = 'emily', MATT = 'matt'
const band = (o: Partial<StandingBand> = {}): StandingBand => ({ band_id: 'PB-TEST', owner_id: null, upline_user_id: null, status: 'registered', ...o })
const stop = (o: Partial<StandingStop> = {}): StandingStop => ({ user_id: null, registered_by: null, user_name: null, registered_at: '2026-09-17T16:00:00Z', source: 'tap', ...o })
const plan = (b: StandingBand, latest: StandingStop | null, callerId: string | null, typedName: string, extra: Partial<Parameters<typeof planStop>[0]> = {}) =>
  planStop({ band: b, latestBefore: latest, callerId, forSomeoneElse: false, typedName, ...extra })

// ── A coach with a pile: the tap is the hand-off ────────────────
test('coach owns it, kid taps signed in: band moves to the kid, coach is upline and sponsor', () => {
  const p = plan(band({ owner_id: COACH }), null, KID, 'Kid Jones')
  assert.equal(p.action, 'new')
  assert.equal(p.holderUserId, KID)
  assert.deepEqual(p.bandPatch, { owner_id: KID, upline_user_id: COACH })
  assert.deepEqual(p.sponsor, { userId: KID, uplineUserId: COACH })
  assert.equal(p.giverId, COACH)
})

test('coach owns it, kid taps as a guest: released for the kid to claim, coach is upline', () => {
  const p = plan(band({ owner_id: COACH }), null, null, 'Kid Jones')
  assert.equal(p.holderUserId, null)
  assert.deepEqual(p.bandPatch, { owner_id: null, upline_user_id: COACH })
  assert.equal(p.sponsor, null)
  assert.equal(p.giverId, COACH)
})

test('the owner adding to their own journey changes nothing', () => {
  const p = plan(band({ owner_id: COACH }), stop({ user_id: COACH }), COACH, 'Coach')
  assert.deepEqual(p.bandPatch, {})
  assert.equal(p.giverId, null)
})

// ── Jeff's purchase: credited, never owned ───────────────────────
test('Sarah taps Jeff’s purchased band as a guest: nothing about the band changes', () => {
  const p = plan(band({ upline_user_id: JEFF }), null, null, 'Sarah Jones')
  assert.deepEqual(p.bandPatch, {})
  assert.equal(p.giverId, null)
})

test('Sarah taps Jeff’s purchased band signed in: she takes it and hangs under Jeff', () => {
  const p = plan(band({ upline_user_id: JEFF }), null, SARAH, 'Sarah Jones')
  assert.deepEqual(p.bandPatch, { owner_id: SARAH })
  assert.deepEqual(p.sponsor, { userId: SARAH, uplineUserId: JEFF })
  assert.equal(p.giverId, null) // the gift notice covers this, not "passed on"
})

// ── Registering for someone else ─────────────────────────────────
test('Jennifer registers a band for Kathy: guest stop in Kathy’s name, Jennifer is helper and giver', () => {
  const p = plan(band(), null, JENNIFER, 'Kathy Miller', { forSomeoneElse: true })
  assert.equal(p.holderUserId, null)
  assert.equal(p.helperUserId, JENNIFER)
  assert.deepEqual(p.bandPatch, { upline_user_id: JENNIFER })
})

test('a helper who owned the band lets go of it', () => {
  const p = plan(band({ owner_id: JENNIFER, upline_user_id: DAVID }), null, JENNIFER, 'Kathy Miller', { forSomeoneElse: true })
  assert.deepEqual(p.bandPatch, { owner_id: null, upline_user_id: JENNIFER })
})

test('a helper does not displace an existing giver on an unowned band', () => {
  const p = plan(band({ upline_user_id: JEFF }), null, JENNIFER, 'Kathy Miller', { forSomeoneElse: true })
  assert.deepEqual(p.bandPatch, {})
})

test('Kathy later signs in and registers herself: a new stop, the band is hers, she hangs under Jennifer', () => {
  const p = plan(band({ upline_user_id: JENNIFER }), stop({ user_name: 'Kathy Miller', registered_by: JENNIFER }), KATHY, 'Kathy')
  assert.equal(p.action, 'new') // a stop made on her behalf is not adopted
  assert.deepEqual(p.bandPatch, { owner_id: KATHY })
  assert.deepEqual(p.sponsor, { userId: KATHY, uplineUserId: JENNIFER })
})

// ── Same person, second time ─────────────────────────────────────
test('Dave registered as a guest, signs in, registers again as Dave: his stop is attached, not doubled', () => {
  const p = plan(band({ upline_user_id: DAVID }), stop({ user_name: 'David Brower' }), DAVE, 'David')
  assert.equal(p.action, 'adopt')
  assert.deepEqual(p.bandPatch, { owner_id: DAVE })
  assert.deepEqual(p.sponsor, { userId: DAVE, uplineUserId: DAVID })
})

test('a different name is a new person, not an adoption', () => {
  const p = plan(band(), stop({ user_name: 'David Brower' }), SARAH, 'Sarah')
  assert.equal(p.action, 'new')
})

// ── Hand-offs ────────────────────────────────────────────────────
test('a guest accepting Jeff’s hand-off: transfer completes, band released, Jeff is upline', () => {
  const p = plan(band({ upline_user_id: DAVID, status: 'pending_transfer' }), null, null, 'Catherine', { pendingTransferFrom: JEFF })
  assert.equal(p.completeTransfer, true)
  assert.deepEqual(p.bandPatch, { owner_id: null, upline_user_id: JEFF })
  assert.equal(p.giverId, JEFF)
  assert.equal(p.sponsor, null)
})

test('a signed-in recipient accepting a hand-off takes the band and hangs under the giver', () => {
  const p = plan(band({ owner_id: JEFF, status: 'pending_transfer' }), null, SARAH, 'Sarah', { pendingTransferFrom: JEFF })
  assert.equal(p.completeTransfer, true)
  assert.deepEqual(p.bandPatch, { owner_id: SARAH, upline_user_id: JEFF })
  assert.deepEqual(p.sponsor, { userId: SARAH, uplineUserId: JEFF })
})

// ── The documented risk, kept on purpose ─────────────────────────
test('Matt deliberately registering a stop on Emily’s band moves it to Matt (the form is the deliberate act; the page never does this on its own)', () => {
  const p = plan(band({ owner_id: EMILY, upline_user_id: MATT }), stop({ user_id: EMILY }), MATT, 'Matt')
  assert.deepEqual(p.bandPatch, { owner_id: MATT, upline_user_id: EMILY })
  assert.equal(p.giverId, EMILY)
})
