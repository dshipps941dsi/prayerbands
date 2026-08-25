'use client'

import { useEffect, useMemo, useState } from 'react'

// An animated radial "web" of a person's reach: you at the centre, the people a
// band reached branching outward, generation by generation. Branch lines grow
// in, staggered by depth, so the network spreads like a web being spun.

const GOLD = 'var(--pb-primary, #C8A96E)'
const NAVY = 'var(--pb-text, #15223B)'
const GRAY = 'var(--pb-text-muted, #5C6573)'
const serif = 'Playfair Display, Georgia, serif'

type ApiNode = { id: string; name: string; parent: string; depth: number }
type Data = { root: { id: string; name: string } | null; nodes: ApiNode[]; total: number; direct: number; generations: number }

const first = (n: string) => (n || '').trim().split(/\s+/)[0] || n

export default function ReachWeb() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [grown, setGrown] = useState(false)

  useEffect(() => {
    fetch('/api/my-reach-tree').then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Trigger the grow-in once data is laid out.
  useEffect(() => {
    if (!data) return
    const raf = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(raf)
  }, [data])

  const layout = useMemo(() => {
    if (!data?.root) return null
    const rootId = data.root.id
    const nodeById: Record<string, { id: string; name: string; depth: number }> = {
      [rootId]: { id: rootId, name: data.root.name, depth: 0 },
    }
    const childrenBy: Record<string, string[]> = {}
    data.nodes.forEach(n => {
      nodeById[n.id] = { id: n.id, name: n.name, depth: n.depth }
      ;(childrenBy[n.parent] ??= []).push(n.id)
    })
    const maxDepth = data.nodes.reduce((m, n) => Math.max(m, n.depth), 0)

    // Radial tidy layout: leaves get evenly spaced angular slots, parents sit at
    // the mean of their children.
    const angle: Record<string, number> = {}
    let leaf = 0
    const assign = (id: string) => {
      const kids = childrenBy[id] ?? []
      if (kids.length === 0) { angle[id] = leaf; leaf += 1; return }
      kids.forEach(assign)
      angle[id] = (angle[kids[0]] + angle[kids[kids.length - 1]]) / 2
    }
    assign(rootId)
    const leaves = Math.max(1, leaf)

    const SIZE = 340, margin = 40
    const cx = SIZE / 2, cy = SIZE / 2
    const ring = maxDepth ? (SIZE / 2 - margin) / maxDepth : 0
    const xy = (id: string) => {
      const d = nodeById[id].depth
      const a = (angle[id] / leaves) * 2 * Math.PI - Math.PI / 2
      const r = d * ring
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    }

    const points = Object.keys(nodeById).map(id => ({ ...nodeById[id], ...xy(id) }))
    const edges = data.nodes.map(n => {
      const a = xy(n.parent), b = xy(n.id)
      return { id: n.id, depth: n.depth, x1: a.x, y1: a.y, x2: b.x, y2: b.y, len: Math.hypot(b.x - a.x, b.y - a.y) }
    })
    return { SIZE, cx, cy, ring, maxDepth, points, edges }
  }, [data])

  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: GRAY, fontSize: 14 }}>Loading your reach…</div>

  if (!data?.root || (data.total === 0)) {
    return (
      <div style={{ padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🕸️</div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Your reach begins with one</div>
        <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Give a band away, and when they make it their own, they&rsquo;ll appear here — and everyone they reach after that.
        </div>
      </div>
    )
  }

  const L = layout!

  return (
    <div style={{ padding: '8px 12px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: NAVY }}>
          {data.total} {data.total === 1 ? 'person' : 'people'} reached
        </div>
        <div style={{ fontSize: 12.5, color: GRAY, marginTop: 2 }}>
          {data.direct} directly{data.generations > 1 ? ` · ${data.generations} generations deep` : ''}
        </div>
      </div>

      <svg viewBox={`0 0 ${L.SIZE} ${L.SIZE}`} width="100%" style={{ display: 'block', maxWidth: 460, margin: '0 auto', overflow: 'visible' }}>
        {/* Faint web rings, one per generation */}
        {Array.from({ length: L.maxDepth }, (_, i) => i + 1).map(d => (
          <circle key={`ring-${d}`} cx={L.cx} cy={L.cy} r={d * L.ring} fill="none" stroke={GOLD}
            style={{ opacity: grown ? 0.14 : 0, transition: `opacity 0.6s ease ${d * 0.35}s` }} strokeWidth={0.6} />
        ))}

        {/* Branch lines, growing outward */}
        {L.edges.map(e => (
          <line key={`e-${e.id}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={GOLD} strokeWidth={1.4} strokeLinecap="round"
            style={{
              strokeDasharray: e.len,
              strokeDashoffset: grown ? 0 : e.len,
              opacity: grown ? 0.6 : 0,
              transition: `stroke-dashoffset 0.7s ease ${(e.depth - 1) * 0.45 + 0.3}s, opacity 0.3s ease ${(e.depth - 1) * 0.45 + 0.3}s`,
            }} />
        ))}

        {/* Nodes */}
        {L.points.map(p => {
          const isRoot = p.depth === 0
          const rad = isRoot ? 8 : Math.max(3.5, 6 - p.depth * 0.8)
          const delay = isRoot ? 0 : (p.depth - 1) * 0.45 + 0.75
          return (
            <g key={p.id} style={{ opacity: grown || isRoot ? 1 : 0, transform: grown || isRoot ? 'scale(1)' : 'scale(0.2)', transformOrigin: `${p.x}px ${p.y}px`, transition: `opacity 0.4s ease ${delay}s, transform 0.45s ease ${delay}s` }}>
              <circle cx={p.x} cy={p.y} r={rad} fill={isRoot ? GOLD : '#fff'} stroke={GOLD} strokeWidth={isRoot ? 0 : 1.6} />
              {(isRoot || p.depth <= 1) && (
                <text x={p.x} y={p.y + rad + 11} textAnchor="middle" fontSize={isRoot ? 11 : 9.5}
                  fontFamily="Georgia, serif" fontWeight={isRoot ? 700 : 400} fill={isRoot ? NAVY : GRAY}>
                  {isRoot ? 'You' : first(p.name)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {L.maxDepth > 1 && (
        <div style={{ textAlign: 'center', fontSize: 11.5, color: GRAY, marginTop: 6, fontStyle: 'italic' }}>
          Each ring is a generation the prayer travelled outward.
        </div>
      )}
    </div>
  )
}
