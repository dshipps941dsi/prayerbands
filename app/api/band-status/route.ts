import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { hasTapProof } from '@/lib/tap-proof'
import { loadStanding } from '@/lib/band-standing-load'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const bandId = req.nextUrl.searchParams.get('id')
  const userId = req.nextUrl.searchParams.get('userId')

  if (!bandId) {
    return NextResponse.json({ error: 'No band ID' }, { status: 400 })
  }

  // Lenient per-IP throttle: real users tap a handful of bands a minute, but a
  // script sweeping IDs to find unclaimed ones gets choked off (60 / minute).
  const ip = getClientIp(req)
  if (!(await checkRateLimit(`status:ip:${ip}`, 60, 60))) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })
  }

  // Light sanity check on the ID shape — keeps obviously-garbage values from
  // hitting the DB, and there's no valid band ID this would exclude.
  if (bandId.length > 64 || /[^A-Za-z0-9_-]/.test(bandId)) {
    return NextResponse.json({ screen: 'not_found' })
  }

  // Fetch band. maybeSingle() so a genuinely-missing band (null) is the
  // "not found" screen, while a real DB error surfaces as a retryable 'error'
  // screen instead of the dead-end "Band not found".
  const { data: band, error } = await supabase
    .from('bands')
    .select('*')
    .eq('band_id', bandId)
    .maybeSingle()

  if (error) {
    console.error('[band-status] band fetch error:', error)
    return NextResponse.json({ screen: 'error' }, { status: 503 })
  }
  if (!band) {
    return NextResponse.json({ screen: 'not_found' })
  }

  // Who put this band into circulation, shown at the head of the journey. Only
  // a display name is exposed — never the attribution email, which is an admin
  // detail and would leak an address to anyone tapping the band.
  let uplineName: string | null = null
  const uplineUserId: string | null = (band.upline_user_id as string | null) ?? null
  if (band.upline_user_id) {
    const { data: upline } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', band.upline_user_id)
      .maybeSingle()
    uplineName = upline?.full_name || (upline?.email ? upline.email.split('@')[0] : null)
  }
  delete (band as { upline_email?: string }).upline_email
  delete (band as { upline_user_id?: string }).upline_user_id

  // Bands made from September 2026 on carry a secret in the chip; taking one
  // (a new stop, a claim, accepting a hand-off) needs the tap cookie /r sets.
  // Surfaced so the page can say "tap your band" before the form, not after.
  const tapGate = {
    tapRequired: !!(band as { tap_secret_hash?: string | null }).tap_secret_hash,
    tapProven: !!(band as { tap_secret_hash?: string | null }).tap_secret_hash && hasTapProof(bandId, req),
  }
  delete (band as { tap_secret_hash?: string }).tap_secret_hash
  delete (band as { tap_secret_enc?: string }).tap_secret_enc

  // The private blessing is only ever surfaced through the one screen that needs
  // it (incoming_gift, below). Capture it, then strip it — along with the token —
  // from the public `band` object so it isn't echoed in every other screen's
  // payload (it used to be readable by anyone sweeping band IDs).
  const dedicationNote: string | null = band.dedication_note ?? null
  const dedicationRecipient: string | null = band.dedication_recipient ?? null
  delete (band as { dedication_token?: string }).dedication_token
  delete (band as { dedication_note?: string }).dedication_note
  delete (band as { dedication_recipient?: string }).dedication_recipient

  // Fetch registrations in order
  const { data: registrations } = await supabase
    .from('registrations')
    .select('id, user_name, city, country, latitude, longitude, registered_at, prayer, user_id')
    .eq('band_id', bandId)
    .order('registered_at', { ascending: true })

  const regs = registrations ?? []
  const latestReg = regs.at(-1) ?? null
  const currentHolderUserId = latestReg?.user_id ?? null

  // Whose band this is and what the viewer may do with it — the one rule
  // (lib/band-standing), sent with every screen so the page never works it
  // out for itself.
  const localHolder = req.nextUrl.searchParams.get('localHolder')
  const standing = await loadStanding(
    supabase,
    { band_id: bandId, owner_id: band.owner_id ?? null, upline_user_id: uplineUserId, status: band.status ?? null },
    userId,
    { onThisDevice: localHolder === 'true' },
  )

  // ── DECISION TREE ────────────────────────────────────
// ── DECISION TREE ────────────────────────────────────

  // 0. Device previously claimed this band (no account)
  if (localHolder === 'true') {
    return NextResponse.json({
      screen: 'personal_space',
      ...tapGate,
      standing,
      reason: 'local_holder',
      band,
      registrations: regs,
      uplineName,
    })
  }

  // 1. Band pre-linked to buyer account and that person is tapping
  if (band.owner_id && userId && band.owner_id === userId && regs.length === 0) {
    return NextResponse.json({
      screen: 'personal_space',
      ...tapGate,
      standing,
      reason: 'pre_linked_owner',
      band,
      registrations: regs,
      uplineName,
    })
  }

  // 2. Logged-in user is the current holder
  if (userId && currentHolderUserId && userId === currentHolderUserId) {
    return NextResponse.json({
      screen: 'personal_space',
      ...tapGate,
      standing,
      reason: 'current_holder',
      band,
      registrations: regs,
      uplineName,
    })
  }

  // 3. Pre-dedicated gift band — recipient's first tap, message not yet seen.
  // Gate on "no registrations yet" rather than a status string so it fires for
  // assigned/shipped gift bands too (one-time store gifts and subscriptions).
  //
  // Ahead of the pending-transfer screen on purpose: a band can be both dedicated
  // and handed on, and the dedication is the whole reason the giver wrote it. The
  // transfer is unaffected — register-band completes it from the registration, not
  // from whichever screen was shown.
  if (regs.length === 0 && dedicationNote && !band.dedication_viewed) {
    return NextResponse.json({
      screen: 'incoming_gift',
      ...tapGate,
      standing,
      band,
      registrations: regs,
      uplineName,
      dedicationNote,
      dedicationRecipient,
    })
  }

  // 3.5 Band is pending transfer
  if (band.status === 'pending_transfer') {
    const { data: transfer } = await supabase
      .from('band_transfers')
      .select('id, note, recipient_name, created_at, from_user_id, from_name')
      .eq('band_id', bandId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // The sender's name: what they wrote on the "From" line wins ("Grandma
    // Jo"); otherwise their account name.
    let senderName: string | null = (transfer as any)?.from_name || null
    if (!senderName && transfer?.from_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', transfer.from_user_id)
        .maybeSingle()
      senderName = profile?.full_name ?? null
    }

    return NextResponse.json({
      screen: 'incoming_transfer',
      ...tapGate,
      standing,
      band,
      registrations: regs,
      uplineName,
      transfer,
      senderName,
    })
  }

  // 4. Band is dedicated (purchased/gifted) but never tapped
  if (band.owner_id && regs.length === 0) {
    const { data: dedicator } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', band.owner_id)
      .maybeSingle()

    return NextResponse.json({
      screen: 'first_tap_gift',
      ...tapGate,
      standing,
      band,
      registrations: regs,
      uplineName,
      dedicatorName: dedicator?.full_name ?? null,
    })
  }

  // 5. Band has registrations — someone already holds it
  if (regs.length > 0) {
    return NextResponse.json({
      screen: 'journey',
      ...tapGate,
      standing,
      band,
      registrations: regs,
      uplineName,
      currentHolder: latestReg,
    })
  }

  // 6. Band exists but was never purchased or touched.
  // canHandOff: the entry screen leads with giving for the person this band
  // is credited to (a buyer, or whoever was handed a pile). A UI hint only —
  // initiate-transfer applies the same standing from the session.
  const canHandOff = standing.leadWithGiving
  return NextResponse.json({
    screen: 'first_tap_blank',
    ...tapGate,
    standing,
    band,
    registrations: regs,
    uplineName,
    canHandOff,
  })
}
