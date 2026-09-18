// Whose band is this, and what may this person do with it?
//
// One answer, used everywhere: My Bands, the band's entry screen, the claim
// step, passing a band on. Every incident in this area (Victor/Jackson,
// Kathy/Jennifer, Emily/Matt, Dave Brower, Jeff Kondel's order) came from a
// screen answering this question with its own rule. This is the rule. It is
// a pure function so the real cases live as tests in tests/band-standing.
//
// The facts it reads:
//   owner_id        — an account the band is attached to. A purchase does NOT
//                     set this: the buyer is upline so the recipient can claim.
//   upline_user_id  — who put the band into circulation for the person below
//                     (the buyer, or whoever handed it on). Credit, not custody.
//   stops           — the registrations, oldest first. The latest real stop is
//                     the holder. Wall posts are not stops.
//   registered_by   — on a stop: an account that registered the band for
//                     someone else. That account is a helper, never the holder.

export type StandingBand = {
  band_id: string
  owner_id: string | null
  upline_user_id: string | null
  status: string | null
}

export type StandingStop = {
  user_id: string | null
  registered_by?: string | null
  user_name?: string | null
  registered_at?: string | null
  source?: string | null
}

export type StandingInput = {
  band: StandingBand
  stops: StandingStop[]
  viewerId: string | null
  /** The viewer's account name, for "this band was registered as X — is it yours?" */
  viewerName?: string | null
  /** An order the viewer placed lists this band (bands assigned before upline credit existed). */
  orderedByViewer?: boolean
  /** This device registered the band as a guest (the page's holder_ flag). */
  onThisDevice?: boolean
  now?: number
}

export type Role =
  | 'stranger'      // no standing: someone else's band, or a blank one
  | 'guest_holder'  // registered it on this device without an account
  | 'holder'        // the latest stop is this account's
  | 'owner'         // attached to this account, nobody has tapped it yet
  | 'giver_stock'   // credited to this person and still untaken: theirs to give
  | 'giver_given'   // credited to this person, and someone has taken it
  | 'helper'        // registered it for someone else; it is that person's to claim

export type Standing = {
  role: Role
  taken: boolean
  latestStop: StandingStop | null
  holderUserId: string | null
  /** In the drawer, waiting to be given: shows under My Bands as "to give away". */
  giving: boolean
  /** May start a hand-off (owner, holder, or giver with stock), unless one is pending. */
  canPassOn: boolean
  /** May attach the band to their account with a deliberate tap. */
  canClaim: boolean
  /** Show "This band was registered as X. Is it yours?" */
  offerClaim: boolean
  /** Attach without asking: this device registered it minutes ago under this name. */
  autoClaim: boolean
  /** The entry screen leads with giving, not with "add your name". */
  leadWithGiving: boolean
  why: string
}

export const AUTO_CLAIM_WINDOW_MS = 30 * 60 * 1000

// Same tolerance the registration form uses: first names match, or one is a
// prefix of the other ("Dave" / "David Brower"). Nothing to compare → no match.
export function namesMatch(mine: string | null | undefined, theirs: string | null | undefined): boolean {
  const a = (mine || '').trim().toLowerCase(), b = (theirs || '').trim().toLowerCase()
  if (!a || !b) return false
  if (a === b) return true
  const fa = a.split(/\s+/)[0], fb = b.split(/\s+/)[0]
  return fa === fb || a.startsWith(b) || b.startsWith(a)
}

export function bandStanding(input: StandingInput): Standing {
  const { band, viewerId } = input
  const now = input.now ?? Date.now()
  const stops = input.stops
    .filter(s => s.source !== 'wall')
    .slice()
    .sort((a, b) => String(a.registered_at || '').localeCompare(String(b.registered_at || '')))
  const latest = stops.at(-1) ?? null
  const taken = stops.length > 0
  const inTransfer = band.status === 'pending_transfer'
  const holderUserId = latest?.user_id ?? null

  const base = { taken, latestStop: latest, holderUserId, giving: false, canPassOn: false, canClaim: false, offerClaim: false, autoClaim: false, leadWithGiving: false }
  const out = (role: Role, why: string, extra: Partial<Standing> = {}): Standing => ({ role, ...base, ...extra, why })

  // ── Nobody signed in ─────────────────────────────────────────
  if (!viewerId) {
    if (input.onThisDevice && latest && !latest.user_id) {
      return out('guest_holder', 'this device registered the band without an account')
    }
    return out('stranger', 'not signed in')
  }

  const isOwner = !!band.owner_id && band.owner_id === viewerId
  const isHolder = !!latest?.user_id && latest.user_id === viewerId
  const isUpline = !!band.upline_user_id && band.upline_user_id === viewerId
  const isHelper = !!latest && !latest.user_id && latest.registered_by === viewerId
  const heldByOther = !!latest?.user_id && latest.user_id !== viewerId
  const ownedByOther = !!band.owner_id && band.owner_id !== viewerId

  // ── The latest stop is theirs: they hold it ──────────────────
  if (isHolder) {
    return out('holder', 'latest stop is this account', { canPassOn: !inTransfer })
  }

  // ── They registered it for someone else ──────────────────────
  // Opening the page again must not quietly take the band back; it is the
  // named person's to claim. Not even "make it mine" is offered.
  if (isHelper) {
    return out('helper', 'registered it for someone else', { canPassOn: isOwner && !inTransfer })
  }

  // ── Attached to their account ────────────────────────────────
  if (isOwner) {
    if (!taken) {
      // Linked to the buyer's account and never tapped: theirs, and theirs to give.
      return out('owner', 'owned, nobody has tapped it', { giving: true, canPassOn: !inTransfer, leadWithGiving: true })
    }
    // Someone else's stop is the latest: it has been given (owner still on
    // the row from before hand-offs moved ownership). They may still pass it
    // on, but it is not in their drawer.
    return out('giver_given', 'owned, but the latest stop is someone else’s', { canPassOn: !inTransfer })
  }

  // An unowned band whose latest stop was made without an account is
  // claimable with a deliberate tap. It is offered only when it looks like
  // theirs: this device registered it, or the name on the stop is their
  // name; and attached without asking only when both hold and the stop is
  // minutes old (finishing sign-up).
  const guestClaim = () => {
    const sameName = namesMatch(input.viewerName, latest!.user_name)
    const fromDevice = !!input.onThisDevice
    const ageMs = latest!.registered_at ? now - new Date(latest!.registered_at).getTime() : Infinity
    const fresh = ageMs >= 0 && ageMs <= AUTO_CLAIM_WINDOW_MS
    const autoClaim = fromDevice && sameName && fresh
    // Offer when the name fits, or when this device made the stop and the
    // account has no name to compare yet. The device alone is not enough:
    // on a shared phone that would offer a spouse's stop to the other spouse.
    const nameless = !(input.viewerName || '').trim()
    return { canClaim: true, offerClaim: !autoClaim && (sameName || (fromDevice && nameless)), autoClaim }
  }
  const guestStop = !!latest && !latest.user_id

  // ── Credited as the giver: a purchase, or a pile handed to them ──
  if (!band.owner_id && (isUpline || input.orderedByViewer)) {
    if (!taken) {
      return out('giver_stock', isUpline ? 'credited giver, untaken' : 'on an order they placed, untaken', { giving: true, canPassOn: !inTransfer, leadWithGiving: true })
    }
    // Someone registered it as a guest. Usually the recipient — but a giver
    // who tapped their own band signed out and typed their own name gets the
    // same "is it yours?" anyone else would.
    if (guestStop) return out('giver_given', 'credited giver; latest stop is a guest', guestClaim())
    return out('giver_given', 'credited giver, already taken', {})
  }
  // Credited, but the band is attached to or held by someone else now: given.
  if (isUpline) return out('giver_given', 'credited giver; the band is someone else’s now')

  // ── Owned or held by someone else ────────────────────────────
  if (ownedByOther) return out('stranger', 'attached to another account')
  if (heldByOther) return out('stranger', 'held by another account')

  // ── Unowned, last registered without an account ──────────────
  if (guestStop) return out('stranger', 'unowned, last registered as a guest', guestClaim())
  // Blank band nobody has touched: anyone signed in may attach it.
  return out('stranger', 'blank band', { canClaim: !taken })
}
