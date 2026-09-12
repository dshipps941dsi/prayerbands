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
  // scope=me: the viewer's whole ripple — every band they hold or have held,
  // rolled into one map — instead of one band at a time. Someone with three
  // bands shouldn't have to flip between three partial ripples and add them
  // up in their head; the ripple is about the person, not the band.
  const scopeMe = req.nextUrl.searchParams.get('scope') === 'me'
  if (!bandId && !scopeMe) return NextResponse.json({ error: 'bandId is required' }, { status: 400 })

  const admin = createServiceClient()

  type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; state: string | null; country: string | null; depth: number }
  type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }
  const nodes = new Map<string, Node>()
  const edges: Edge[] = []
  const keyOf = (r: any) => r.user_id ? `u:${r.user_id}` : `r:${r.id}`
  const addNode = (key: string, r: any, depth: number) => {
    if (!nodes.has(key)) nodes.set(key, { id: key, name: first(r.user_name), lat: r.latitude ?? null, lng: r.longitude ?? null, city: r.city ?? null, state: r.state ?? null, country: r.country ?? null, depth })
  }

  // 1. The chain(s) of stops we start from: one band's, or every band of mine.
  let seedBandIds: string[]
  if (scopeMe) {
    const [{ data: myRegs }, { data: myBands }] = await Promise.all([
      admin.from('registrations').select('band_id').eq('user_id', user.id).not('band_id', 'is', null),
      admin.from('bands').select('band_id').eq('owner_id', user.id),
    ])
    seedBandIds = Array.from(new Set([
      ...((myRegs ?? []) as any[]).map(r => r.band_id as string),
      ...((myBands ?? []) as any[]).map(b => b.band_id as string),
    ]))
  } else {
    seedBandIds = [bandId]
  }

  const { data: stops } = seedBandIds.length
    ? await admin
        .from('registrations')
        .select('id, band_id, user_id, user_name, latitude, longitude, city, state, country, registered_at')
        .in('band_id', seedBandIds)
        .order('registered_at', { ascending: true })
    : { data: [] as any[] }

  // Only someone who has actually held this band (or owns it) may see its reach —
  // otherwise anyone could enumerate band ids and map the whole network's giving
  // relationships and locations. The per-band journey stays public; the ripple
  // (which reaches beyond this band) does not. scope=me is by construction
  // the viewer's own bands.
  if (!scopeMe) {
    const isHolder = ((stops ?? []) as any[]).some(s => s.user_id === user.id)
    if (!isHolder) {
      const { data: band } = await admin.from('bands').select('owner_id').eq('band_id', bandId).maybeSingle()
      if (!band || band.owner_id !== user.id) {
        return NextResponse.json({ error: 'Not your band to view.' }, { status: 403 })
      }
    }
  }

  // Chain edges run within a band, in registration order; the viewer is the
  // same node across all of their bands, which is what joins the chains.
  const prevKeyByBand = new Map<string, string>()
  for (const s of (stops ?? []) as any[]) {
    const k = keyOf(s)
    addNode(k, s, 0)
    const prevKey = prevKeyByBand.get(s.band_id) ?? null
    if (prevKey && prevKey !== k) edges.push({ from: prevKey, to: k, kind: 'chain', depth: 0 })
    prevKeyByBand.set(s.band_id, k)
  }
  // With no registrations at all (owns bands, never tapped one), the viewer
  // is still the root of their own ripple.
  if (scopeMe && !nodes.has(`u:${user.id}`)) {
    const { data: me } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    addNode(`u:${user.id}`, { user_id: user.id, user_name: me?.full_name || 'You' }, 0)
  }

  // 2. Branch outward: the bands each account-holder gave, generation by generation.
  const MAX_NODES = 300, MAX_DEPTH = 6
  const expanded = new Set<string>()
  let frontier = Array.from(new Set([
    ...((stops ?? []) as any[]).filter(s => s.user_id).map(s => s.user_id as string),
    ...(scopeMe ? [user.id] : []),
  ]))
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
      .not('band_id', 'in', `(${seedBandIds.map(id => `"${id}"`).join(',')})`)
    if (!given?.length) break

    const bandIds = given.map((b: any) => b.band_id)
    const { data: regs } = await admin
      .from('registrations')
      .select('id, band_id, user_id, user_name, latitude, longitude, city, state, country, registered_at')
      .in('band_id', bandIds)
      .order('registered_at', { ascending: false })
    const latestByBand = new Map<string, any>()
    for (const r of (regs ?? []) as any[]) if (!latestByBand.has(r.band_id)) latestByBand.set(r.band_id, r)

    const next: string[] = []
    let addedThisRound = false
    for (const b of given as any[]) {
      const r = latestByBand.get(b.band_id)
      if (!r) continue // never registered — no recipient/place to show
      const giverKey = `u:${b.upline_user_id}`
      if (!nodes.has(giverKey)) continue // giver isn't in the tree (shouldn't happen)
      // A band registered on the giver's own signed-in phone (a kid's band set
      // up by a parent, say) has the giver as its "recipient". Keyed by account
      // that is an edge from a person to themself, and the map's ancestor walk
      // never terminates on it. Show it as a named leaf under the giver instead.
      const selfRegistered = !!r.user_id && r.user_id === b.upline_user_id
      const recipientKey = selfRegistered ? `r:${r.id}` : keyOf(r)
      if (recipientKey === giverKey) continue
      // One place in the tree per person: a second gift to someone already
      // shown would draw a cycle (A→B→A), which is the other way to hang.
      if (nodes.has(recipientKey)) continue
      addNode(recipientKey, r, depth)
      edges.push({ from: giverKey, to: recipientKey, kind: 'gift', depth })
      addedThisRound = true
      if (!selfRegistered && r.user_id && !expanded.has(r.user_id)) next.push(r.user_id)
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
  const meNode = nodes.get(`u:${user.id}`)

  return NextResponse.json({
    root: scopeMe
      ? (meNode ? { id: meNode.id, name: meNode.name } : null)
      : (rootReg ? { id: keyOf(rootReg), name: first(rootReg.user_name) } : null),
    scope: scopeMe ? 'me' : 'band',
    bands: seedBandIds.length,
    nodes: Array.from(nodes.values()),
    edges,
    total: reach,
    located,
    generations,
  })
}
