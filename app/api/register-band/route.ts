import { sendEmail } from '@/lib/email'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { adoptNameFromRegistration } from '@/lib/adopt-name'
import { NextRequest, NextResponse } from 'next/server'
import { isFlaggable, AUTO_FLAG_REASON } from '@/lib/moderation'
import { escapeHtml } from '@/lib/escape-html'
import { subdivisionCentroid } from '@/lib/locations'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { titleCase, formatState, formatCountry } from '@/lib/text-format'
import { sendPush } from '@/lib/push'
import { hasTapProof, NEEDS_TAP_MESSAGE } from '@/lib/tap-proof'
import { planStop } from '@/lib/band-stop'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  try {
    const { bandId, name, city, state, country, prayer, verse, email, forSomeoneElse } = await req.json()

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

    // A signed-in person registering a band for someone standing next to them
    // (a parent for a kid, a friend helping a friend). The stop is recorded in
    // the other person's name as a guest so the band stays claimable by them,
    // and the helper is remembered as the giver rather than becoming the
    // holder. Three real bands ended up on the wrong account before this.
    const helperUserId = forSomeoneElse === true ? holderUserId : null
    const callerId = holderUserId
    if (helperUserId) holderUserId = null

    // Normalize + bound user text (the endpoint is public, so validate here).
    const cleanName = titleCase(String(name).trim().slice(0, 80)) || ''
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

    // The stop before this one. Used twice below: to adopt a matching guest
    // stop instead of stacking a duplicate, and to know who handed the band
    // over when nobody formally owned it.
    const { data: latestBefore } = await supabase
      .from('registrations')
      .select('id, user_id, user_name, registered_by, email')
      .eq('band_id', bandId)
      .neq('source', 'wall')
      .order('registered_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Proof of possession. Bands made from September 2026 on carry a secret
    // in the chip, and a stop on one of them — which is how ownership moves —
    // is only accepted from a phone that actually tapped it. The one
    // exception: the person who already owns or holds the band, adding to
    // their own journey from any device. Older bands have no secret and are
    // never gated.
    const { data: gateBand } = await supabase.from('bands').select('owner_id, tap_secret_hash').eq('band_id', bandId).maybeSingle()
    if (gateBand?.tap_secret_hash && !hasTapProof(bandId, req)) {
      const ownsIt = !!callerId && (gateBand.owner_id === callerId || latestBefore?.user_id === callerId)
      if (!ownsIt) return NextResponse.json({ error: NEEDS_TAP_MESSAGE, needsTap: true }, { status: 403 })
    }

    // What this stop changes — owner, upline, sponsor, a waiting hand-off —
    // is decided by one rule (lib/band-stop, tested against the real cases)
    // and executed here. Nothing below decides; it only writes.
    const { data: bandRow } = await supabase.from('bands').select('band_id, owner_id, upline_user_id, status').eq('band_id', bandId).maybeSingle()
    if (!bandRow) return NextResponse.json({ error: 'Band not found' }, { status: 404 })
    const { data: pendingT } = await supabase
      .from('band_transfers').select('id, from_user_id').eq('band_id', bandId).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const plan = planStop({
      band: { band_id: bandId, owner_id: bandRow.owner_id ?? null, upline_user_id: bandRow.upline_user_id ?? null, status: bandRow.status ?? null },
      latestBefore: latestBefore ? { id: latestBefore.id, user_id: latestBefore.user_id ?? null, registered_by: latestBefore.registered_by ?? null, user_name: latestBefore.user_name ?? null } : null,
      callerId,
      forSomeoneElse: forSomeoneElse === true,
      typedName: cleanName,
      pendingTransferFrom: pendingT ? ((pendingT as any).from_user_id ?? null) : undefined,
    })

    // The upline's email rides along on the band for admin lookups.
    const uplineEmailFor = async (id: string | undefined): Promise<string | null> => {
      if (!id) return null
      const { data: p } = await supabase.from('profiles').select('email').eq('id', id).maybeSingle()
      return (p as any)?.email ?? null
    }
    // Sponsorship is what the reach tree traverses. First-wins: whoever gave
    // someone their first band keeps them.
    const sponsorFirstWins = async (sp: { userId: string; uplineUserId: string } | null) => {
      if (!sp) return
      const { data: rp } = await supabase.from('profiles').select('upline_user_id').eq('id', sp.userId).maybeSingle()
      if (rp && !(rp as any).upline_user_id) {
        await supabase.from('profiles').update({ upline_user_id: sp.uplineUserId, upline_band_id: bandId }).eq('id', sp.userId).is('upline_user_id', null)
      }
    }

    // Same person, second time: attach their own guest stop instead of
    // writing "Kathy → Kathy".
    if (plan.action === 'adopt' && latestBefore) {
      await supabase.from('registrations').update({ user_id: plan.holderUserId }).eq('id', latestBefore.id)
      if ('owner_id' in plan.bandPatch) {
        await supabase.from('bands').update({ owner_id: plan.bandPatch.owner_id, status: 'registered' }).eq('band_id', bandId).is('owner_id', null)
      }
      await sponsorFirstWins(plan.sponsor)
      if (plan.holderUserId) await adoptNameFromRegistration(supabase, plan.holderUserId, cleanName)
      return NextResponse.json({ success: true, registrationId: latestBefore.id, adopted: true })
    }

    // Auto-flag prayers containing filtered language for admin review (hidden
    // from the public wall until approved). Soft — never blocks the submission.
    const autoFlag = isFlaggable(cleanPrayer)

    // Tidy the capitalisation of the place fields for display, whether typed or
    // filled in from the IP fallback ("venice, fl" -> "Venice, FL").
    geoCity = titleCase(geoCity)
    geoState = formatState(geoState)
    geoCountry = formatCountry(geoCountry)

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        band_id: bandId,
        user_name: cleanName,
        user_id: plan.holderUserId,
        registered_by: plan.helperUserId,
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

    // The band's owner and upline, as the plan says. An owner set on a band
    // nobody owned is guarded so two first taps in the same second cannot
    // both take it.
    const patch: Record<string, unknown> = { status: 'registered', ...plan.bandPatch }
    if (plan.bandPatch.upline_user_id) patch.upline_email = await uplineEmailFor(plan.bandPatch.upline_user_id)
    let bandUpdate = supabase.from('bands').update(patch).eq('band_id', bandId)
    if (plan.bandPatch.owner_id && !bandRow.owner_id) bandUpdate = bandUpdate.is('owner_id', null)
    const { error: patchError } = await bandUpdate
    if (patchError) console.error('[register-band] band patch error:', patchError)

    await sponsorFirstWins(plan.sponsor)

    // A signed-in person registering a stop has just given their name. If their
    // account has none — the emailed-code sign-up never asks — take it.
    if (plan.holderUserId) await adoptNameFromRegistration(supabase, plan.holderUserId, cleanName)

    // Mark a gift band's blessing as seen once the recipient actually registers
    // (idempotent no-op for non-gift bands / later holders).
    await supabase
      .from('bands')
      .update({ dedication_viewed: true })
      .eq('band_id', bandId)
      .eq('dedication_viewed', false)

    // The recipient accepting a hand-off completes it here — server-side and
    // atomic with the registration.
    if (plan.completeTransfer) {
      await supabase
        .from('band_transfers')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('band_id', bandId)
        .eq('status', 'pending')
    }

    // Who to tell the band moved on: the previous owner or holder on an
    // implicit hand-off. A formal hand-off's giver hears through the
    // "received your band" notice instead.
    const implicitGiverId: string | null = plan.completeTransfer ? null : plan.giverId

    // "Your band just moved" goes to the person who just handed it over —
    // the previous stop — not to everyone who ever held it. A five-stop band
    // used to email five people on every tap.
    let alertEmails: string[] = latestBefore?.email ? [String(latestBefore.email)] : []
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
          await sendEmail({
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
    const journeyAlerted = new Set(alertEmails.map(e => e.toLowerCase()))

    try {
      const { data: bandData } = await supabase
        .from('bands')
        .select('owner_id, upline_user_id')
        .eq('band_id', bandId)
        .single()

      // Gift received: a bought-as-a-gift band ships with no owner (so the
      // recipient can claim it) and the buyer as upline_user_id. Nothing told
      // the buyer when it was claimed — the owner alert below never fires for
      // an unowned band. So on the FIRST registration of a band whose upline is
      // someone other than the new holder, tell that giver their gift landed.
      // Covers both a plain gift claim and a hand-off (upline is set in both).
      const giverId = (bandData as any)?.upline_user_id as string | null | undefined
      const isFirstClaim = (prevRegs || []).length === 0
      // (Not when the giver is the one doing the registering on someone's behalf.)
      if (giverId && giverId !== holderUserId && giverId !== helperUserId && isFirstClaim) {
        try {
          const { data: giverProfile } = await supabase
            .from('profiles')
            .select('email, full_name, email_notifications')
            .eq('id', giverId)
            .maybeSingle()
          {
            // Push first: it is its own opt-in (per device), separate from email.
            const isUSp = /^(us|usa|united states)$/i.test(String(geoCountry || ''))
            const wherep = [geoCity, geoState, isUSp ? null : geoCountry].filter(Boolean).join(', ')
            await sendPush(giverId, {
              title: `${cleanName || 'Someone'} received your Prayer Band`,
              body: wherep ? `Claimed in ${wherep}. Your Prayer Band is traveling with them.` : 'Your Prayer Band is traveling with them.',
              url: '/my-band',
              tag: `gift-${bandId}`,
            })
          }
          if (giverProfile?.email && giverProfile.email_notifications !== false) {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const eGiver = escapeHtml(giverProfile.full_name || 'friend')
            const eHolder = escapeHtml(cleanName || 'Someone')
            const eBand = escapeHtml(bandId)
            // "Venice, FL" at home; the country only when it is not the US.
            const isUS = /^(us|usa|united states)$/i.test(String(geoCountry || ''))
            const where = [geoCity, geoState, isUS ? null : geoCountry].filter(Boolean).join(', ')
            await sendEmail({
              from: 'Prayer Bands <bands@prayerbands.com>',
              to: [giverProfile.email],
              subject: `🎁 ${cleanName || 'Someone'} received your Prayer Band`,
              html: `
                <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
                  <div style="background:#0d3d6e;padding:32px;text-align:center">
                    <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🎁</div>
                    <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your gift arrived</h1>
                    <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${eHolder} just ${holderUserId ? 'claimed' : 'tapped'} the band you gave them</p>
                  </div>
                  <div style="padding:32px">
                    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                      Hi ${eGiver} &mdash; <strong style="color:#0d3d6e">${eHolder}</strong> tapped band <strong>${eBand}</strong>${where ? ` in ${escapeHtml(where)}` : ''}${holderUserId ? ' and added it to their account' : ' and left their name on it'}. Your Prayer Band is now traveling with them.${holderUserId ? '' : ' They haven&rsquo;t made an account yet, so it isn&rsquo;t in their dashboard until they do &mdash; tapping the band again gets them there.'}
                    </p>
                    <div style="text-align:center;margin:28px 0">
                      <a href="https://prayerbands.com/band/${eBand}" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Follow its journey ✝</a>
                    </div>
                    <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">"Go into all the world and preach the gospel." — Mark 16:15</p>
                    <p style="font-size:11px;color:#b3bccb;text-align:center;margin:18px 0 0">Don't want these emails? <a href="https://prayerbands.com/settings" style="color:#8896a8">Manage notifications</a>.</p>
                  </div>
                </div>
              `,
            })
          }
        } catch (e) {
          console.error('Gift-received alert failed:', e)
        }
      }

      // Who to tell that the band moved on: the person who owned it before
      // this tap. After an implicit hand-off bandData.owner_id is already the
      // NEW holder, so use the giver captured above. A first-ever claim is
      // covered by the gift email, not this one.
      const notifyOwnerId = implicitGiverId
        ?? (bandData?.owner_id && bandData.owner_id !== holderUserId ? (bandData.owner_id as string) : null)
      if (notifyOwnerId && (prevRegs || []).length > 0) {
        await sendPush(notifyOwnerId, {
          title: `${cleanName || 'Someone'} now has your Prayer Band`,
          body: `${bandId} was passed on${geoCity ? ` in ${geoCity}` : ''}. Its journey continues from you.`,
          url: '/my-band',
          tag: `passed-on-${bandId}`,
        })
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, full_name, email_notifications')
          .eq('id', notifyOwnerId)
          .single()

        // The push always goes; the email only if the journey alert above did
        // not already reach this same address (previous holder = owner is the
        // common case, and it used to mean two emails for one tap).
        if (ownerProfile?.email && ownerProfile.email_notifications !== false && !journeyAlerted.has(ownerProfile.email.toLowerCase())) {
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
