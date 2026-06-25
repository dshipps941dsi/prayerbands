import { NextResponse } from 'next/server'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

// Map points (incl. prayer text + coordinates) for the caller's own org only.
// Was: ?org_id=<anything> with Access-Control-Allow-Origin:* — any org's prayer
// map was publicly scrapeable. Now scoped to the signed-in member's org.
export async function GET() {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 404 })

  const supabase = serviceClient()

  const { data } = await supabase
    .from('registrations')
    .select('band_id, user_name, city, country, latitude, longitude, prayer, registered_at')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('registered_at', { ascending: true })

  if (!data) return NextResponse.json({ points: [] })

  const { data: orgBands } = await supabase
    .from('bands')
    .select('band_id')
    .eq('org_id', orgId)
    .eq('status', 'registered')

  const orgBandIds = new Set((orgBands || []).map((b: { band_id: string }) => b.band_id))
  const orgRegs = data.filter(r => orgBandIds.has(r.band_id))

  const latestPerBand: Record<string, { band_id: string; registered_at: string }> = {}
  orgRegs.forEach(r => {
    if (!latestPerBand[r.band_id] || new Date(r.registered_at) > new Date(latestPerBand[r.band_id].registered_at)) {
      latestPerBand[r.band_id] = r
    }
  })
  const latestIds = new Set(Object.values(latestPerBand).map(r => r.band_id + r.registered_at))

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

  return NextResponse.json({ points })
}
