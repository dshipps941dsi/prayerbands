import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Self-service lost-band replacement. The signed-in owner links a NEW band they
// now hold to one of THEIR lost bands: the prayer journey moves onto the new
// band and the old band is retired. The new band keeps its own design/theme.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    }

    const body = await req.json()
    const oldId = String(body.old_band_id || '').trim().toUpperCase()
    const newId = String(body.new_band_id || '').trim().toUpperCase()

    if (!oldId || !newId) {
      return NextResponse.json({ error: 'Both the lost band and the new band ID are required.' }, { status: 400 })
    }
    if (oldId === newId) {
      return NextResponse.json({ error: 'The new band ID must be different from the lost one.' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { data: oldBand } = await admin
      .from('bands')
      .select('id, owner_id')
      .eq('band_id', oldId)
      .maybeSingle()
    const { data: newBand } = await admin
      .from('bands')
      .select('id, owner_id')
      .eq('band_id', newId)
      .maybeSingle()

    // Owner guard: you can only replace a band you own.
    if (!oldBand || oldBand.owner_id !== user.id) {
      return NextResponse.json({ error: 'That lost band is not on your account.' }, { status: 403 })
    }
    if (!newBand) {
      return NextResponse.json({ error: `We couldn't find band ${newId}. Check the ID on your new band.` }, { status: 404 })
    }
    if (newBand.owner_id && newBand.owner_id !== user.id) {
      return NextResponse.json({ error: `Band ${newId} is already linked to another account.` }, { status: 409 })
    }

    // New band belongs to this user and is active.
    const { error: newErr } = await admin
      .from('bands')
      .update({ owner_id: user.id, status: 'registered' })
      .eq('id', newBand.id)
    if (newErr) {
      console.error('[replace-band] new band update error:', newErr)
      return NextResponse.json({ error: 'Could not activate the new band.' }, { status: 500 })
    }

    // Move the prayer journey onto the new band.
    const { data: moved, error: regErr } = await admin
      .from('registrations')
      .update({ band_id: newId })
      .eq('band_id', oldId)
      .select('id')
    if (regErr) {
      console.error('[replace-band] registration move error:', regErr)
      return NextResponse.json({ error: 'Could not move the prayer history.' }, { status: 500 })
    }

    // Retire the old band. This used to be fire-and-forget, and the write was


    // being rejected every time — so the old band stayed live and owned while


    // its history moved to the replacement, and the caller was told it worked.


    const { error: retireErr } = await admin


      .from('bands')


      .update({ status: 'replaced', owner_id: null })


      .eq('id', oldBand.id)


    if (retireErr) {


      console.error('[replace-band] retire old band error:', retireErr)


      return NextResponse.json(


        { error: 'The new band is ready, but the old one could not be retired. Contact support before using it.' },


        { status: 500 }


      )


    }

    return NextResponse.json({
      success: true,
      movedRegistrations: (moved ?? []).length,
      newBandId: newId,
      oldBandId: oldId,
    })
  } catch (err) {
    console.error('[replace-band] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
