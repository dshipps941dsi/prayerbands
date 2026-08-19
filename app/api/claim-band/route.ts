import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Attach an UNOWNED band to the signed-in user's account (sets bands.owner_id).
// Refuses if the band is already owned by someone else.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to claim this band.' }, { status: 401 })
    }

    // Throttle claim attempts so a scraped wall of band IDs can't be mass-claimed
    // by a script. Limit per signed-in user AND per IP (5 / minute each).
    const ip = getClientIp(req)
    const [userOk, ipOk] = await Promise.all([
      checkRateLimit(`claim:user:${user.id}`, 5, 60),
      checkRateLimit(`claim:ip:${ip}`, 5, 60),
    ])
    if (!userOk || !ipOk) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429 })
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

    // Don't let someone claim ownership of a band that is actively held by a
    // DIFFERENT account. Blank bands (no registrations) and accountless-held
    // bands (latest holder has no user_id — e.g. the holder is signing in now to
    // attach it) remain claimable; a band whose latest holder is another signed-
    // in user does not.
    const { data: latest } = await admin
      .from('registrations')
      .select('user_id')
      .eq('band_id', bandId)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latest?.user_id && latest.user_id !== user.id) {
      return NextResponse.json({ error: 'This band is currently held by someone else.' }, { status: 403 })
    }

    const { error } = await admin
      .from('bands')
      .update({ owner_id: user.id })
      .eq('id', band.id)

    if (error) {
      console.error('[claim-band] update error:', error)
      return NextResponse.json({ error: 'Could not claim this band.' }, { status: 500 })
    }

    // Adopt the guest registration left behind by registering before signing in.
    // Without this the claimer is owner but not holder, and the journey shows
    // the band as held by nobody.
    //
    // ONLY the most recent registration. Updating every unlinked row on the
    // band credited earlier holders' stops to whoever claimed it later — on
    // PB-ZKPMT that attached Mason Struble's registration to Jackson's account,
    // even though Mason had an account of his own. Each stop belongs to the
    // person who made it.
    const { data: latestUnlinked } = await admin
      .from('registrations')
      .select('id, user_id')
      .eq('band_id', bandId)
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestUnlinked && !latestUnlinked.user_id) {
      const { error: adoptError } = await admin
        .from('registrations')
        .update({ user_id: user.id })
        .eq('id', latestUnlinked.id)
      if (adoptError) {
        // Ownership already succeeded; log and continue rather than failing the claim.
        console.error('[claim-band] registration adopt error:', adoptError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[claim-band] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
