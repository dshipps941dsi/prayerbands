import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Attach an UNOWNED band to the signed-in user's account (sets bands.owner_id).
// Refuses if the band is already owned by someone else.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to claim this band.' }, { status: 401 })
    }

    const { bandId } = await req.json()
    if (!bandId) {
      return NextResponse.json({ error: 'Band ID is required' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { data: band } = await admin
      .from('bands')
      .select('id, band_id, owner_id')
      .eq('band_id', bandId)
      .maybeSingle()

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 })
    }

    if (band.owner_id && band.owner_id !== user.id) {
      return NextResponse.json({ error: 'This band is already linked to another account.' }, { status: 409 })
    }

    if (band.owner_id === user.id) {
      return NextResponse.json({ success: true, alreadyOwned: true })
    }

    const { error } = await admin
      .from('bands')
      .update({ owner_id: user.id })
      .eq('id', band.id)

    if (error) {
      console.error('[claim-band] update error:', error)
      return NextResponse.json({ error: 'Could not claim this band.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[claim-band] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
