'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const NAV = ['Overview', 'Bands', 'Prayer Wall', 'Lineage', 'Orders', 'Settings']

function OrgMap({ orgId, green }: { orgId: string, green: string }) {
  const [points, setPoints] = useState<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mode, setMode] = useState<'current' | 'all'>('current')
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!orgId) return
    fetch('/api/org-map-data?org_id=' + orgId)
      .then(r => r.json())
      .then(d => { setPoints(d.points || []); setMapLoaded(true) })
  }, [orgId])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || typeof window === 'undefined') return
    const loadMap = () => {
      if (!(window as any).L) {
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => renderMap()
        document.head.appendChild(script)
      } else {
        renderMap()
      }
    }
    const renderMap = () => {
      const L = (window as any).L
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
      const filtered = mode === 'current' ? points.filter(p => p.isCurrent) : points
      const valid = filtered.filter(p => p.lat && p.lng)
      if (!valid.length || !mapRef.current) return
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
      const markers: any[] = []
      valid.forEach(p => {
        const dot = L.divIcon({
          className: '',
          html: '<div style="width:12px;height:12px;background:' + (mode === 'current' ? green : '#e8526a') + ';border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [12, 12], iconAnchor: [6, 6],
        })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        m.bindPopup('<div style="font-family:Georgia,serif"><div style="font-family:monospace;font-weight:bold;color:' + green + '">' + p.bandId + '</div>' + (p.name ? '<div style="font-size:13px">' + p.name + '</div>' : '') + (p.city || p.country ? '<div style="font-size:12px;color:#8a7c6a">' + [p.city, p.country].filter(Boolean).join(', ') + '</div>' : '') + (p.prayer ? '<div style="font-size:12px;font-style:italic;border-left:2px solid ' + green + ';padding-left:6px;margin-top:4px">"' + p.prayer.slice(0, 80) + '"</div>' : '') + '</div>')
        markers.push(m)
      })
      if (markers.length === 1) { map.setView([valid[0].lat, valid[0].lng], 5) }
      else { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2)) }
    }
    loadMap()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [mapLoaded, points, mode, green])

  const currentCount = points.filter(p => p.isCurrent && p.lat && p.lng).length
  const allCount = points.filter(p => p.lat && p.lng).length

  if (!mapLoaded || !points.length) return null

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: 15 }}>Ministry Map</span>
        <div style={{ display: 'flex', gap: 4, background: '#f7f4ef', borderRadius: 6, padding: 3 }}>
          <button onClick={() => setMode('current')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: mode === 'current' ? green : 'transparent', color: mode === 'current' ? '#fff' : '#8a7c6a', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: mode === 'current' ? 700 : 400 }}>Current ({currentCount})</button>
          <button onClick={() => setMode('all')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: mode === 'all' ? green : 'transparent', color: mode === 'all' ? '#fff' : '#8a7c6a', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: mode === 'all' ? 700 : 400 }}>All Journeys ({allCount})</button>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 380, width: '100%' }} />
    </div>
  )
}

function Sidebar({ org, tab, green }: { org: any, tab: string, green: string }) {
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e8e1d6', padding: '28px 0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #e8e1d6' }}>
        <div style={{ fontSize: 15, fontWeight: 'bold', color: green, lineHeight: 1.3 }}>{org?.name}</div>
        <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{org?.location}</div>
        <div style={{ display: 'inline-block', marginTop: 8, background: '#e6f4ee', color: green, fontSize: 11, padding: '2px 8px', borderRadius: 12, fontFamily: 'monospace', letterSpacing: 0.5 }}>{org?.prefix}-XXXXX</div>
      </div>
      <div style={{ padding: '12px 0' }}>
        {NAV.map(item => (
          <div key={item} onClick={() => window.location.href = '/org/dashboard?tab=' + item} style={{ padding: '10px 24px', cursor: 'pointer', fontSize: 14, borderLeft: tab === item ? '3px solid ' + green : '3px solid transparent', color: tab === item ? green : '#5a4f42', background: tab === item ? '#f0f7f3' : 'transparent', fontWeight: tab === item ? 600 : 400 }}>{item}</div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ margin: 16, background: 'linear-gradient(135deg, ' + green + ', #2d9966)', color: '#fff', borderRadius: 8, padding: '12px 14px', fontSize: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{org?.plan || 'Ministry'} Plan</div>
        <div style={{ opacity: 0.8 }}>{org?.created_at ? 'Since ' + new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</div>
      </div>
    </div>
  )
}

function TopBar({ org, green }: { org: any, green: string }) {
  return (
    <div style={{ background: green, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 32px', height: 56, gap: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.18)', flexShrink: 0 }}>
      <span style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>✝ PrayerBands</span>
      <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 4, padding: '2px 10px', fontSize: 12, letterSpacing: 1, fontFamily: 'monospace' }}>{org?.subdomain}.prayerbands.com</span>
      <div style={{ flex: 1 }} />
      <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif' }}>Sign out</button>
    </div>
  )
}

function OrgDashboardInner() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'Overview'
  const [org, setOrg] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [bands, setBands] = useState<any[]>([])
  const [prayers, setPrayers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [lineage, setLineage] = useState<any[]>([])
  const [lineageLoading, setLineageLoading] = useState(false)
  const [expandedBand, setExpandedBand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderQty, setOrderQty] = useState(100)

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const urlParams = new URLSearchParams(window.location.search)
      const uidFromUrl = urlParams.get('uid')
      let userId = uidFromUrl
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/signin'; return }
        userId = user.id
      }
      const profileRes = await fetch('/api/org-profile?uid=' + userId)
      if (!profileRes.ok) { window.location.href = '/signin'; return }
      const { profile } = await profileRes.json()
      if (!profile?.org_id) { window.location.href = '/signin'; return }
      const orgData = profile.organizations
      setOrg(orgData)
      const { data: statsData } = await supabase.rpc('get_org_stats', { org_uuid: profile.org_id })
      setStats(statsData)
      const { data: bandsData } = await supabase.from('bands').select('band_id, status, created_at').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(50)
      setBands(bandsData || [])
      const { data: prayersData } = await supabase.from('registrations').select('band_id, user_name, prayer, city, country, registered_at').not('prayer', 'is', null).order('registered_at', { ascending: false }).limit(20)
      setPrayers(prayersData || [])
      const { data: ordersData } = await supabase.from('orders').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false })
      setOrders(ordersData || [])
      setLoading(false)
      if (tab === 'Lineage') {
        setLineageLoading(true)
        const { data: lineageData } = await supabase.rpc('get_org_lineage', { org_uuid: profile.org_id })
        setLineage(lineageData || [])
        setLineageLoading(false)
      }
    }
    load()
  }, [tab])

  const green = org?.color || '#1a6b4a'
  const pricePerBand = orderQty >= 500 ? 3.75 : orderQty >= 250 ? 4.0 : orderQty >= 100 ? 4.2 : 4.75
  const orderTotal = (orderQty * pricePerBand).toLocaleString('en-US', { minimumFractionDigits: 2 })

  const statusColor = (s: string) => {
    if (s === 'registered') return { bg: '#e6f4ee', color: '#1a6b4a' }
    if (s === 'unregistered') return { bg: '#fef3e2', color: '#c17f2a' }
    return { bg: '#f3f3f3', color: '#888' }
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return mins + 'm ago'
    if (hours < 24) return hours + 'h ago'
    return days + 'd ago'
  }

  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: '#7a6c5a', display: 'block' as const, marginBottom: 6, letterSpacing: 0.4 }

  if (loading) return <div style={{ color: '#8a7c6a', fontSize: 15, paddingTop: 40, textAlign: 'center' }}>Loading... ✝</div>
  if (!org) return <div style={{ color: '#8a7c6a', fontSize: 15, paddingTop: 40, textAlign: 'center' }}>No organization found. <a href="/signin" style={{ color: '#1a6b4a' }}>Sign in again</a></div>

  if (tab === 'Overview') return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', color: '#2c2416' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32, maxWidth: 1100 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Ministry Dashboard</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>Every band is a prayer in motion. Here's how far {org?.name}'s love has traveled.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
            {[{ label: 'Total Bands', value: stats?.total_bands || 0, icon: '⟳' }, { label: 'Active Bands', value: stats?.active_bands || 0, icon: '✦' }, { label: 'Prayers Offered', value: stats?.total_prayers || 0, icon: '◎' }, { label: 'Countries', value: stats?.countries || 0, icon: '◈' }].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 22, marginBottom: 6, color: green }}>{s.icon}</div>
                <div style={{ fontSize: 30, fontWeight: 'bold', color: '#1a1208', lineHeight: 1 }}>{Number(s.value).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <OrgMap orgId={org?.id} green={green} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Bands</span>
                <a href="/org/dashboard?tab=Bands" style={{ fontSize: 12, color: green, textDecoration: 'none' }}>View all →</a>
              </div>
              {bands.slice(0, 6).map((b, i) => {
                const sc = statusColor(b.status)
                return (
                  <div key={b.band_id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12, borderBottom: i < 5 ? '1px solid #f7f4ef' : 'none' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: green, fontWeight: 'bold', minWidth: 100 }}>{b.band_id}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500 }}>—</div></div>
                    <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{b.status}</div>
                  </div>
                )
              })}
              {bands.length === 0 && <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No bands yet.</div>}
            </div>
            <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Prayers</span>
                <a href="/org/dashboard?tab=Prayer Wall" style={{ fontSize: 12, color: green, textDecoration: 'none' }}>View all →</a>
              </div>
              {prayers.slice(0, 4).map((p, i) => (
                <div key={i} style={{ padding: '14px 20px', borderBottom: i < 3 ? '1px solid #f7f4ef' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{p.user_name}</span>
                    <span style={{ fontSize: 11, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#5a4f42', lineHeight: 1.5, fontStyle: 'italic' }}>"{p.prayer}"</div>
                  <div style={{ fontSize: 10, color: green, fontFamily: 'monospace', marginTop: 4 }}>{p.band_id}</div>
                </div>
              ))}
              {prayers.length === 0 && <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No prayers yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (tab === 'Bands') return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Your Bands</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 24, fontSize: 14 }}>All bands under the {org?.prefix} prefix.</p>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', background: '#fbf9f7', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
              {['Band ID', 'Status'].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#8a7c6a', letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</div>)}
            </div>
            {bands.map((b, i) => {
              const sc = statusColor(b.status)
              return (
                <div key={b.band_id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, padding: '13px 20px', alignItems: 'center', borderBottom: i < bands.length - 1 ? '1px solid #f7f4ef' : 'none' }}>
                  <a href={'/band/' + b.band_id} style={{ fontFamily: 'monospace', fontSize: 13, color: green, fontWeight: 'bold', textDecoration: 'none' }}>{b.band_id}</a>
                  <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize', display: 'inline-block' }}>{b.status}</div>
                </div>
              )
            })}
            {bands.length === 0 && <div style={{ padding: '40px 20px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>No bands yet. Order your first batch to get started. ✝</div>}
          </div>
        </div>
      </div>
    </div>
  )

  if (tab === 'Prayer Wall') return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Prayer Wall</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 24, fontSize: 14 }}>Every prayer left by someone holding a {org?.prefix} band.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {prayers.map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 14 }}>{p.user_name}</span>
                  <span style={{ fontSize: 12, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
                </div>
                <div style={{ fontSize: 15, color: '#3a2f22', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>"{p.prayer}"</div>
                <div style={{ fontSize: 12, color: green, fontFamily: 'monospace' }}>{p.band_id}</div>
              </div>
            ))}
            {prayers.length === 0 && <div style={{ padding: '40px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>Prayers will appear here as bands are registered. ✝</div>}
          </div>
        </div>
      </div>
    </div>
  )

  if (tab === 'Lineage') return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Band Lineage</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 24, fontSize: 14 }}>Track how far each {org?.prefix} band has traveled and how many hands it has touched.</p>
          {lineageLoading && <div style={{ color: '#8a7c6a', textAlign: 'center', padding: 40 }}>Loading lineage data... ✝</div>}
          {!lineageLoading && lineage.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: 40, textAlign: 'center', color: '#8a7c6a' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✝</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#2c2416' }}>No registered bands yet</div>
              <div style={{ fontSize: 14 }}>Lineage data will appear here once bands are registered by recipients.</div>
            </div>
          )}
          {!lineageLoading && lineage.length > 0 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                {[{ label: 'Bands Traveling', value: lineage.length }, { label: 'Total Holders', value: lineage.reduce((sum: number, b: any) => sum + Number(b.total_holders), 0) }, { label: 'Countries Reached', value: lineage.reduce((sum: number, b: any) => sum + Number(b.countries), 0) }].map(s => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: green }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lineage.map((b: any) => (
                  <div key={b.band_id} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedBand(expandedBand === b.band_id ? null : b.band_id)} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 16 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, color: green, fontWeight: 'bold', minWidth: 110 }}>{b.band_id}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#5a4f42' }}>{b.total_holders} {Number(b.total_holders) === 1 ? 'person' : 'people'}</span>
                          <span style={{ fontSize: 11, color: '#b0a090' }}>·</span>
                          <span style={{ fontSize: 12, color: '#5a4f42' }}>{b.countries} {Number(b.countries) === 1 ? 'country' : 'countries'}</span>
                          <span style={{ fontSize: 11, color: '#b0a090' }}>·</span>
                          <span style={{ fontSize: 12, color: '#5a4f42' }}>{b.prayers} {Number(b.prayers) === 1 ? 'prayer' : 'prayers'}</span>
                        </div>
                        <div style={{ height: 6, background: '#f0ece6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: Math.min(100, (Number(b.total_holders) / Math.max(...lineage.map((x: any) => Number(x.total_holders)))) * 100) + '%', background: 'linear-gradient(90deg, ' + green + ', #2d9966)', borderRadius: 3 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#8a7c6a', textAlign: 'right', minWidth: 100 }}>
                        {b.latest_country || '—'}
                        {b.latest_date && <div style={{ fontSize: 11, color: '#b0a090' }}>{timeAgo(b.latest_date)}</div>}
                      </div>
                      <div style={{ fontSize: 16, color: '#b0a090', transform: expandedBand === b.band_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
                    </div>
                    {expandedBand === b.band_id && (
                      <div style={{ borderTop: '1px solid #f0ece6', padding: '16px 20px', background: '#fbf9f7' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a7c6a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Journey</div>
                        <LineageJourney bandId={b.band_id} green={green} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (tab === 'Orders') return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Order Bands</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 28, fontSize: 14 }}>All bands ship laser-engraved with NFC chips and your {org?.prefix} prefix.</p>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: 28, marginBottom: 24, maxWidth: 520 }}>
            <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 20 }}>New Band Order</h2>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>QUANTITY</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {[50, 100, 250, 500, 1000].map(qty => (
                  <button key={qty} onClick={() => setOrderQty(qty)} style={{ padding: '8px 18px', borderRadius: 6, border: orderQty === qty ? '2px solid ' + green : '2px solid #e8e1d6', background: orderQty === qty ? '#e6f4ee' : '#fff', color: orderQty === qty ? green : '#5a4f42', fontWeight: orderQty === qty ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{qty}</button>
                ))}
              </div>
            </div>
            <div style={{ background: '#f7f4ef', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 12 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>Volume Pricing</div>
              {[{ min: 50, max: 99, price: 4.50 }, { min: 100, max: 249, price: 4.20 }, { min: 250, max: 499, price: 4.00 }, { min: 500, max: null, price: 3.75 }].map(tier => {
                const active = orderQty >= tier.min && (tier.max === null || orderQty <= tier.max)
                return <div key={tier.min} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: active ? green : '#8a7c6a', fontWeight: active ? 700 : 400 }}><span>{tier.max ? tier.min + '–' + tier.max + ' bands' : tier.min + '+ bands'}</span><span>${tier.price.toFixed(2)}/band</span></div>
              })}
            </div>
            <div style={{ borderTop: '1px solid #e8e1d6', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#8a7c6a' }}>{orderQty} bands × ${pricePerBand}/band</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>${orderTotal}</div>
              </div>
              <button onClick={async () => { const res = await fetch('/api/create-org-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: orderQty, orgId: org?.id, orgName: org?.name, prefix: org?.prefix }) }); const { url } = await res.json(); if (url) window.location.href = url }} style={{ background: green, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Order Bands →</button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#8a7c6a', textAlign: 'center' }}>Engraved with {org?.prefix}-XXXXX · NFC chip included · Ships in 2–3 weeks</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden', maxWidth: 520 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', fontWeight: 'bold', fontSize: 15 }}>Order History</div>
            {orders.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < orders.length - 1 ? '1px solid #f7f4ef' : 'none', gap: 16 }}>
                <div><div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' }}>ORD-{o.id}</div><div style={{ fontSize: 11, color: '#8a7c6a' }}>{new Date(o.created_at).toLocaleDateString()}</div></div>
                <div style={{ flex: 1, fontSize: 13 }}>{o.order_metadata?.quantity || '—'} bands</div>
                <div style={{ fontWeight: 'bold' }}>${((o.amount_total || 0) / 100).toFixed(2)}</div>
                <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: '#e6f4ee', color: green, textTransform: 'capitalize' }}>{o.status}</div>
              </div>
            ))}
            {orders.length === 0 && <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No orders yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar org={org} tab={tab} green={green} />
        <div style={{ flex: 1, padding: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Church Settings</h1>
          <p style={{ color: '#8a7c6a', marginBottom: 28, fontSize: 14 }}>Your organization profile.</p>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: 28, maxWidth: 520 }}>
            {[{ label: 'CHURCH NAME', value: org?.name }, { label: 'BAND PREFIX', value: org?.prefix + '-XXXXX', mono: true }, { label: 'SUBDOMAIN', value: org?.subdomain + '.prayerbands.com', mono: true }, { label: 'LOCATION', value: org?.location || '—' }, { label: 'WEBSITE', value: org?.website || '—' }, { label: 'PLAN', value: org?.plan || 'Ministry' }].map(field => (
              <div key={field.label} style={{ marginBottom: 20 }}>
                <label style={labelStyle}>{field.label}</label>
                <div style={{ border: '1px solid #e8e1d6', borderRadius: 6, padding: '10px 14px', fontSize: field.mono ? 13 : 14, fontFamily: field.mono ? 'monospace' : 'Georgia, serif', background: '#fbf9f7', color: '#2c2416' }}>{field.value}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 8 }}>To update your church details, contact support@prayerbands.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LineageJourney({ bandId, green }: { bandId: string, green: string }) {
  const [regs, setRegs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.from('registrations').select('user_name, city, country, prayer, registered_at').eq('band_id', bandId).order('registered_at', { ascending: true }).then(({ data }) => { setRegs(data || []); setLoading(false) })
  }, [bandId])

  if (loading) return <div style={{ fontSize: 13, color: '#8a7c6a' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {regs.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? green : '#c8b49a', marginTop: 3 }} />
            {i < regs.length - 1 && <div style={{ width: 1, height: 20, background: '#e8e1d6', margin: '2px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416' }}>
              {r.user_name || 'Anonymous'}
              {i === 0 && <span style={{ fontSize: 10, background: '#e6f4ee', color: green, padding: '1px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 400 }}>origin</span>}
            </div>
            <div style={{ fontSize: 11, color: '#8a7c6a' }}>{[r.city, r.country].filter(Boolean).join(', ') || 'Unknown location'} · {new Date(r.registered_at).toLocaleDateString()}</div>
            {r.prayer && <div style={{ fontSize: 12, color: '#5a4f42', fontStyle: 'italic', marginTop: 2 }}>"{r.prayer}"</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrgDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Georgia, serif', color: '#8a7c6a' }}>Loading... ✝</div>}>
      <OrgDashboardInner />
    </Suspense>
  )
}
