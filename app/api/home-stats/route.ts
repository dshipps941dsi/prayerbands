import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Public, read-only stats for the home page: aggregate counts + a set of recent
// PUBLIC (non-flagged) prayers, anonymized to first name + last initial, with
// coordinates for the map. No auth — only non-sensitive, already-public data.
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { count: prayers } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .not('prayer', 'is', null)

  const { count: bands } = await supabase
    .from('bands')
    .select('*', { count: 'exact', head: true })

  // Every registration is a person a band has reached ("lives impacted").
  const { count: people } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })

  // One pass over city/country gives us distinct countries, distinct cities,
  // and a top-countries leaderboard for the map section.
  const { data: geoRows } = await supabase
    .from('registrations')
    .select('city, country')
    .not('country', 'is', null)
    .limit(5000)
  const countrySet = new Set<string>()
  const citySet = new Set<string>()
  const countryCounts: Record<string, number> = {}
  for (const r of geoRows || []) {
    const c = ((r as any).country || '').trim()
    const city = ((r as any).city || '').trim()
    if (c) { countrySet.add(c); countryCounts[c] = (countryCounts[c] || 0) + 1 }
    if (city) citySet.add(`${city.toLowerCase()}|${c.toLowerCase()}`)
  }
  const countries = countrySet.size
  const cities = citySet.size
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }))

  const { data: recent } = await supabase
    .from('registrations')
    .select('user_name, city, country, latitude, longitude, prayer, band_id, registered_at')
    .not('prayer', 'is', null)
    .eq('flagged', false)
    .order('registered_at', { ascending: false })
    .limit(48)

  const anon = (name?: string | null) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return 'Someone'
    const last = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : ''
    return `${parts[0]}${last}`
  }
  const initialsOf = (name?: string | null) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '✝'
    const f = parts[0][0].toUpperCase()
    const l = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : ''
    return l ? `${f}.${l}.` : `${f}.`
  }

  const prayersList = (recent || []).map((r: any) => ({
    name: anon(r.user_name),
    initials: initialsOf(r.user_name),
    location: [r.city, r.country].filter(Boolean).join(', ') || 'Somewhere',
    lat: r.latitude,
    lng: r.longitude,
    prayer: r.prayer,
    band: r.band_id,
    registered_at: r.registered_at,
  }))

  return NextResponse.json({
    stats: { prayers: prayers || 0, people: people || 0, countries, cities, bands: bands || 0 },
    prayers: prayersList,
    topCountries,
  })
}
