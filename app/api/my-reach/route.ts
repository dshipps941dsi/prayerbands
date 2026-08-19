import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// How far the bands someone put into circulation have travelled.
//
// depth=1   people they handed a band to directly
// depth=2   those people's recipients as well
// depth=all everyone below them, however many generations
//
// Reach is person-to-person (profiles.upline_user_id), not band-to-band: a
// band changes hands many times, but sponsorship is fixed the first time
// someone claims a band that carries an attribution.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ people: [], points: [], counts: { direct: 0, total: 0 } })

  const admin = createServiceClient()
  const depthParam = (req.nextUrl.searchParams.get('depth') || 'all').toLowerCase()
  const maxDepth = depthParam === 'all' ? null : Math.max(1, Math.min(parseInt(depthParam, 10) || 1, 20))

  const { data: rows, error } = await admin.rpc('downline_of', {
    root: user.id,
    max_depth: maxDepth,
  })
  if (error) {
    console.error('[my-reach] downline_of error:', error)
    return NextResponse.json({ error: 'Could not load your reach.' }, { status: 500 })
  }

  const downline = (rows ?? []) as { user_id: string; depth: number }[]
  const depthById = new Map(downline.map(d => [d.user_id, d.depth]))
  const ids = downline.map(d => d.user_id)

  // Direct and total are always reported, whatever slice is being displayed,
  // so the toggle can show what each option would contain before it is picked.
  const { data: allRows } = await admin.rpc('downline_of', { root: user.id, max_depth: null })
  const all = (allRows ?? []) as { user_id: string; depth: number }[]

  if (ids.length === 0) {
    return NextResponse.json({
      people: [],
      points: [],
      counts: { direct: all.filter(d => d.depth === 1).length, total: all.length },
    })
  }

  const [{ data: profiles }, { data: regs }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', ids),
    // Where these people have actually been — their registrations are the
    // physical footprint of the network.
    admin.from('registrations')
      .select('band_id, user_id, user_name, city, state, country, latitude, longitude, registered_at')
      .in('user_id', ids)
      .not('latitude', 'is', null),
  ])

  const people = (profiles ?? []).map(p => ({
    id: p.id,
    name: p.full_name || (p.email ? String(p.email).split('@')[0] : 'Someone'),
    depth: depthById.get(p.id as string) ?? null,
  })).sort((a, b) => (a.depth ?? 99) - (b.depth ?? 99) || a.name.localeCompare(b.name))

  const points = (regs ?? []).map(r => ({
    lat: r.latitude,
    lng: r.longitude,
    band_id: r.band_id,
    user_name: r.user_name,
    city: r.city,
    country: r.country,
    depth: depthById.get(r.user_id as string) ?? null,
  }))

  return NextResponse.json({
    people,
    points,
    counts: { direct: all.filter(d => d.depth === 1).length, total: all.length },
  })
}
