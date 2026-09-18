// What a new stop changes.
//
// The read side (lib/band-standing) answers "whose band is this". This is
// the write side: when someone registers a stop — taps a band and adds their
// name — what happens to the band's owner, its upline, the recipient's
// sponsor, and any hand-off waiting on it. One pure plan, executed by
// /api/register-band, tested in tests/band-stop.test.ts.
//
// The rules, in the order they apply:
//   1. A signed-in person registering FOR someone else is a helper: the stop
//      is a guest stop in the other person's name; the helper is never the
//      holder, and becomes the giver if nobody is credited yet.
//   2. Same person, second time: a guest stop with their first name, and
//      now they are signed in — attach that stop rather than stack another.
//   3. A pending hand-off completes: owner → the recipient (or released for a
//      guest), upline → the giver, the recipient's sponsor → the giver.
//   4. Otherwise the tap IS the hand-off: if someone else owned the band,
//      it moves to the new holder and the previous owner becomes upline.
//      If nobody owned it, a signed-in registrant takes it, hanging under
//      the previous holder if there was one — else under whoever the band
//      is credited to (a purchase). Sponsorship is first-wins, always.

import { namesMatch, type StandingBand, type StandingStop } from './band-standing.ts'

export type StopPlanInput = {
  band: StandingBand
  /** The latest real (non-wall) stop before this one, if any. */
  latestBefore: (StandingStop & { id?: string | number }) | null
  callerId: string | null
  forSomeoneElse: boolean
  typedName: string
  /** from_user_id of a pending hand-off on this band; undefined when there is none. */
  pendingTransferFrom?: string | null
}

export type StopPlan = {
  action: 'adopt' | 'new'
  /** user_id on the stop (null for a guest stop). */
  holderUserId: string | null
  /** registered_by on the stop: the helper, when registering for someone else. */
  helperUserId: string | null
  /** Applied to the band after the stop is written. Absent keys are untouched. */
  bandPatch: { owner_id?: string | null; upline_user_id?: string }
  /** profiles.upline_user_id for the holder, first-wins. */
  sponsor: { userId: string; uplineUserId: string } | null
  completeTransfer: boolean
  /** The account that handed the band over — who to tell "it moved on". */
  giverId: string | null
  why: string
}

export function planStop(input: StopPlanInput): StopPlan {
  const { band, latestBefore: latest, callerId, typedName } = input
  const helperUserId = input.forSomeoneElse && callerId ? callerId : null
  const holderUserId = helperUserId ? null : callerId
  const hasPending = input.pendingTransferFrom !== undefined

  // 2. Same person, second time. Only a guest stop nobody registered on
  //    someone else's behalf, and only on a first-name match.
  if (holderUserId && latest && !latest.user_id && !latest.registered_by && namesMatch(typedName, latest.user_name)) {
    const bandPatch: StopPlan['bandPatch'] = band.owner_id ? {} : { owner_id: holderUserId }
    const sponsor = band.upline_user_id && band.upline_user_id !== holderUserId ? { userId: holderUserId, uplineUserId: band.upline_user_id } : null
    return { action: 'adopt', holderUserId, helperUserId: null, bandPatch, sponsor, completeTransfer: false, giverId: null, why: 'their own guest stop, now signed in' }
  }

  const bandPatch: StopPlan['bandPatch'] = {}
  let sponsor: StopPlan['sponsor'] = null
  let giverId: string | null = null
  let why = 'new stop'

  // 1. Registered on someone's behalf.
  if (helperUserId) {
    if (band.owner_id === helperUserId) bandPatch.owner_id = null
    if (band.owner_id === helperUserId || !band.upline_user_id) bandPatch.upline_user_id = helperUserId
    why = 'registered for someone else'
  }

  // 3. A hand-off waiting on this band completes with this stop.
  if (hasPending) {
    const g = input.pendingTransferFrom && input.pendingTransferFrom !== holderUserId ? input.pendingTransferFrom : null
    bandPatch.owner_id = holderUserId ?? null
    if (g) {
      bandPatch.upline_user_id = g
      giverId = g
      if (holderUserId) sponsor = { userId: holderUserId, uplineUserId: g }
    }
    why = holderUserId ? 'accepted a hand-off' : 'accepted a hand-off as a guest'
    return { action: 'new', holderUserId, helperUserId, bandPatch, sponsor, completeTransfer: true, giverId, why }
  }

  // 4. The tap is the hand-off.
  if (!helperUserId) {
    const prevOwner = band.owner_id
    if (prevOwner && prevOwner !== holderUserId) {
      bandPatch.owner_id = holderUserId ?? null
      bandPatch.upline_user_id = prevOwner
      giverId = prevOwner
      if (holderUserId) sponsor = { userId: holderUserId, uplineUserId: prevOwner }
      why = holderUserId ? 'took a band its owner handed over' : 'guest stop on an owned band: released, owner becomes upline'
    } else if (!prevOwner && holderUserId) {
      bandPatch.owner_id = holderUserId
      const prevHolder = latest?.user_id && latest.user_id !== holderUserId ? latest.user_id : null
      if (prevHolder) {
        bandPatch.upline_user_id = prevHolder
        giverId = prevHolder
        sponsor = { userId: holderUserId, uplineUserId: prevHolder }
        why = 'took an unowned band from its previous holder'
      } else if (band.upline_user_id && band.upline_user_id !== holderUserId) {
        // A purchased or handed-out band, first taken while signed in: the
        // recipient hangs under whoever it is credited to.
        sponsor = { userId: holderUserId, uplineUserId: band.upline_user_id }
        why = 'first signed-in stop on a credited band'
      } else {
        why = 'first signed-in stop on a blank band'
      }
    } else if (prevOwner && prevOwner === holderUserId) {
      why = 'owner adding to their own journey'
    } else {
      why = 'guest stop on an unowned band'
    }
  }

  return { action: 'new', holderUserId, helperUserId, bandPatch, sponsor, completeTransfer: false, giverId, why }
}
