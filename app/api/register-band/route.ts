import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isFlaggable, AUTO_FLAG_REASON } from '@/lib/moderation'

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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || ''
    let latitude = null
    let longitude = null
    let geoCity = city || null
    let geoState = state || null
    let geoCountry = country || null

    // 1. Geocode from typed city/country first (most accurate)
    if (geoCity || geoCountry) {
      try {
        const query = [geoCity, geoState, geoCountry].filter(Boolean).join(', ')
        const nominatim = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'PrayerBands/1.0 (hello@prayerbands.com)' } }
        )
        const places = await nominatim.json()
        if (places.length > 0) {
          latitude = parseFloat(places[0].lat)
          longitude = parseFloat(places[0].lon)
        }
      } catch {}
    }

    // 2. Fall back to IP geolocation only if no typed location
    if (!latitude && ip && ip !== '127.0.0.1') {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`)
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
    const autoFlag = isFlaggable(prayer)

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        band_id: bandId,
        user_name: name,
        city: geoCity,
        state: geoState,
        country: geoCountry,
        latitude,
        longitude,
        prayer: prayer || null,
        verse: verse || null,
        email: email || null,
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
                  <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;font-style:italic">${bandId} just reached a new person</p>
                </div>
                <div style="padding:32px">
                  <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                    <strong style="color:#1a5fa0">${name}</strong> just received your band in
                    <strong style="color:#1aabaa">${location}</strong>. Your prayer is continuing its journey. ✝
                  </p>
                  ${prayer ? `<div style="background:#fff;border-left:3px solid #f5a623;padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0"><p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${prayer}"</p></div>` : ''}
                  <div style="text-align:center;margin:28px 0">
                    <a href="https://prayerbands.com/band/${bandId}" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">View Full Journey ✝</a>
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
            headers: { 'Content-Type': 'application/json' },
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
