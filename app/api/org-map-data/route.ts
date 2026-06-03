import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const orgId = req.nextUrl.searchParams.get('org_id')
  if (!orgId) return NextResponse.json({ error: 'No org_id' }, { status: 400 })

  // Get all registrations for org bands with coordinates
  const { data } = await supabase
    .from('registrations')
    .select('band_id, user_name, city, country, latitude, longitude, prayer, registered_at')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('registered_at', { ascending: true })

  if (!data) return NextResponse.json({ points: [] })

  // Filter to org bands and mark current (latest per band)
  const { data: orgBands } = await supabase
    .from('bands')
    .select('band_id')
    .eq('org_id', orgId)
    .eq('status', 'registered')

  const orgBandIds = new Set((orgBands || []).map((b: any) => b.band_id))
  const orgRegs = data.filter(r => orgBandIds.has(r.band_id))

  // Find latest registration per band
  const latestPerBand: Record<string, any> = {}
  orgRegs.forEach(r => {
    if (!latestPerBand[r.band_id] || new Date(r.registered_at) > new Date(latestPerBand[r.band_id].registered_at)) {
      latestPerBand[r.band_id] = r
    }
  })
  const latestIds = new Set(Object.values(latestPerBand).map((r: any) => r.band_id + r.registered_at))

  const points = orgRegs.map(r => ({
    lat: r.latitude,
    lng: r.longitude,
    bandId: r.band_id,
    name: r.user_name,
    city: r.city,
    country: r.country,
    prayer: r.prayer,
    date: r.registered_at,
    isCurrent: latestIds.has(r.band_id + r.registered_at),
  }))

  return NextResponse.json({ points }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
