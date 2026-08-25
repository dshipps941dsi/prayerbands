import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// The ripple of one band: its own stops (the chain), and off each account-holder
// among them, the OTHER bands they gave — then those recipients' given bands,
// and so on. A band is "given" by whoever it's attributed to (bands.upline_user_id);
// each band's recipient + place come from its most recent registration. Guests
// (no account) can receive but can't give, so they're leaves.

const first = (n: string | null) => ((n || '').trim().split(/\s+/)[0] || 'Someone')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ nodes: [], edges: [], total: 0 }, { status: 401 })

  const bandId = (req.nextUrl.searchParams.get('bandId') || '').trim()
  if (!bandId) return NextResponse.json({ error: 'bandId is required' }, { status: 400 })

  const admin = createServiceClient()

  type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; country: string | null; depth: number }
  type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }
  const nodes = new Map<string, Node>()
  const edges: Edge[] = []
  const keyOf = (r: any) => r.user_id ? `u:${r.user_id}` : `r:${r.id}`
  const addNode = (key: string, r: any, depth: number) => {
    if (!nodes.has(key)) nodes.set(key, { id: key, name: first(r.user_name), lat: r.latitude ?? null, lng: r.longitude ?? null, city: r.city ?? null, country: r.country ?? null, depth })
  }

  // 1. This band's own chain of stops.
  const { data: stops } = await admin
    .from('registrations')
    .select('id, user_id, user_name, latitude, longitude, city, country, registered_at')
    .eq('band_id', bandId)
    .order('registered_at', { ascending: true })

  // Only someone who has actually held this band (or owns it) may see its reach —
  // otherwise anyone could enumerate band ids and map the whole network's giving
  // relationships and locations. The per-band journey stays public; the ripple
  // (which reaches beyond this band) does not.
  const isHolder = ((stops ?? []) as any[]).some(s => s.user_id === user.id)
  if (!isHolder) {
    const { data: band } = await admin.from('bands').select('owner_id').eq('band_id', bandId).maybeSingle()
    if (!band || band.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not your band to view.' }, { status: 403 })
    }
  }

  let prevKey: string | null = null
  for (const s of (stops ?? []) as any[]) {
    const k = keyOf(s)
    addNode(k, s, 0)
    if (prevKey && prevKey !== k) edges.push({ from: prevKey, to: k, kind: 'chain', depth: 0 })
    prevKey = k
  }

  // 2. Branch outward: the bands each account-holder gave, generation by generation.
  const MAX_NODES = 300, MAX_DEPTH = 6
  const expanded = new Set<string>()
  let frontier = Array.from(new Set(((stops ?? []) as any[]).filter(s => s.user_id).map(s => s.user_id as string)))
  let depth = 1
  let generations = 0

  while (frontier.length && nodes.size < MAX_NODES && depth <= MAX_DEPTH) {
    const givers = frontier.filter(g => !expanded.has(g))
    givers.forEach(g => expanded.add(g))
    if (!givers.length) break

    const { data: given } = await admin
      .from('bands')
      .select('band_id, upline_user_id')
      .in('upline_user_id', givers)
      .neq('band_id', bandId)
    if (!given?.length) break

    const bandIds = given.map((b: any) => b.band_id)
    const { data: regs } = await admin
      .from('registrations')
      .select('id, band_id, user_id, user_name, latitude, longitude, city, country, registered_at')
      .in('band_id', bandIds)
      .order('registered_at', { ascending: false })
    const latestByBand = new Map<string, any>()
    for (const r of (regs ?? []) as any[]) if (!latestByBand.has(r.band_id)) latestByBand.set(r.band_id, r)

    const next: string[] = []
    let addedThisRound = false
    for (const b of given as any[]) {
      const r = latestByBand.get(b.band_id)
      if (!r) continue // never registered — no recipient/place to show
      const recipientKey = keyOf(r)
      const giverKey = `u:${b.upline_user_id}`
      if (!nodes.has(giverKey)) continue // giver isn't in the tree (shouldn't happen)
      addNode(recipientKey, r, depth)
      edges.push({ from: giverKey, to: recipientKey, kind: 'gift', depth })
      addedThisRound = true
      if (r.user_id && !expanded.has(r.user_id)) next.push(r.user_id)
      if (nodes.size >= MAX_NODES) break
    }
    if (addedThisRound) generations = depth
    frontier = Array.from(new Set(next))
    depth++
  }

  const rootReg = ((stops ?? []) as any[]).at(-1) || null
  const located = Array.from(nodes.values()).filter(n => n.lat != null).length
  // Reach = the bands given beyond this one (the gift edges).
  const reach = edges.filter(e => e.kind === 'gift').length

  return NextResponse.json({
    root: rootReg ? { id: keyOf(rootReg), name: first(rootReg.user_name) } : null,
    nodes: Array.from(nodes.values()),
    edges,
    total: reach,
    located,
    generations,
  })
}
