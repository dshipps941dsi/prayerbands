import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isFlaggable, AUTO_FLAG_REASON } from '@/lib/moderation'
import { escapeHtml } from '@/lib/escape-html'
import { subdivisionCentroid } from '@/lib/locations'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  try {
    const { bandId, name, city, state, country, prayer, verse, email } = await req.json()

    if (!bandId || !name) {
      return NextResponse.json({ error: 'Band ID and name are required' }, { status: 400 })
    }

    // Throttle writes — this endpoint is otherwise open. Generous enough for a
    // church handing out bands on shared venue wifi, tight enough to stop a
    // script appending thousands of bogus holders.
    const rlIp = getClientIp(req)
    if (!(await checkRateLimit(`register:ip:${rlIp}`, 20, 60))) {
      return NextResponse.json({ error: 'Too many registrations. Please wait a moment.' }, { status: 429 })
    }

    // Bind the registration to the signed-in user when there is one. Read it
    // from the session cookie (authoritative) — never trust a user id in the
    // body. Anonymous first-tap is still allowed (user_id stays null); this is
    // what lets a signed-in owner keep their band across devices instead of
    // dropping to the public journey on the next tap.
    let holderUserId: string | null = null
    try {
      const authed = await createServerClient()
      const { data: { user } } = await authed.auth.getUser()
      holderUserId = user?.id ?? null
    } catch { /* not signed in — anonymous registration */ }

    // Normalize + bound user text (the endpoint is public, so validate here).
    const cleanName = String(name).trim().slice(0, 80)
    if (!cleanName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const cleanPrayer = prayer ? String(prayer).trim().slice(0, 2000) || null : null
    const cleanEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
      ? String(email).trim().toLowerCase()
      : null

    // Idempotency: collapse accidental double-submits (double-tap, or a retry
    // after a flaky network where the first insert actually succeeded). If an
    // identical registration for this band landed in the last 30s, return it
    // instead of appending a duplicate holder to the chain.
    const dupSince = new Date(Date.now() - 30_000).toISOString()
    const { data: dup } = await supabase
      .from('registrations')
      .select('id')
      .eq('band_id', bandId)
      .eq('user_name', cleanName)
      .gte('registered_at', dupSince)
      .limit(1)
      .maybeSingle()
    if (dup) {
      return NextResponse.json({ success: true, registrationId: dup.id, deduped: true })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || ''
    let latitude = null
    let longitude = null
    let geoCity = city || null
    let geoState = state || null
    let geoCountry = country || null

    // Hand-typed locations arrive with stray whitespace ("NY ") and typos
    // ("Syracus"). Trim first, then try progressively looser queries: a
    // misspelled city should still drop a pin on the right state rather than
    // leaving the registration with no coordinates at all — the dashboard map
    // filters those out, so the stop silently disappears from the journey.
    geoCity = geoCity?.trim() || null
    geoState = geoState?.trim() || null
    geoCountry = geoCountry?.trim() || null

    async function geocode(query: string): Promise<[number, number] | null> {
      try {
        const nominatim = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'PrayerBands/1.0 (hello@prayerbands.com)' }, signal: AbortSignal.timeout(3500) }
        )
        const places = await nominatim.json()
        if (Array.isArray(places) && places.length > 0) {
          return [parseFloat(places[0].lat), parseFloat(places[0].lon)]
        }
      } catch {}
      return null
    }

    // 1. Geocode from typed city/country first (most accurate), widening the
    //    query only if the more precise one finds nothing.
    const attempts = [
      [geoCity, geoState, geoCountry],
      [geoCity, geoCountry],
      [geoState, geoCountry],
      [geoCountry],
    ]
      .map(parts => parts.filter(Boolean).join(', '))
      .filter((q, i, all) => q && all.indexOf(q) === i)

    for (const query of attempts) {
      const hit = await geocode(query)
      if (hit) { [latitude, longitude] = hit; break }
    }

    // 1b. Offline fallback. The form now sends a real state/province code, so a
    // pin can be placed with no network call at all — which matters because
    // Nominatim is free-tier and rate-limited, and a classroom registering at
    // once would otherwise silently save rows with no coordinates.
    if (!latitude) {
      const centroid = subdivisionCentroid(geoCountry || '', geoState || '')
      if (centroid) { latitude = centroid.lat; longitude = centroid.lng }
    }

    // 2. Fall back to IP geolocation only if no typed location
    if (!latitude && ip && ip !== '127.0.0.1') {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(3500) })
        const geoData = await geo.json()
        if (!geoData.error) {
          latitude = geoData.latitude
          longitude = geoData.longitude
          if (!geoCity) geoCity = geoData.city
          if (!geoState) geoState = geoData.region
          if (!geoCountry) geoCountry = geoData.country_name
        }
      } catch {}
    }

    const { data: prevRegs } = await supabase
      .from('registrations')
      .select('email, user_name')
      .eq('band_id', bandId)
      .not('email', 'is', null)

    // Auto-flag prayers containing filtered language for admin review (hidden
    // from the public wall until approved). Soft — never blocks the submission.
    const autoFlag = isFlaggable(cleanPrayer)

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        band_id: bandId,
        user_name: cleanName,
        user_id: holderUserId,
        city: geoCity,
        state: geoState,
        country: geoCountry,
        latitude,
        longitude,
        prayer: cleanPrayer,
        verse: verse || null,
        email: cleanEmail,
        ip_address: ip || null,
        flagged: autoFlag,
        flagged_reason: autoFlag ? AUTO_FLAG_REASON : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase
      .from('bands')
      .update({ status: 'registered' })
      .eq('band_id', bandId)

    // Mark a gift band's blessing as seen once the recipient actually registers
    // (idempotent no-op for non-gift bands / later holders). This replaces the
    // old unauthenticated mark-dedication-viewed POST — so closing the tab on the
    // claim form no longer permanently suppresses the "sent especially for you"
    // reveal; it persists until they genuinely claim the band.
    await supabase
      .from('bands')
      .update({ dedication_viewed: true })
      .eq('band_id', bandId)
      .eq('dedication_viewed', false)

    // If this registration is the recipient accepting a hand-off, complete the
    // pending transfer here — server-side and atomic with the registration —
    // rather than via forgeable client writes that RLS now blocks anyway.
    const { data: completedTransfers } = await supabase
      .from('band_transfers')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('band_id', bandId)
      .eq('status', 'pending')
      .select('from_user_id')

    // Handing a band over has to hand ownership over too. Completing the
    // transfer used to leave owner_id on the giver forever, so a recipient who
    // later made an account was refused by claim-band with "already linked to
    // another account" — on the band in their own hand. A guest recipient has no
    // account to receive ownership, so it is released instead, which leaves the
    // band claimable if they sign up later.
    if (completedTransfers && completedTransfers.length > 0) {
      const giverId = (completedTransfers[0] as any).from_user_id as string | null
      const giver = giverId && giverId !== holderUserId ? giverId : null

      let giverEmail: string | null = null
      if (giver) {
        const { data: giverProfile } = await supabase
          .from('profiles').select('email').eq('id', giver).maybeSingle()
        giverEmail = (giverProfile as any)?.email ?? null
      }

      const { error: handoverError } = await supabase
        .from('bands')
        .update({
          owner_id: holderUserId || null,
          // The giver becomes the upline on every pass, so the tree gains a
          // level each time instead of everyone hanging off whoever started it.
          ...(giver ? { upline_user_id: giver, upline_email: giverEmail } : {}),
        })
        .eq('band_id', bandId)
      if (handoverError) console.error('[register-band] handover error:', handoverError)

      // Sponsorship is what the reach tree actually traverses (profiles.upline_
      // user_id), and accepting a hand-off is exactly the moment one person
      // introduces another. First-wins, matching claim-band: whoever gave
      // someone their first band keeps them, so a later hand-off cannot take
      // attribution from the person who actually introduced them.
      if (giver && holderUserId) {
        const { data: recipientProfile } = await supabase
          .from('profiles').select('upline_user_id').eq('id', holderUserId).maybeSingle()
        if (recipientProfile && !(recipientProfile as any).upline_user_id) {
          await supabase
            .from('profiles')
            .update({ upline_user_id: giver, upline_band_id: bandId })
            .eq('id', holderUserId)
            .is('upline_user_id', null)
        }
      }
    }

    let alertEmails = (prevRegs || []).map((r: any) => r.email).filter(Boolean)
    // Respect notification opt-outs: drop any prior holder whose account has
    // turned band emails off.
    if (alertEmails.length > 0) {
      const { data: optedOut } = await supabase
        .from('profiles')
        .select('email')
        .in('email', alertEmails)
        .eq('email_notifications', false)
      const muted = new Set((optedOut || []).map((p: any) => (p.email || '').toLowerCase()))
      if (muted.size > 0) alertEmails = alertEmails.filter((e: string) => !muted.has(e.toLowerCase()))
    }
    if (alertEmails.length > 0) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const location = [geoCity, geoState, geoCountry].filter(Boolean).join(', ')
        // Escape every user-controlled value before it enters the email HTML.
        const eName = escapeHtml(cleanName)
        const eLocation = escapeHtml(location)
        const ePrayer = escapeHtml(cleanPrayer)
        const eBandId = escapeHtml(bandId)
        for (const email of alertEmails) {
          await resend.emails.send({
            from: 'Prayer Bands <bands@prayerbands.com>',
            to: [email],
            subject: `✝ Your band ${bandId} just moved to ${location}`,
            html: `
              <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
                <div style="background:#0d3d6e;padding:32px;text-align:center">
                  <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
                  <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your Band is Traveling</h1>
                  <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;font-style:italic">${eBandId} just reached a new person</p>
                </div>
                <div style="padding:32px">
                  <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                    <strong style="color:#1a5fa0">${eName}</strong> just received your band in
                    <strong style="color:#1aabaa">${eLocation}</strong>. Your prayer is continuing its journey. ✝
                  </p>
                  ${cleanPrayer ? `<div style="background:#fff;border-left:3px solid #f5a623;padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0"><p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${ePrayer}"</p></div>` : ''}
                  <div style="text-align:center;margin:28px 0">
                    <a href="https://prayerbands.com/band/${eBandId}" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">View Full Journey ✝</a>
                  </div>
                  <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">"Go into all the world and preach the gospel." — Mark 16:15</p>
                  <p style="font-size:11px;color:#b3bccb;text-align:center;margin:18px 0 0">Don't want these emails? <a href="https://prayerbands.com/settings" style="color:#8896a8">Manage notifications</a>.</p>
                </div>
              </div>
            `
          })
        }
      } catch (e) {
        console.error('Journey alert failed:', e)
      }
    }

    try {
      const { data: bandData } = await supabase
        .from('bands')
        .select('owner_id')
        .eq('band_id', bandId)
        .single()

      if (bandData?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, full_name, email_notifications')
          .eq('id', bandData.owner_id)
          .single()

        if (ownerProfile?.email && ownerProfile.email_notifications !== false) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-band-passed-on`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET_KEY || '',
            },
            body: JSON.stringify({
              ownerEmail: ownerProfile.email,
              ownerName: ownerProfile.full_name,
              bandId,
              newHolderName: name,
              city: geoCity,
              country: geoCountry,
            })
          })
        }
      }
    } catch (e) {
      console.error('Band passed-on notification failed:', e)
    }

    return NextResponse.json({ success: true, registrationId: data.id })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
