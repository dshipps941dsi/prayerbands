'use client'

import { useEffect, useRef, useState } from 'react'
import { escapeHtml } from '@/lib/escape-html'

// The ripple of one band drawn across the world: its own journey (the chain),
// and off each holder the bands they gave, and those recipients' bands, spreading
// outward generation by generation as the lines appear.

const GOLD = 'var(--pb-primary, #C8A96E)'
const NAVY = 'var(--pb-text, #15223B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #5C6573)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const serif = 'Playfair Display, Georgia, serif'

type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; country: string | null; depth: number }
type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }
type Data = { root: { id: string; name: string } | null; nodes: Node[]; edges: Edge[]; total: number; located: number; generations: number }

export default function ReachMap({ bandId }: { bandId: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const timer = useRef<any>(null)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  // Which top-level branches (depth-0 givers) show on the map — null = all.
  const [selected, setSelected] = useState<Set<string> | null>(null)
  // Which people in the lineage list are expanded (collapsed by default so a
  // long downline stays tidy).
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    fetch(`/api/band-reach?bandId=${encodeURIComponent(bandId)}`).then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [bandId])

  // Top-level branches = depth-0 people who gave at least one band.
  const topRoots = data
    ? data.nodes.filter(n => n.depth === 0 && data.edges.some(e => e.kind === 'gift' && e.from === n.id)).map(n => n.id)
    : []
  // Default every branch to selected once the data arrives.
  useEffect(() => { setSelected(topRoots.length ? new Set(topRoots) : null); setExpanded(new Set()) /* eslint-disable-next-line */ }, [data])
  const isSel = (id: string) => !selected || selected.has(id)
  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleRoot = (id: string) => setSelected(prev => { const base = new Set(prev ?? topRoots); base.has(id) ? base.delete(id) : base.add(id); return base })
  const allSelected = topRoots.length > 0 && topRoots.every(id => isSel(id))
  const toggleAll = () => setSelected(allSelected ? new Set<string>() : new Set(topRoots))

  useEffect(() => {
    if (!data || !mapRef.current || typeof window === 'undefined') return

    const gold = (getComputedStyle(document.documentElement).getPropertyValue('--pb-primary') || '').trim() || '#C8A96E'
    const rootId = data.root?.id
    const pos = new Map<string, { lat: number; lng: number; name: string; city: string | null; country: string | null; depth: number }>()
    data.nodes.forEach(n => { if (n.lat != null && n.lng != null) pos.set(n.id, { lat: n.lat, lng: n.lng, name: n.name, city: n.city, country: n.country, depth: n.depth }) })

    // Fan out people who share a spot so a town of bands is legible.
    const cell = (lat: number, lng: number) => `${lat.toFixed(1)}|${lng.toFixed(1)}`
    const groups: Record<string, string[]> = {}
    pos.forEach((p, id) => { (groups[cell(p.lat, p.lng)] ??= []).push(id) })
    Object.values(groups).forEach(ids => {
      if (ids.length <= 1) return
      ids.forEach((id, i) => {
        if (i === 0) return
        const ang = (i / ids.length) * 2 * Math.PI
        const r = 0.12 + 0.05 * Math.floor(i / 8)
        const p = pos.get(id)!; p.lat += r * Math.sin(ang); p.lng += r * Math.cos(ang)
      })
    })

    // Colour each branch its own hue so the lines read as separate connections
    // instead of one gold web. A "branch" is a direct recipient (depth 1) and
    // everyone under them — so each person you gave to gets a colour, and their
    // sub-downline matches it. The band's own journey (the chain) stays gold.
    // Hues of gold/bronze rather than a rainbow, so branches stay on-theme.
    // The brand gold itself is reserved for the chain, so it's left out here.
    const BRANCH_COLORS = ['#8A6A28', '#D9BE86', '#B8860B', '#6E5220', '#E0C88A', '#A67C3D', '#C99A3B', '#5C4318']
    const parentOf = new Map<string, string>()
    data.edges.filter(e => e.kind === 'gift').forEach(e => parentOf.set(e.to, e.from))
    const depthOf = new Map(data.nodes.map(n => [n.id, n.depth]))
    // Walk up to the depth-1 ancestor (the direct recipient that starts the branch).
    const branchRoot = (id: string): string => {
      let cur = id
      while (parentOf.has(cur) && (depthOf.get(cur) ?? 0) > 1) cur = parentOf.get(cur)!
      return cur
    }
    // Walk up to the depth-0 top-level giver — used to filter the map by which
    // top-level branches the viewer has selected.
    const rootOf = (id: string): string => {
      let cur = id
      while (parentOf.has(cur) && (depthOf.get(cur) ?? 0) > 0) cur = parentOf.get(cur)!
      return cur
    }
    const branchColorByRoot = new Map<string, string>()
    const colorForBranch = (id: string): string => {
      const root = branchRoot(id)
      if (!branchColorByRoot.has(root)) branchColorByRoot.set(root, BRANCH_COLORS[branchColorByRoot.size % BRANCH_COLORS.length])
      return branchColorByRoot.get(root)!
    }
    // Lock in colours up front (in gift order) so they're stable, not dependent
    // on the reveal animation's timing.
    data.edges.filter(e => e.kind === 'gift').sort((a, b) => a.depth - b.depth).forEach(e => colorForBranch(e.to))

    const render = () => {
      const L = (window as any).L
      if (!L || !mapRef.current) return
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false })
      mapInstance.current = map
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' }).addTo(map)

      const pts = Array.from(pos.values()).map(p => [p.lat, p.lng])
      if (pts.length === 1) map.setView(pts[0], 5)
      else if (pts.length > 1) map.fitBounds(pts, { padding: [36, 36] })
      else { map.setView([20, 0], 2); return }

      const drawMarker = (id: string) => {
        const p = pos.get(id); if (!p) return
        if (p.depth > 0 && !isSel(rootOf(id))) return // hide unselected branches
        const isRoot = id === rootId
        const sz = isRoot ? 15 : p.depth === 0 ? 12 : 10
        // Depth-0 (this band's own holders) stay gold; branch recipients take
        // their branch colour so a dot ties back to its line.
        const branchC = p.depth > 0 ? colorForBranch(id) : gold
        const fill = isRoot || p.depth === 0 ? gold : '#fff'
        const dot = L.divIcon({ className: '', html: `<div style="width:${sz}px;height:${sz}px;background:${fill};border-radius:50%;border:${isRoot ? 0 : 2}px solid ${branchC};box-shadow:0 0 6px rgba(0,0,0,0.35)"></div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        const place = [p.city, p.country].filter(Boolean).join(', ')
        m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px"><strong>${isRoot ? 'You' : escapeHtml(p.name)}</strong>${place ? `<br/><span style="color:#5C6573">${escapeHtml(place)}</span>` : ''}</div>`)
      }
      const drawEdge = (e: Edge) => {
        const a = pos.get(e.from), b = pos.get(e.to)
        if (!a || !b) return
        if (e.kind === 'gift' && !isSel(rootOf(e.to))) return // hide unselected branches
        L.polyline([[a.lat, a.lng], [b.lat, b.lng]], e.kind === 'chain'
          ? { color: gold, weight: 2, opacity: 0.7, dashArray: '4 6' }
          : { color: colorForBranch(e.to), weight: 2, opacity: 0.75 }).addTo(map)
      }

      // The band's own chain and its stops appear at once; the branching gifts
      // then grow outward, generation by generation.
      const chain = data.edges.filter(e => e.kind === 'chain')
      const gifts = data.edges.filter(e => e.kind === 'gift').sort((x, y) => x.depth - y.depth)
      data.nodes.filter(n => n.depth === 0).forEach(n => drawMarker(n.id))
      chain.forEach(drawEdge)

      let i = 0
      const step = () => {
        if (i >= gifts.length) { if (timer.current) { clearInterval(timer.current); timer.current = null } return }
        const e = gifts[i++]
        drawEdge(e)
        drawMarker(e.to)
      }
      if (gifts.length) { step(); timer.current = setInterval(step, 150) }
    }

    if ((window as any).L) render()
    else {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
      }
      let script = document.getElementById('leaflet-js') as HTMLScriptElement | null
      if (!script) { script = document.createElement('script'); script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; document.head.appendChild(script) }
      script.addEventListener('load', render, { once: true })
    }

    return () => {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selected])

  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: GRAY, fontSize: 14 }}>Loading the reach…</div>

  if (!data || data.total === 0) {
    return (
      <div style={{ padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8 }}>The ripple starts here</div>
        <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, maxWidth: 330, margin: '0 auto' }}>
          When someone who has held this band gives another away, it branches out here — every band, everywhere it lands.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: NAVY }}>
          {data.total} {data.total === 1 ? 'band' : 'bands'} rippled out from this one
        </div>
        <div style={{ fontSize: 12.5, color: GRAY, marginTop: 2 }}>
          {data.generations > 0 ? `${data.generations} generation${data.generations === 1 ? '' : 's'} · ` : ''}{data.located} on the map
        </div>
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(44,24,16,0.12)', boxShadow: '0 1px 6px rgba(44,24,16,0.06)' }}>
        <div ref={mapRef} style={{ height: 340, width: '100%' }} />
      </div>

      {/* Lineage: each top giver as a header, then a connected downline of who
          they gave to, and who those people gave to, generation by generation. */}
      {(() => {
        const nodeById = new Map(data.nodes.map(n => [n.id, n]))
        const rootId = data.root?.id
        const place = (n?: Node) => [n?.city, n?.country].filter(Boolean).join(', ')
        const childrenMap = new Map<string, string[]>()
        data.edges.filter(e => e.kind === 'gift').forEach(e => { (childrenMap.get(e.from) ?? childrenMap.set(e.from, []).get(e.from)!).push(e.to) })

        const visited = new Set<string>()
        const renderNode = (id: string, isRoot: boolean): React.ReactNode => {
          if (visited.has(id)) return null
          visited.add(id)
          const n = nodeById.get(id); if (!n) return null
          const kids = (childrenMap.get(id) || []).filter(k => !visited.has(k))
          const label = id === rootId ? 'You' : n.name
          const gaveCount = (childrenMap.get(id) || []).length
          const hasKids = kids.length > 0
          const open = expanded.has(id)
          const dimmed = isRoot && !isSel(id) // deselected branch: shown but muted
          return (
            <div key={id} style={{ opacity: dimmed ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isRoot ? '9px 0 3px' : '4px 0' }}>
                {isRoot && (
                  <input type="checkbox" checked={isSel(id)} onChange={() => toggleRoot(id)} title="Show this branch on the map" style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }} />
                )}
                {hasKids ? (
                  <button onClick={() => toggleExpand(id)} aria-label={open ? 'Collapse' : 'Expand'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 16, height: 16, flexShrink: 0, color: GRAY, fontSize: 12, lineHeight: 1 }}>{open ? '▾' : '▸'}</button>
                ) : (
                  <span style={{ width: isRoot ? 11 : 8, height: isRoot ? 11 : 8, borderRadius: '50%', background: isRoot ? GOLD : '#fff', border: `2px solid ${GOLD}`, flexShrink: 0, marginLeft: isRoot ? 0 : 4 }} />
                )}
                <button onClick={hasKids ? () => toggleExpand(id) : undefined} style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, cursor: hasKids ? 'pointer' : 'default', minWidth: 0, lineHeight: 1.4, flex: 1 }}>
                  <span style={{ fontFamily: serif, fontWeight: 700, fontSize: isRoot ? 15 : 13.5, color: NAVY }}>{label}</span>
                  {place(n) && <span style={{ fontSize: 12.5, color: GRAY }}> · {place(n)}</span>}
                  {gaveCount > 0 && <span style={{ fontSize: 12, color: GRAY }}> — gave {gaveCount}</span>}
                </button>
              </div>
              {hasKids && open && (
                <div style={{ marginLeft: isRoot ? 8 : 3, borderLeft: '2px solid rgba(200,169,110,0.45)', paddingLeft: 16 }}>
                  {kids.map(k => renderNode(k, false))}
                </div>
              )}
            </div>
          )
        }

        const roots = data.nodes
          .filter(n => n.depth === 0 && childrenMap.has(n.id))
          .sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : 0))
        if (!roots.length) return null
        const selCount = roots.filter(r => isSel(r.id)).length
        return (
          <div style={{ marginTop: 18 }}>
            {/* Select which branches show on the map, and collapse to keep it tidy. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}`, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: NAVY, fontWeight: 600 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 16, height: 16, accentColor: GOLD, cursor: 'pointer' }} />
                {allSelected ? 'All branches' : `${selCount} of ${roots.length} branches`} on the map
              </label>
              <button onClick={() => setExpanded(prev => prev.size ? new Set<string>() : new Set(roots.map(r => r.id)))} style={{ background: 'none', border: 'none', color: GRAY, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                {expanded.size ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
            {roots.map((g, i) => (
              <div key={g.id} style={{ paddingTop: i > 0 ? 10 : 8, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                {renderNode(g.id, true)}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
