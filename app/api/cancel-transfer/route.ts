import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

// Cancel a pending hand-off and return the band to its holder. Only the person
// who started the transfer (from_user_id) may cancel it — moved server-side
// because the old client write ran as anon and is blocked by RLS.
export async function POST(req: NextRequest) {
  const authed = await createServerClient()
  const { data: { user } } = await authed.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  const { bandId } = await req.json()
  if (!bandId) {
    return NextResponse.json({ error: 'Missing band ID' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: transfer } = await admin
    .from('band_transfers')
    .select('id, from_user_id')
    .eq('band_id', bandId)
    .eq('status', 'pending')
    .maybeSingle()
  if (!transfer) {
    return NextResponse.json({ error: 'No pending transfer to cancel.' }, { status: 404 })
  }
  if (transfer.from_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the sender can cancel this transfer.' }, { status: 403 })
  }

  await admin.from('band_transfers').update({ status: 'cancelled' }).eq('id', transfer.id)
  await admin.from('bands').update({ status: 'registered' }).eq('band_id', bandId)

  return NextResponse.json({ success: true })
}
