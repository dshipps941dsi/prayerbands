'use client'

import { useEffect, useRef, useState } from 'react'
import { escapeHtml } from '@/lib/escape-html'

// The reach, drawn across the world: you at your place, and everyone a band
// reached at theirs, with lines from giver to receiver appearing generation by
// generation so the network spreads outward over the map.

const NAVY = 'var(--pb-text, #15223B)'
const GRAY = 'var(--pb-text-muted, #5C6573)'
const serif = 'Playfair Display, Georgia, serif'

type Node = { id: string; name: string; parent: string; depth: number; lat: number | null; lng: number | null; city: string | null; country: string | null }
type Root = { id: string; name: string; lat: number | null; lng: number | null; city: string | null; country: string | null }
type Data = { root: Root | null; nodes: Node[]; total: number; direct: number; generations: number; located: number }

const first = (n: string) => (n || '').trim().split(/\s+/)[0] || n

export default function ReachMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const timer = useRef<any>(null)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my-reach-tree').then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!data?.root || !mapRef.current || typeof window === 'undefined') return

    const gold = (getComputedStyle(document.documentElement).getPropertyValue('--pb-primary') || '').trim() || '#C8A96E'
    const posById = new Map<string, { lat: number; lng: number; name: string; city: string | null; country: string | null }>()
    if (data.root.lat != null && data.root.lng != null) posById.set(data.root.id, { lat: data.root.lat, lng: data.root.lng, name: data.root.name, city: data.root.city, country: data.root.country })
    data.nodes.forEach(n => { if (n.lat != null && n.lng != null) posById.set(n.id, { lat: n.lat, lng: n.lng, name: n.name, city: n.city, country: n.country }) })

    // Fan out people who share a spot (a town where several registered) so they
    // read as distinct dots instead of one, while true geography stays put.
    const cell = (lat: number, lng: number) => `${lat.toFixed(1)}|${lng.toFixed(1)}`
    const groups: Record<string, string[]> = {}
    posById.forEach((p, id) => { (groups[cell(p.lat, p.lng)] ??= []).push(id) })
    Object.values(groups).forEach(ids => {
      if (ids.length <= 1) return
      ids.forEach((id, i) => {
        if (i === 0) return // one stays at the true centre
        const ang = (i / ids.length) * 2 * Math.PI
        const r = 0.12 + 0.05 * Math.floor(i / 8)
        const p = posById.get(id)!
        p.lat += r * Math.sin(ang)
        p.lng += r * Math.cos(ang)
      })
    })

    const render = () => {
      const L = (window as any).L
      if (!L || !mapRef.current) return
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false })
      mapInstance.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)

      const allPts = Array.from(posById.values()).map(p => [p.lat, p.lng])
      if (allPts.length === 1) map.setView(allPts[0], 5)
      else if (allPts.length > 1) map.fitBounds(allPts, { padding: [36, 36] })
      else { map.setView([20, 0], 2); return }

      const marker = (id: string, isRoot: boolean) => {
        const p = posById.get(id)!
        const sz = isRoot ? 15 : 11
        const dot = L.divIcon({ className: '', html: `<div style="width:${sz}px;height:${sz}px;background:${isRoot ? gold : '#fff'};border-radius:50%;border:${isRoot ? 0 : 2}px solid ${gold};box-shadow:0 0 6px rgba(0,0,0,0.35)"></div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        const place = [p.city, p.country].filter(Boolean).join(', ')
        m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px"><strong>${isRoot ? 'You' : escapeHtml(first(p.name))}</strong>${place ? `<br/><span style="color:#5C6573">${escapeHtml(place)}</span>` : ''}</div>`)
        return m
      }

      // Root first.
      if (posById.has(data.root!.id)) marker(data.root!.id, true)

      // Edges where both ends have a location, oldest generation first, added one
      // at a time so the web spreads outward.
      const edges = data.nodes
        .filter(n => posById.has(n.id) && posById.has(n.parent))
        .sort((a, b) => a.depth - b.depth)
      let i = 0
      const step = () => {
        if (i >= edges.length) { if (timer.current) { clearInterval(timer.current); timer.current = null } return }
        const e = edges[i++]
        const a = posById.get(e.parent)!, b = posById.get(e.id)!
        L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: gold, weight: 1.6, opacity: 0.55 }).addTo(map)
        marker(e.id, false)
      }
      step()
      timer.current = setInterval(step, 170)
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
  }, [data])

  if (loading) return <div style={{ padding: '30px 0', textAlign: 'center', color: GRAY, fontSize: 14 }}>Loading your reach…</div>

  if (!data?.root || data.total === 0) {
    return (
      <div style={{ padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌍</div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Your reach begins with one</div>
        <div style={{ fontSize: 14, color: GRAY, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Give a band away, and when they make it their own, they&rsquo;ll appear on the map — and everyone they reach after.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: NAVY }}>
          {data.total} {data.total === 1 ? 'person' : 'people'} reached
        </div>
        <div style={{ fontSize: 12.5, color: GRAY, marginTop: 2 }}>
          {data.direct} directly{data.generations > 1 ? ` · ${data.generations} generations` : ''}
        </div>
      </div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(44,24,16,0.12)', boxShadow: '0 1px 6px rgba(44,24,16,0.06)' }}>
        <div ref={mapRef} style={{ height: 340, width: '100%' }} />
      </div>
      {data.located < data.total && (
        <div style={{ textAlign: 'center', fontSize: 11.5, color: GRAY, marginTop: 8, fontStyle: 'italic' }}>
          {data.total - data.located} not yet placed on the map (no location shared).
        </div>
      )}
    </div>
  )
}
