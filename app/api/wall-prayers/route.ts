import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { publicName } from '@/lib/public-name'

// Public, read-only feed for the prayer wall. The wall used to query Supabase
// straight from the browser, which put every full surname in the network
// response even though the page only rendered a last initial. Shortening
// happens here instead, so the surname never leaves the server.
//
// No auth: this returns only non-flagged prayers, which are public by design.
const MAX_PAGE_SIZE = 48

export async function GET(req: Request) {
  const url = new URL(req.url)
  const page = Math.max(0, Number(url.searchParams.get('page') || 0) || 0)
  const size = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get('pageSize') || 12) || 12)
  )
  const from = page * size

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error, count } = await supabase
    .from('registrations')
    .select('id, band_id, prayer, user_name, city, state, country, verse, registered_at', { count: 'exact' })
    .not('prayer', 'is', null)
    .neq('prayer', '')
    .eq('flagged', false)
    .order('registered_at', { ascending: false })
    .range(from, from + size - 1)

  if (error) {
    return NextResponse.json({ error: 'Could not load prayers' }, { status: 500 })
  }

  const prayers = (data || []).map((r: any) => ({
    id: r.id,
    band_id: r.band_id,
    prayer: r.prayer,
    user_name: publicName(r.user_name),
    city: r.city,
    state: r.state,
    country: r.country,
    verse: r.verse,
    registered_at: r.registered_at,
  }))

  return NextResponse.json({ prayers, count: count || 0 })
}
