import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { adoptNameFromRegistration } from '@/lib/adopt-name'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { hasTapProof, NEEDS_TAP_MESSAGE } from '@/lib/tap-proof'
import { loadStanding } from '@/lib/band-standing-load'

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
      .select('id, band_id, owner_id, upline_user_id, status, tap_secret_hash')
      .eq('band_id', bandId)
      .maybeSingle()

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 })
    }

    if (band.owner_id === user.id) {
      return NextResponse.json({ success: true, alreadyOwned: true })
    }

    // The one rule (lib/band-standing): a helper who registered it for
    // someone else may not take it, nor may anyone take a band attached to
    // or held by another account. Blank bands and guest stops are claimable.
    const standing = await loadStanding(admin, { band_id: bandId, owner_id: band.owner_id ?? null, upline_user_id: band.upline_user_id ?? null, status: band.status ?? null }, user.id)
    if (standing.role === 'helper') {
      return NextResponse.json({ error: `This band was registered for ${standing.latestStop?.user_name || 'someone else'}; it is theirs to claim.`, forOther: true }, { status: 409 })
    }
    if (!standing.canClaim) {
      const error = band.owner_id ? 'This band is already linked to another account.' : 'This band is currently held by someone else.'
      return NextResponse.json({ error }, { status: band.owner_id ? 409 : 403 })
    }
    // Bands made from September 2026 on carry a secret in the chip: claiming
    // one needs the tap cookie /r sets, unless this account already holds it.
    if (band.tap_secret_hash && !hasTapProof(bandId, req) && standing.holderUserId !== user.id) {
      return NextResponse.json({ error: NEEDS_TAP_MESSAGE, needsTap: true }, { status: 403 })
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
    // Record who introduced this person, if the band carries an attribution.
    // First-wins: whoever gave someone their first band keeps them. Without
    // that, a later band would silently move them under a different sponsor.
    if (band.upline_user_id && band.upline_user_id !== user.id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('upline_user_id')
        .eq('id', user.id)
        .maybeSingle()
      if (profile && !profile.upline_user_id) {
        await admin
          .from('profiles')
          .update({ upline_user_id: band.upline_user_id, upline_band_id: bandId })
          .eq('id', user.id)
          .is('upline_user_id', null)
      }
    }

    // Wall posts excluded here too: adopting one would put a stranger's
    // anonymous prayer into this account's journey and take its name from it.
    const { data: latestUnlinked } = await admin
      .from('registrations')
      .select('id, user_id, user_name')
      .eq('band_id', bandId)
      .neq('source', 'wall')
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
      // They typed a name on the band's first screen moments ago. Use it rather
      // than leaving the account blank.
      await adoptNameFromRegistration(admin, user.id, (latestUnlinked as any).user_name)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[claim-band] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
