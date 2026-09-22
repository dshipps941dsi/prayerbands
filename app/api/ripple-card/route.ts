import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// A shareable picture of the viewer's ripple that gives nothing away: dots by
// city on a plain grid, lines between generations, a few counts, and at most
// the viewer's own first name. No other names, no exact coordinates, no band
// IDs. Drawn fresh each time, so it grows with the ripple.
//
// GET /api/ripple-card?name=1   → image/png, 1080×1350

export const dynamic = 'force-dynamic'

type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; state: string | null; country: string | null; depth: number }
type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to share your ripple.' }, { status: 401 })

  // Reuse the ripple the Journey tab draws, as the same person.
  const reachRes = await fetch(new URL('/api/band-reach?scope=me', req.url), { headers: { cookie: req.headers.get('cookie') || '' }, cache: 'no-store' })
  if (!reachRes.ok) return NextResponse.json({ error: 'Could not load your ripple.' }, { status: 500 })
  const data = await reachRes.json() as { root: { id: string; name: string } | null; nodes: Node[]; edges: Edge[]; generations: number }

  const withName = req.nextUrl.searchParams.get('name') === '1'
  let firstName = ''
  if (withName) {
    const admin = createServiceClient()
    const { data: prof } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    firstName = (prof?.full_name || '').trim().split(/\s+/)[0] || ''
  }

  const nodes = data.nodes
  const people = nodes.length
  const states = new Set(nodes.map(n => n.state).filter(Boolean)).size
  const generations = Math.max(0, data.generations || 0)
  const root = nodes.find(n => n.id === data.root?.id) || nodes[0]
  const startedIn = root?.city ? `${root.city}${root.state ? ', ' + root.state : ''}` : null

  // Positions: rounded to a tenth of a degree (about seven miles) before
  // anything is drawn, so the picture cannot be read back into an address.
  const located = nodes.filter(n => n.lat != null && n.lng != null).map(n => ({ ...n, lat: Math.round(n.lat! * 10) / 10, lng: Math.round(n.lng! * 10) / 10 }))
  const W = 1080, H = 1350
  const box = { x: 90, y: 250, w: W - 180, h: 700 }
  let minLat = 0, maxLat = 0, minLng = 0, maxLng = 0
  if (located.length) {
    minLat = Math.min(...located.map(n => n.lat)); maxLat = Math.max(...located.map(n => n.lat))
    minLng = Math.min(...located.map(n => n.lng)); maxLng = Math.max(...located.map(n => n.lng))
  }
  // Keep a little breathing room, and never let a single dot sit on the edge.
  const padLat = Math.max(0.6, (maxLat - minLat) * 0.18), padLng = Math.max(0.8, (maxLng - minLng) * 0.18)
  minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng
  // Fit to the box while keeping lat/lng proportion roughly honest.
  const spanLat = maxLat - minLat || 1, spanLng = maxLng - minLng || 1
  const scale = Math.min(box.w / spanLng, box.h / (spanLat * 1.25))
  const drawW = spanLng * scale, drawH = spanLat * 1.25 * scale
  const ox = box.x + (box.w - drawW) / 2, oy = box.y + (box.h - drawH) / 2
  const pos = new Map<string, { x: number; y: number }>()
  for (const n of located) pos.set(n.id, { x: ox + (n.lng - minLng) * scale, y: oy + (maxLat - n.lat) * 1.25 * scale })

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const edgesSvg = data.edges.map(e => {
    const a = pos.get(e.from), b = pos.get(e.to)
    if (!a || !b) return ''
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#C8A96E" stroke-opacity="${e.kind === 'chain' ? 0.55 : 0.32}" stroke-width="2"/>`
  }).join('')
  const dotsSvg = located.map(n => {
    const p = pos.get(n.id)!
    const isRoot = n.id === data.root?.id
    const r = isRoot ? 13 : Math.max(5, 9 - n.depth)
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r + 6}" fill="#C8A96E" fill-opacity="0.14"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${isRoot ? '#F5EDD8' : '#C8A96E'}"/>`
  }).join('')
  const gridSvg = Array.from({ length: 7 }, (_, i) => `<line x1="${box.x}" y1="${(box.y + i * box.h / 6).toFixed(0)}" x2="${box.x + box.w}" y2="${(box.y + i * box.h / 6).toFixed(0)}" stroke="#C8A96E" stroke-opacity="0.08"/>`).join('')
    + Array.from({ length: 9 }, (_, i) => `<line x1="${(box.x + i * box.w / 8).toFixed(0)}" y1="${box.y}" x2="${(box.x + i * box.w / 8).toFixed(0)}" y2="${box.y + box.h}" stroke="#C8A96E" stroke-opacity="0.08"/>`).join('')

  const headline = firstName ? `${esc(firstName)}’s ripple` : 'My prayer ripple'
  const stats = [
    { n: String(people), l: people === 1 ? 'person' : 'people' },
    { n: String(states), l: states === 1 ? 'state' : 'states' },
    { n: String(generations), l: generations === 1 ? 'generation' : 'generations' },
  ]
  const statsSvg = stats.map((s, i) => {
    const cx = W / 2 + (i - 1) * 300
    return `<text x="${cx}" y="1080" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="700" fill="#F5EDD8">${s.n}</text><text x="${cx}" y="1125" text-anchor="middle" font-family="Georgia, serif" font-size="24" letter-spacing="4" fill="#C8A96E">${s.l.toUpperCase()}</text>`
  }).join('')

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1E38"/><stop offset="1" stop-color="#0A1628"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="${W / 2}" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="8" fill="#C8A96E">✝  PRAYER BANDS</text>
    <text x="${W / 2}" y="195" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="700" fill="#F5EDD8">${headline}</text>
    ${gridSvg}${edgesSvg}${dotsSvg}
    ${startedIn ? `<text x="${W / 2}" y="1000" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#F5EDD8" fill-opacity="0.8">Started in ${esc(startedIn)}</text>` : ''}
    ${statsSvg}
    <text x="${W / 2}" y="1240" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#F5EDD8" fill-opacity="0.85">A band you tap. A prayer that travels.</text>
    <text x="${W / 2}" y="1290" text-anchor="middle" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="#C8A96E">prayerbands.com</text>
  </svg>`

  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline; filename="my-prayer-ripple.png"' },
  })
}
