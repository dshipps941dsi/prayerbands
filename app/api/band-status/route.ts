import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

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

  // Fetch band
  const { data: band, error } = await supabase
    .from('bands')
    .select('*')
    .eq('band_id', bandId)
    .single()

  if (error || !band) {
    return NextResponse.json({ screen: 'not_found' })
  }

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

  // ── DECISION TREE ────────────────────────────────────
// ── DECISION TREE ────────────────────────────────────

  // 0. Device previously claimed this band (no account)
  const localHolder = req.nextUrl.searchParams.get('localHolder')
  if (localHolder === 'true') {
    return NextResponse.json({
      screen: 'personal_space',
      reason: 'local_holder',
      band,
      registrations: regs,
    })
  }

  // 1. Band pre-linked to buyer account and that person is tapping
  if (band.owner_id && userId && band.owner_id === userId && regs.length === 0) {
    return NextResponse.json({
      screen: 'personal_space',
      reason: 'pre_linked_owner',
      band,
      registrations: regs,
    })
  }

  // 2. Logged-in user is the current holder
  if (userId && currentHolderUserId && userId === currentHolderUserId) {
    return NextResponse.json({
      screen: 'personal_space',
      reason: 'current_holder',
      band,
      registrations: regs,
    })
  }

  // 3. Band is pending transfer
  if (band.status === 'pending_transfer') {
    const { data: transfer } = await supabase
      .from('band_transfers')
      .select('id, note, created_at, from_user_id')
      .eq('band_id', bandId)
      .eq('status', 'pending')
      .single()

    // Get the sender's name
    let senderName = null
    if (transfer?.from_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', transfer.from_user_id)
        .single()
      senderName = profile?.full_name ?? null
    }

    return NextResponse.json({
      screen: 'incoming_transfer',
      band,
      registrations: regs,
      transfer,
      senderName,
    })
  }

  // 3.5 Pre-dedicated gift band — recipient's first tap, message not yet seen.
  // Gate on "no registrations yet" rather than a status string so it fires for
  // assigned/shipped gift bands too (one-time store gifts and subscriptions).
  if (regs.length === 0 && dedicationNote && !band.dedication_viewed) {
    return NextResponse.json({
      screen: 'incoming_gift',
      band,
      registrations: regs,
      dedicationNote,
      dedicationRecipient,
    })
  }

  // 4. Band is dedicated (purchased/gifted) but never tapped
  if (band.owner_id && regs.length === 0) {
    const { data: dedicator } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', band.owner_id)
      .single()

    return NextResponse.json({
      screen: 'first_tap_gift',
      band,
      registrations: regs,
      dedicatorName: dedicator?.full_name ?? null,
    })
  }

  // 5. Band has registrations — someone already holds it
  if (regs.length > 0) {
    return NextResponse.json({
      screen: 'journey',
      band,
      registrations: regs,
      currentHolder: latestReg,
    })
  }

  // 6. Band exists but was never purchased or touched
  return NextResponse.json({
    screen: 'first_tap_blank',
    band,
    registrations: regs,
  })
}
