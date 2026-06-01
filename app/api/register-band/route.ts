import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { bandId, name, city, country, prayer, verse, email } = await req.json()

    if (!bandId || !name) {
      return NextResponse.json({ error: 'Band ID and name are required' }, { status: 400 })
    }

    // Get IP for geolocation
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || ''
    let latitude = null
    let longitude = null
    let geoCity = city || null
    let geoCountry = country || null

    if (ip && ip !== '127.0.0.1') {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`)
        const geoData = await geo.json()
        if (!geoData.error) {
          latitude = geoData.latitude
          longitude = geoData.longitude
          if (!city) geoCity = geoData.city
          if (!country) geoCountry = geoData.country_name
        }
      } catch {}
    }

    // Save registration
    const { data, error } = await supabase
      .from('registrations')
      .insert({
        band_id: bandId,
        user_name: name,
        city: geoCity,
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

    return NextResponse.json({ success: true, registrationId: data.id })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}