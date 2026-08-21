import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Owner-authorized dedication management: lets a signed-in buyer add/edit the
// gift message on any band they own, from their dashboard — no per-band token
// needed. dedication_note is column-revoked from authenticated users, so reads
// and writes go through the service client after an ownership check.

// GET /api/my-dedications → bands you own that haven't been opened yet, with
// their current dedication. (Once a band is tapped the message can't re-show,
// so those drop off the list.)
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data: bands, error } = await admin
    .from('bands')
    .select('band_id, dedication_recipient, dedication_note, dedication_viewed, created_at, registrations(count)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = (bands ?? [])
    .map((b: any) => ({
      band_id: b.band_id,
      dedication_recipient: b.dedication_recipient ?? '',
      dedication_note: b.dedication_note ?? '',
      taps: b.registrations?.[0]?.count ?? 0,
    }))
    .filter(b => b.taps === 0) // only bands not yet opened — editing a tapped one has no effect

  return NextResponse.json({ bands: list })
}

// POST /api/my-dedications { bandId, dedication_recipient, dedication_note }
// Save the dedication on a band the caller owns (and hasn't been opened yet).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bandId, dedication_recipient, dedication_note } = await req.json().catch(() => ({}))
  if (!bandId) return NextResponse.json({ error: 'bandId is required' }, { status: 400 })

  const admin = createServiceClient()
  const { data: band } = await admin
    .from('bands')
    .select('owner_id, registrations(count)')
    .eq('band_id', bandId)
    .maybeSingle()

  if (!band) return NextResponse.json({ error: 'Band not found' }, { status: 404 })
  if (band.owner_id !== user.id) return NextResponse.json({ error: 'You do not own this band' }, { status: 403 })
  if (((band as any).registrations?.[0]?.count ?? 0) > 0) {
    return NextResponse.json({ error: 'This band has already been opened.' }, { status: 409 })
  }

  const { error } = await admin
    .from('bands')
    .update({
      dedication_recipient: String(dedication_recipient || '').trim().slice(0, 120) || null,
      dedication_note: String(dedication_note || '').trim().slice(0, 300) || null,
      dedication_updated_at: new Date().toISOString(),
    })
    .eq('band_id', bandId)

  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  return NextResponse.json({ success: true })
}
