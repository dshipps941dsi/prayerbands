import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    if (ip && ip !== '127.0.0.1') {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`)
        const geoData = await geo.json()
        if (!geoData.error) {
          latitude = geoData.latitude
          longitude = geoData.longitude
          if (!city) geoCity = geoData.city
          if (!state) geoState = geoData.region
          if (!country) geoCountry = geoData.country_name
        }
      } catch {}
    }

    const { data: prevRegs } = await supabase
      .from('registrations')
      .select('email, user_name')
      .eq('band_id', bandId)
      .not('email', 'is', null)

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

    const alertEmails = (prevRegs || []).map((r: any) => r.email).filter(Boolean)
    if (alertEmails.length > 0) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const location = [geoCity, geoState, geoCountry].filter(Boolean).join(', ')
        for (const email of alertEmails) {
          await resend.emails.send({
            from: 'PrayerBands <bands@prayerbands.com>',
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
                    <a href="ht
