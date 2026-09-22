import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// A shareable picture of the viewer's ripple that gives nothing away: dots by
// city on a plain grid, lines between generations, a few counts, and at most
// the viewer's own first name. No other names, no exact coordinates, no band
// IDs. Drawn fresh each time, so it grows with the ripple.
//
// Rendered with next/og (satori), which draws text from font files we ship,
// so it does not depend on fonts being installed on the server.
//
// GET /api/ripple-card?name=1   → image/png, 1080×1350

export const dynamic = 'force-dynamic'

type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; state: string | null; country: string | null; depth: number }
type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }

const GOLD = '#C8A96E', CREAM = '#F5EDD8'

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null
async function fonts() {
  if (fontCache) return fontCache
  const dir = path.join(process.cwd(), 'public', 'fonts')
  const [r, b] = await Promise.all([readFile(path.join(dir, 'CormorantGaramond-Regular.ttf')), readFile(path.join(dir, 'CormorantGaramond-Bold.ttf'))])
  fontCache = { regular: r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength) as ArrayBuffer, bold: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer }
  return fontCache
}

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

  // Positions rounded to a tenth of a degree (about seven miles) before
  // anything is drawn, so the picture cannot be read back into an address.
  const located = nodes.filter(n => n.lat != null && n.lng != null).map(n => ({ ...n, lat: Math.round(n.lat! * 10) / 10, lng: Math.round(n.lng! * 10) / 10 }))
  const W = 1080, H = 1350
  const box = { x: 90, y: 250, w: W - 180, h: 680 }
  let minLat = 0, maxLat = 0, minLng = 0, maxLng = 0
  if (located.length) {
    minLat = Math.min(...located.map(n => n.lat)); maxLat = Math.max(...located.map(n => n.lat))
    minLng = Math.min(...located.map(n => n.lng)); maxLng = Math.max(...located.map(n => n.lng))
  }
  const padLat = Math.max(0.6, (maxLat - minLat) * 0.18), padLng = Math.max(0.8, (maxLng - minLng) * 0.18)
  minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng
  const spanLat = maxLat - minLat || 1, spanLng = maxLng - minLng || 1
  const scale = Math.min(box.w / spanLng, box.h / (spanLat * 1.25))
  const drawW = spanLng * scale, drawH = spanLat * 1.25 * scale
  const ox = box.x + (box.w - drawW) / 2, oy = box.y + (box.h - drawH) / 2
  const pos = new Map<string, { x: number; y: number }>()
  for (const n of located) pos.set(n.id, { x: ox + (n.lng - minLng) * scale, y: oy + (maxLat - n.lat) * 1.25 * scale })

  const lines = data.edges.map(e => ({ a: pos.get(e.from), b: pos.get(e.to), kind: e.kind })).filter(l => l.a && l.b) as { a: { x: number; y: number }; b: { x: number; y: number }; kind: string }[]
  const dots = located.map(n => ({ p: pos.get(n.id)!, isRoot: n.id === data.root?.id, r: n.id === data.root?.id ? 13 : Math.max(5, 9 - n.depth) }))

  const headline = firstName ? `${firstName}’s ripple` : 'My prayer ripple'
  const stats = [
    { n: String(people), l: people === 1 ? 'PERSON' : 'PEOPLE' },
    { n: String(states), l: states === 1 ? 'STATE' : 'STATES' },
    { n: String(generations), l: generations === 1 ? 'GENERATION' : 'GENERATIONS' },
  ]
  const f = await fonts()

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, #0E1E38 0%, #0A1628 100%)', fontFamily: 'Cormorant', color: CREAM, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 96, display: 'flex', fontSize: 26, letterSpacing: 8, color: GOLD }}>PRAYER BANDS</div>
        <div style={{ position: 'absolute', top: 150, display: 'flex', fontSize: 58, fontWeight: 700 }}>{headline}</div>

        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1={box.x} y1={box.y + i * box.h / 6} x2={box.x + box.w} y2={box.y + i * box.h / 6} stroke={GOLD} strokeOpacity={0.08} />)}
          {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={box.x + i * box.w / 8} y1={box.y} x2={box.x + i * box.w / 8} y2={box.y + box.h} stroke={GOLD} strokeOpacity={0.08} />)}
          {lines.map((l, i) => <line key={`e${i}`} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke={GOLD} strokeOpacity={l.kind === 'chain' ? 0.55 : 0.32} strokeWidth={2} />)}
          {dots.map((d, i) => <circle key={`g${i}`} cx={d.p.x} cy={d.p.y} r={d.r + 6} fill={GOLD} fillOpacity={0.14} />)}
          {dots.map((d, i) => <circle key={`d${i}`} cx={d.p.x} cy={d.p.y} r={d.r} fill={d.isRoot ? CREAM : GOLD} />)}
        </svg>

        {startedIn && <div style={{ position: 'absolute', top: 962, display: 'flex', fontSize: 28, opacity: 0.85 }}>Started in {startedIn}</div>}
        <div style={{ position: 'absolute', top: 1010, left: 0, width: W, display: 'flex', justifyContent: 'center' }}>
          {stats.map(s => (
            <div key={s.l} style={{ width: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1 }}>{s.n}</div>
              <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: GOLD, marginTop: 10 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: 1222, display: 'flex', fontSize: 28, opacity: 0.85 }}>A band you tap. A prayer that travels.</div>
        <div style={{ position: 'absolute', top: 1268, display: 'flex', fontSize: 26, letterSpacing: 4, color: GOLD }}>prayerbands.com</div>
      </div>
    ),
    {
      width: W, height: H,
      fonts: [
        { name: 'Cormorant', data: f.regular, weight: 400, style: 'normal' },
        { name: 'Cormorant', data: f.bold, weight: 700, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline; filename="my-prayer-ripple.png"' },
    },
  )
}
