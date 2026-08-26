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

  // "Prayers Lifted" counts prayer wherever it happens, not just prayers
  // written on a band: band prayers + circle requests + journal/network prayers
  // + every intercession (a 🙏 tap praying over someone else's need). A member
  // with no band who prays over ten circle requests now counts as ten, not zero
  // — because prayer, not hardware, is the point.
  const [
    { count: regPrayers },
    { count: circleReq },
    { count: netReq },
    { count: circleInt },
    { count: netInt },
  ] = await Promise.all([
    // Registering without writing anything stores an empty string, which
    // shouldn't count as a prayer.
    supabase.from('registrations').select('*', { count: 'exact', head: true }).not('prayer', 'is', null).neq('prayer', ''),
    supabase.from('circle_prayer_requests').select('*', { count: 'exact', head: true }),
    supabase.from('prayer_network_requests').select('*', { count: 'exact', head: true }),
    supabase.from('circle_intercessions').select('*', { count: 'exact', head: true }),
    supabase.from('prayer_network_intercessions').select('*', { count: 'exact', head: true }),
  ])
  const prayers = (regPrayers || 0) + (circleReq || 0) + (netReq || 0) + (circleInt || 0) + (netInt || 0)

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
    .select('id, user_id, user_name, city, state, country, latitude, longitude, prayer, band_id, registered_at')
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

  // The feed never displayed the band ID, but it was still being shipped to the
  // browser, where anyone could read it out of the network tab. It was only ever
  // used as a React key and to seed a decorative counter, so an opaque token
  // does the same job and identifies nothing.
  const opaque = (s: string): string => {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
    return (h >>> 0).toString(36)
  }

  const prayersList = (recent || []).map((r: any) => ({
    name: anon(r.user_name),
    initials: initialsOf(r.user_name),
    location: [r.city, r.country].filter(Boolean).join(', ') || 'Somewhere',
    lat: r.latitude,
    lng: r.longitude,
    prayer: r.prayer,
    key: opaque(`${r.band_id}|${r.registered_at}`),
    registered_at: r.registered_at,
  }))

  // One pin per PERSON, not per band. Keyed on band before, so anyone carrying
  // several bands appeared several times over — Jackson was four pins in one
  // town, which reads as four people rather than one person with four bands.
  //
  // Identifying "the same person" without an account is guesswork, so this only
  // merges where it can be sure:
  //   • signed in  → the account id, exact
  //   • a guest    → name + town, which is the same person often enough
  //   • no name    → never merged; two anonymous stops in one town are more
  //                  likely two people than one, and wrongly merging them
  //                  deletes somebody from the map
  const personKey = (r: any): string => {
    if (r.user_id) return `u:${r.user_id}`
    const name = (r.user_name || '').trim().toLowerCase()
    if (!name) return `r:${r.id}`
    return `g:${name}|${(r.city || '').trim().toLowerCase()}|${(r.country || '').trim().toLowerCase()}`
  }

  const seenAt = new Set<string>()
  const points = (geoStops || [])
    .filter((r: any) => {
      // geoStops is newest-first, so the first row wins and a person's pin sits
      // at the last place they were, not the first.
      const key = personKey(r)
      if (seenAt.has(key)) return false
      seenAt.add(key)
      return true
    })
    .map((r: any) => {
    // Spread stops that share a city centroid so a town of bands reads as a
    // town, not a single pin. Seeded by band and time, so each sits still.
    const at = scatterPoint(r.latitude, r.longitude, `${r.band_id}|${r.registered_at}`)
    return {
    name: anon(r.user_name),
    location: [r.city, r.state, r.country].filter(Boolean).join(', ') || 'Somewhere',
    lat: at.lat,
    lng: at.lng,
    prayer: (r.prayer || '').trim() || null,
    // No band_id. It was printed at the top of every popup, and a band ID is
    // the key to that band — it opens its page and the claim flow keys on it.
    // The map's job is to show that a band reached somewhere, which needs no
    // identifier at all.
    }
  })

  return NextResponse.json({
    stats: { prayers: prayers || 0, people: people || 0, countries, cities, bands: bands || 0 },
    prayers: prayersList,
    points,
    topCountries,
  })
}
