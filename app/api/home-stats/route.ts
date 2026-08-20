import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { publicName } from '@/lib/public-name'
import { scatterPoint } from '@/lib/map-scatter'

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
    // Registering without writing anything stores an empty string, which
    // counted as a prayer and overstated the headline figure.
    .neq('prayer', '')

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

  // Everyone the bands have reached, whether or not they wrote something. The
  // map answers "where has this travelled", and someone who registered without
  // leaving a prayer travelled just as far — nine real people were missing from
  // it for no better reason than having left the box blank.
  const { data: geoStops } = await supabase
    .from('registrations')
    .select('user_name, city, state, country, latitude, longitude, prayer, band_id, registered_at')
    .eq('flagged', false)
    .not('latitude', 'is', null)
    .order('registered_at', { ascending: false })
    .limit(300)

  const { data: recent } = await supabase
    .from('registrations')
    .select('user_name, city, country, latitude, longitude, prayer, band_id, registered_at')
    .not('prayer', 'is', null)
    .eq('flagged', false)
    .order('registered_at', { ascending: false })
    .limit(48)

  // Shared with the wall and both maps, so all public surfaces shorten names
  // the same way and cannot drift apart.
  const anon = (name?: string | null) => publicName(name, 'Someone')
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

  const points = (geoStops || []).map((r: any) => {
    // Spread stops that share a city centroid so a town of bands reads as a
    // town, not a single pin. Seeded by band and time, so each sits still.
    const at = scatterPoint(r.latitude, r.longitude, `${r.band_id}|${r.registered_at}`)
    return {
    name: anon(r.user_name),
    location: [r.city, r.state, r.country].filter(Boolean).join(', ') || 'Somewhere',
    lat: at.lat,
    lng: at.lng,
    prayer: (r.prayer || '').trim() || null,
    band: r.band_id,
    }
  })

  return NextResponse.json({
    stats: { prayers: prayers || 0, people: people || 0, countries, cities, bands: bands || 0 },
    prayers: prayersList,
    points,
    topCountries,
  })
}
