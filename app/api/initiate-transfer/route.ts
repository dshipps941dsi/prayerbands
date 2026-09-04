import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

// Begin passing a band on to someone else. The sender is taken from the SESSION
// (never the body), and we verify they actually hold the band — otherwise anyone
// could spoof the sender or force a stranger's band into "pending transfer".
export async function POST(req: NextRequest) {
  const authed = await createServerClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to pass on your band.' }, { status: 401 })
  }

  const { bandId, note, recipientName } = await req.json()
  if (!bandId) {
    return NextResponse.json({ error: 'Missing band ID' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: band } = await admin
    .from('bands')
    .select('band_id, owner_id, status, upline_user_id')
    .eq('band_id', bandId)
    .maybeSingle()
  if (!band) {
    return NextResponse.json({ error: 'Band not found' }, { status: 404 })
  }
  if (band.status === 'pending_transfer') {
    return NextResponse.json({ error: 'This band is already being passed on.' }, { status: 409 })
  }

  // The caller must be the owner OR the current holder (latest registrant).
  const { data: latest } = await admin
    .from('registrations')
    .select('user_id')
    .eq('band_id', bandId)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const isOwner = !!band.owner_id && band.owner_id === user.id
  const isHolder = !!latest?.user_id && latest.user_id === user.id
  // A bulk/gift buyer never claimed or registered the band, so let them pass it
  // on straight from the tap (no claim step) — but ONLY if the band is on an
  // order THEY placed. Fulfillment records each packed band in
  // orders.assigned_band_ids and the buyer in orders.customer_email, so this is
  // the exact "matches an order that's been placed" check, not an upline proxy.
  let isBuyer = false
  if (!band.owner_id && user.email) {
    const { data: myOrder } = await admin
      .from('orders')
      .select('id')
      .ilike('customer_email', user.email)
      .contains('assigned_band_ids', [bandId])
      .limit(1)
      .maybeSingle()
    isBuyer = !!myOrder
  }
  if (!isOwner && !isHolder && !isBuyer) {
    return NextResponse.json({ error: 'You can only pass on a band you currently hold.' }, { status: 403 })
  }

  const { error: transferError } = await admin
    .from('band_transfers')
    .insert({
      band_id: bandId, from_user_id: user.id, status: 'pending',
      note: (note || '').toString().slice(0, 500) || null,
      recipient_name: (recipientName || '').toString().trim().slice(0, 80) || null,
    })
  if (transferError) {
    return NextResponse.json({ error: transferError.message }, { status: 500 })
  }

  const { error: bandError } = await admin
    .from('bands')
    .update({ status: 'pending_transfer' })
    .eq('band_id', bandId)
  if (bandError) {
    return NextResponse.json({ error: bandError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
