'use client'
import { useEffect, useRef, useState } from 'react'

interface MapPoint {
  lat: number
  lng: number
  bandId: string
  name?: string
  city?: string
  country?: string
  prayer?: string
  date?: string
  isCurrent?: boolean
}

interface PrayerMapProps {
  points: MapPoint[]
  height?: number
  showToggle?: boolean
}

export default function PrayerMap({ points, height = 400, showToggle = true }: PrayerMapProps) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mode, setMode] = useState<'current' | 'all'>('current')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if ((window as any).L) { setMapReady(true); return }
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapReady(true)
      document.head.appendChild(script)
    }
    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const L = (window as any).L
    if (!L) return

    // Destroy existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Filter points based on mode
    const filteredPoints = mode === 'current'
      ? points.filter(p => p.isCurrent)
      : points

    const validPoints = filteredPoints.filter(p => p.lat && p.lng)
    if (validPoints.length === 0) return

    // Init map
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
    mapInstanceRef.current = map

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '&copy; Esri',
    }).addTo(map)

    // Custom red dot icon
    const redDot = L.divIcon({
      className: '',
      html: '<div style="width:12px;height:12px;background:#e8526a;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(232,82,106,0.6);"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    const currentDot = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:#1a6b4a;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px rgba(26,107,74,0.7);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })

    // Add markers
    const markers: any[] = []
    validPoints.forEach(p => {
      const icon = (mode === 'current' || p.isCurrent) ? currentDot : redDot
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(map)
      const popupContent = `
        <div style="font-family:Georgia,serif;min-width:160px">
          <div style="font-family:monospace;font-size:13px;font-weight:bold;color:#1a6b4a;margin-bottom:4px">${p.bandId}</div>
          ${p.name ? '<div style="font-size:13px;font-weight:600;margin-bottom:2px">' + p.name + '</div>' : ''}
          ${p.city || p.country ? '<div style="font-size:12px;color:#8a7c6a;margin-bottom:4px">' + [p.city, p.country].filter(Boolean).join(', ') + '</div>' : ''}
          ${p.prayer ? '<div style="font-size:12px;font-style:italic;color:#5a4f42;border-left:2px solid #e8526a;padding-left:6px;margin-top:4px">"' + p.prayer.slice(0, 80) + (p.prayer.length > 80 ? '...' : '') + '"</div>' : ''}
          ${p.date ? '<div style="font-size:11px;color:#b0a090;margin-top:4px">' + new Date(p.date).toLocaleDateString() + '</div>' : ''}
        </div>
      `
      marker.bindPopup(popupContent)
      markers.push(marker)
    })

    // Fit bounds
    if (markers.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lng], 5)
    } else if (markers.length > 1) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.2))
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mapReady, points, mode])

  const currentCount = points.filter(p => p.isCurrent && p.lat && p.lng).length
  const allCount = points.filter(p => p.lat && p.lng).length

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e1d6' }}>
      {showToggle && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f0ece6' }}>
          <div style={{ fontSize: 13, color: '#5a4f42', fontFamily: 'Georgia, serif' }}>
            {mode === 'current' ? currentCount + ' current locations' : allCount + ' total registrations'}
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f7f4ef', borderRadius: 6, padding: 3 }}>
            <button
              onClick={() => setMode('current')}
              style={{
                padding: '5px 12px', borderRadius: 4, border: 'none',
                background: mode === 'current' ? '#1a6b4a' : 'transparent',
                color: mode === 'current' ? '#fff' : '#8a7c6a',
                fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif',
                fontWeight: mode === 'current' ? 700 : 400,
              }}
            >
              Current
            </button>
            <button
              onClick={() => setMode('all')}
              style={{
                padding: '5px 12px', borderRadius: 4, border: 'none',
                background: mode === 'all' ? '#1a6b4a' : 'transparent',
                color: mode === 'all' ? '#fff' : '#8a7c6a',
                fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif',
                fontWeight: mode === 'all' ? 700 : 400,
              }}
            >
              All Journeys
            </button>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: '100%', background: '#f0ece6' }} />
    </div>
  )
}
