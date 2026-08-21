import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isFlaggable, AUTO_FLAG_REASON } from '@/lib/moderation'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// Public "leave a prayer on the wall" submission. Server-side so it gets the
// same protections as band registration — moderation auto-flag, rate limiting,
// length bounds — instead of an unguarded client insert. Uses the service key,
// so the registrations table no longer needs an open anon-insert RLS policy.
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  try {
    const { bandId, prayer, location } = await req.json()

    const cleanBand = String(bandId || '').trim().toUpperCase()
    const cleanPrayer = String(prayer || '').trim().slice(0, 2000)
    if (!cleanBand || !cleanPrayer) {
      return NextResponse.json({ error: 'A band ID and a prayer are required.' }, { status: 400 })
    }
    if (cleanBand.length > 64 || /[^A-Z0-9_-]/.test(cleanBand)) {
      return NextResponse.json({ error: 'That band ID doesn’t look right.' }, { status: 400 })
    }

    const ip = getClientIp(req)
    if (!(await checkRateLimit(`wall:ip:${ip}`, 8, 60))) {
      return NextResponse.json({ error: 'Too many prayers just now. Please wait a moment.' }, { status: 429 })
    }

    // The band must exist (the FK would reject it anyway — this gives a clean message).
    const { data: band } = await supabase
      .from('bands')
      .select('band_id')
      .eq('band_id', cleanBand)
      .maybeSingle()
    if (!band) {
      return NextResponse.json({ error: 'We couldn’t find a band with that ID.' }, { status: 404 })
    }

    const autoFlag = isFlaggable(cleanPrayer)
    const { error } = await supabase
      .from('registrations')
      .insert({
        band_id: cleanBand,
        prayer: cleanPrayer,
        user_name: 'Anonymous',
        city: (location ? String(location).trim().slice(0, 120) : null) || null,
        flagged: autoFlag,
        flagged_reason: autoFlag ? AUTO_FLAG_REASON : null,
        // Anyone can post here without holding the band, so this row must never
        // be mistaken for possession. claim-band reads the latest registration
        // to decide who holds a band; unmarked, a wall post made an unowned band
        // look unheld and therefore claimable by whoever posted it.
        source: 'wall',
      })
    if (error) {
      console.error('[wall-prayer] insert error:', error)
      return NextResponse.json({ error: 'Could not post your prayer. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[wall-prayer] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
