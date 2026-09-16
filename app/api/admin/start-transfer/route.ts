import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/team'
import { createServiceClient } from '@/lib/supabase/server'

// Put a band into "pending transfer" on behalf of its holder — for when the
// giver hands a band over in person but never pressed "Pass this band on"
// (or could not), and the recipient should still get the hand-off screen.
// The transfer is recorded FROM the band's current owner (or latest holder),
// exactly as if they had done it themselves.
//
// POST { band_id, recipient_name?, note?, from_name? }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const bandId = String(body.band_id || '').trim().toUpperCase()
  if (!bandId) return NextResponse.json({ error: 'A band ID is required.' }, { status: 400 })
  const recipientName = String(body.recipient_name || '').trim().slice(0, 80) || null
  const note = String(body.note || '').trim().slice(0, 2000) || null
  const fromName = String(body.from_name || '').trim().slice(0, 80) || null

  const admin = createServiceClient()
  const { data: band } = await admin.from('bands').select('band_id, status, owner_id').eq('band_id', bandId).maybeSingle()
  if (!band) return NextResponse.json({ error: `Band ${bandId} not found.` }, { status: 404 })
  if (band.status === 'pending_transfer') return NextResponse.json({ error: `${bandId} is already in transfer.` }, { status: 409 })

  // Whose hand it is leaving: the owner, else the latest person on it.
  let fromUserId: string | null = band.owner_id ?? null
  if (!fromUserId) {
    const { data: latest } = await admin.from('registrations').select('user_id').eq('band_id', bandId).neq('source', 'wall')
      .order('registered_at', { ascending: false }).limit(1).maybeSingle()
    fromUserId = latest?.user_id ?? null
  }

  const { error: tErr } = await admin.from('band_transfers').insert({
    band_id: bandId, from_user_id: fromUserId, status: 'pending', recipient_name: recipientName, note, from_name: fromName,
  })
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })
  const { error: bErr } = await admin.from('bands').update({ status: 'pending_transfer' }).eq('band_id', bandId)
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  let fromLabel: string | null = null
  if (fromUserId) {
    const { data: p } = await admin.from('profiles').select('full_name, email').eq('id', fromUserId).maybeSingle()
    fromLabel = p?.full_name || p?.email || null
  }
  return NextResponse.json({ success: true, band_id: bandId, from: fromLabel, recipient_name: recipientName })
}
