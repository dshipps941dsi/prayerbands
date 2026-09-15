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

type Node = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; state: string | null; country: string | null; depth: number }
type Edge = { from: string; to: string; kind: 'chain' | 'gift'; depth: number }
type Data = { root: { id: string; name: string } | null; nodes: Node[]; edges: Edge[]; total: number; located: number; generations: number; bands?: number; scope?: 'me' | 'band' }

// scope 'me' = the viewer's whole ripple across every band they hold (the
// default for a signed-in holder); 'band' = this one band's ripple only.
export default function ReachMap({ bandId, scope = 'band' }: { bandId: string; scope?: 'me' | 'band' }) {
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

  // Switching band ↔ me quickly fires two loads; only the latest may paint.
  const loadSeq = useRef(0)
  useEffect(() => {
    setLoading(true)
    const seq = ++loadSeq.current
    const qs = scope === 'me' ? 'scope=me' : `bandId=${encodeURIComponent(bandId)}`
    fetch(`/api/band-reach?${qs}`).then(r => r.json()).then(d => { if (seq === loadSeq.current) setData(d) }).catch(() => {}).finally(() => { if (seq === loadSeq.current) setLoading(false) })
  }, [bandId, scope])

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
    const pos = new Map<string, { lat: number; lng: number; name: string; city: string | null; state: string | null; country: string | null; depth: number }>()
    data.nodes.forEach(n => { if (n.lat != null && n.lng != null) pos.set(n.id, { lat: n.lat, lng: n.lng, name: n.name, city: n.city, state: n.state, country: n.country, depth: n.depth }) })

    // People who share a spot become ONE pin with a count, never a fan of
    // pins. The old fan-out pushed pins ~13 km in every direction to keep
    // them apart, which on a coast put half a town in the sea. Pins now sit
    // exactly where the place is; the names are in the popup.
    const cellOf = (lat: number, lng: number) => `${lat.toFixed(2)}|${lng.toFixed(2)}`

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
    // Both walks are bounded: a self-edge or a cycle in the data (the server
    // now filters these, but the page must never hang on what it is handed)
    // would otherwise loop forever and freeze the whole band page.
    const climb = (id: string, stopDepth: number): string => {
      let cur = id
      const seen = new Set<string>()
      while (parentOf.has(cur) && (depthOf.get(cur) ?? 0) > stopDepth && !seen.has(cur)) {
        seen.add(cur)
        const next = parentOf.get(cur)!
        if (next === cur) break
        cur = next
      }
      return cur
    }
    const branchRoot = (id: string): string => climb(id, 1)
    // Walk up to the depth-0 top-level giver — used to filter the map by which
    // top-level branches the viewer has selected.
    const rootOf = (id: string): string => climb(id, 0)
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

      // One marker per place. Members are revealed one at a time by the
      // animation, so the place's marker is redrawn each time someone new
      // joins it — the count ticks up where the pin already is.
      const revealed = new Set<string>()
      const markerByCell = new Map<string, any>()
      const drawCell = (key: string) => {
        const ids = Array.from(revealed).filter(id => { const p = pos.get(id); return p && cellOf(p.lat, p.lng) === key })
        if (!ids.length) return
        const old = markerByCell.get(key); if (old) map.removeLayer(old)
        const first = pos.get(ids[0])!
        const hasRoot = ids.includes(rootId || '')
        const hasChain = ids.some(id => pos.get(id)!.depth === 0)
        const n = ids.length
        // Depth-0 (the chain's own holders) stay gold; a place that is only
        // branch recipients takes the colour of the first branch there so
        // the dot ties back to its line.
        const branchC = hasChain ? gold : colorForBranch(ids[0])
        const fill = hasRoot || hasChain ? gold : '#fff'
        const sz = n === 1 ? (hasRoot ? 15 : hasChain ? 12 : 10) : Math.min(34, 18 + Math.round(Math.log2(n) * 4))
        const label = n > 1 ? `<span style="font:700 ${n > 99 ? 10 : 11}px Inter,system-ui,sans-serif;color:${fill === gold ? '#0f0d09' : branchC};line-height:${sz}px">${n}</span>` : ''
        const dot = L.divIcon({ className: '', html: `<div style="width:${sz}px;height:${sz}px;background:${fill};border-radius:50%;border:${hasRoot && n === 1 ? 0 : 2}px solid ${branchC};box-shadow:0 0 6px rgba(0,0,0,0.35);text-align:center">${label}</div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] })
        const m = L.marker([first.lat, first.lng], { icon: dot }).addTo(map)
        markerByCell.set(key, m)
        const place = [first.city, first.state, first.country].filter(Boolean).join(', ')
        // "You" first, then the chain's holders, then branch recipients.
        const names = ids
          .sort((a, b) => (a === rootId ? -1 : b === rootId ? 1 : 0) || pos.get(a)!.depth - pos.get(b)!.depth || pos.get(a)!.name.localeCompare(pos.get(b)!.name))
          .map(id => id === rootId ? '<strong>You</strong>' : escapeHtml(pos.get(id)!.name))
        const shown = names.slice(0, 12)
        const more = names.length - shown.length
        m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px;max-width:220px">${place ? `<div style="color:#5C6573;margin-bottom:${n > 1 ? 4 : 0}px">${escapeHtml(place)}${n > 1 ? ` · ${n} people` : ''}</div>` : ''}<div style="line-height:1.5">${shown.join('<br/>')}${more > 0 ? `<br/><span style="color:#5C6573">and ${more} more</span>` : ''}</div></div>`)
      }
      const drawMarker = (id: string) => {
        const p = pos.get(id); if (!p) return
        if (p.depth > 0 && !isSel(rootOf(id))) return // hide unselected branches
        revealed.add(id)
        drawCell(cellOf(p.lat, p.lng))
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
          {scope === 'me'
            ? 'When you give a band away, or someone you gave one to passes theirs on, it branches out here — every band, everywhere it lands.'
            : 'When someone who has held this band gives another away, it branches out here — every band, everywhere it lands.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: NAVY }}>
          {data.total} {data.total === 1 ? 'band' : 'bands'} rippled out from {scope === 'me' ? 'you' : 'this one'}
        </div>
        <div style={{ fontSize: 12.5, color: GRAY, marginTop: 2 }}>
          {scope === 'me' && (data.bands ?? 0) > 1 ? `across your ${data.bands} bands · ` : ''}
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
        const place = (n?: Node) => [n?.city, n?.state, n?.country].filter(Boolean).join(', ')
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
