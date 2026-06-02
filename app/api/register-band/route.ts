import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
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

    // Get previous registrations for journey alerts
    const { data: prevRegs } = await supabase
      .from('registrations')
      .select('email, user_name')
      .eq('band_id', bandId)
      .not('email', 'is', null)

    // Save new registration
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

    // Update band status
    await supabase
      .from('bands')
      .update({ status: 'registered' })
      .eq('band_id', bandId)

    // Send journey alert emails to previous registrants
    const alertEmails = (prevRegs || []).map((r: any) => r.email).filter(Boolean)
    if (alertEmails.length > 0) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-journey-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bandId,
            newHolder: name,
            city: geoCity,
            state: geoState,
            country: geoCountry,
            prayer: prayer || null,
            emails: alertEmails,
          })
        })
      } catch (e) {
        console.error('Journey alert failed:', e)
      }
    }

    // Notify band owner that their band was passed on
    try {
      const { data: bandData } = await supabase
        .from('bands')
        .select('owner_id')
        .eq('band_id', bandId)
        .single()

      if (bandData?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('id', bandData.owner_id)
          .single()

        if (ownerProfile?.email) {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-band-passed-on`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerEmail: ownerProfile.email,
              ownerName: ownerProfile.display_name,
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