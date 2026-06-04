'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const NAV = ['Overview', 'Bands', 'Prayer Wall', 'Lineage', 'Orders', 'Settings']
const NAV_ICONS: Record<string, string> = {
  Overview: '◎', Bands: '⟳', 'Prayer Wall': '🙏', Lineage: '✦', Orders: '📦', Settings: '⚙'
}

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
          link.id = 'leaflet-css'; link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => renderMap()
        document.head.appendChild(script)
      } else { renderMap() }
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
        const dot = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:' + (mode === 'current' ? green : '#e8526a') + ';border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
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
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 'bold', fontSize: 15 }}>Ministry Map</span>
        <div style={{ display: 'flex', gap: 4, background: '#f7f4ef', borderRadius: 6, padding: 3 }}>
          <button onClick={() => setMode('current')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: mode === 'current' ? green : 'transparent', color: mode === 'current' ? '#fff' : '#8a7c6a', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: mode === 'current' ? 700 : 400 }}>Current ({currentCount})</button>
          <button onClick={() => setMode('all')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: mode === 'all' ? green : 'transparent', color: mode === 'all' ? '#fff' : '#8a7c6a', fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: mode === 'all' ? 700 : 400 }}>All ({allCount})</button>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 300, width: '100%' }} />
    </div>
  )
}

function TopBar({ org, green }: { org: any, green: string }) {
  return (
    <div style={{ background: green, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.18)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
      <span style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1, whiteSpace: 'nowrap' }}>✝ PrayerBands</span>
      <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 4, padding: '2px 8px', fontSize: 11, letterSpacing: 0.5, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{org?.subdomain}.prayerbands.com</span>
      <div style={{ flex: 1 }} />
      <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>Sign out</button>
    </div>
  )
}

function Sidebar({ org, tab, setTab, green }: { org: any, tab: string, setTab: (t: string) => void, green: string }) {
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e8e1d6', padding: '28px 0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #e8e1d6' }}>
        <div style={{ fontSize: 15, fontWeight: 'bold', color: green, lineHeight: 1.3 }}>{org?.name}</div>
        <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{org?.location}</div>
        <div style={{ display: 'inline-block', marginTop: 8, background: '#e6f4ee', color: green, fontSize: 11, padding: '2px 8px', borderRadius: 12, fontFamily: 'monospace', letterSpacing: 0.5 }}>{org?.prefix}-XXXXX</div>
      </div>
      <div style={{ padding: '12px 0' }}>
        {NAV.map(item => (
          <div key={item} onClick={() => setTab(item)} style={{ padding: '10px 24px', cursor: 'pointer', fontSize: 14, borderLeft: tab === item ? '3px solid ' + green : '3px solid transparent', color: tab === item ? green : '#5a4f42', background: tab === item ? '#f0f7f3' : 'transparent', fontWeight: tab === item ? 600 : 400 }}>{item}</div>
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

function BottomNav({ tab, setTab, green }: { tab: string, setTab: (t: string) => void, green: string }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e1d6', display: 'flex', zIndex: 200, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {NAV.map(item => {
        const active = tab === item
        return (
          <button key={item} onClick={() => setTab(item)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 2px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', minWidth: 0 }}>
            {active && <div style={{ position: 'absolute', top: 0, width: 28, height: 2, background: green, borderRadius: '0 0 2px 2px' }} />}
            <span style={{ fontSize: 16, lineHeight: 1 }}>{NAV_ICONS[item]}</span>
            <span style={{ fontSize: 9, color: active ? green : '#b8a898', fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', paddingInline: 2 }}>{item}</span>
          </button>
        )
      })}
    </nav>
  )
}

function OrgDashboardInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'Overview')
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
  const [orgId, setOrgId] = useState<string>('')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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
        setOrgId(profile.org_id)
        const { data: statsData } = await supabase.rpc('get_org_stats', { org_uuid: profile.org_id })
        setStats(statsData)
        const { data: bandsData } = await supabase.from('bands').select('band_id, status, created_at').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(50)
        setBands(bandsData || [])
        const { data: prayersData } = await supabase.from('registrations').select('band_id, user_name, prayer, city, country, registered_at').not('prayer', 'is', null).order('registered_at', { ascending: false }).limit(20)
        setPrayers(prayersData || [])
        const { data: ordersData } = await supabase.from('orders').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false })
        setOrders(ordersData || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (tab === 'Lineage' && orgId && lineage.length === 0) {
      setLineageLoading(true)
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      supabase.rpc('get_org_lineage', { org_uuid: orgId }).then(({ data }) => { setLineage(data || []); setLineageLoading(false) })
    }
  }, [tab, orgId])

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
    const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
    if (mins < 60) return mins + 'm ago'
    if (hours < 24) return hours + 'h ago'
    return days + 'd ago'
  }

  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: '#7a6c5a', display: 'block' as const, marginBottom: 6, letterSpacing: 0.4 }

if (loading) return (
    <div style={{ color: '#8a7c6a', fontSize: 15, paddingTop: 80, textAlign: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✝</div>
      Loading your ministry...
      <div style={{ fontSize: 12, marginTop: 20 }}>width: {typeof window !== 'undefined' ? window.innerWidth : 'ssr'} | mobile: {isMobile ? 'yes' : 'no'}</div>
    </div>
  )
  if (!org) return <div style={{ color: '#8a7c6a', fontSize: 15, paddingTop: 80, textAlign: 'center', fontFamily: 'Georgia, serif' }}>No organization found. <a href="/signin" style={{ color: '#1a6b4a' }}>Sign in again</a></div>

  const renderContent = () => {
    if (tab === 'Overview') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px', maxWidth: 1100 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Ministry Dashboard</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>Every band is a prayer in motion. Here's how far {org?.name}'s love has traveled.</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
          {[{ label: 'Total Bands', value: stats?.total_bands || 0, icon: '⟳' }, { label: 'Active Bands', value: stats?.active_bands || 0, icon: '✦' }, { label: 'Prayers Offered', value: stats?.total_prayers || 0, icon: '◎' }, { label: 'Countries', value: stats?.countries || 0, icon: '◈' }].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: isMobile ? '14px 12px' : '20px' }}>
              <div style={{ fontSize: 20, marginBottom: 4, color: green }}>{s.icon}</div>
              <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 'bold', color: '#1a1208', lineHeight: 1 }}>{Number(s.value).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <OrgMap orgId={org?.id} green={green} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Bands</span>
              <button onClick={() => setTab('Bands')} style={{ fontSize: 12, color: green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>View all →</button>
            </div>
            {bands.slice(0, 6).map((b, i) => {
              const sc = statusColor(b.status)
              return (
                <div key={b.band_id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, borderBottom: i < 5 ? '1px solid #f7f4ef' : 'none' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: green, fontWeight: 'bold', flex: 1 }}>{b.band_id}</div>
                  <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' as const }}>{b.status}</div>
                </div>
              )
            })}
            {bands.length === 0 && <div style={{ padding: '24px 16px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No bands yet.</div>}
          </div>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Prayers</span>
              <button onClick={() => setTab('Prayer Wall')} style={{ fontSize: 12, color: green, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>View all →</button>
            </div>
            {prayers.slice(0, 4).map((p, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < 3 ? '1px solid #f7f4ef' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>{p.user_name}</span>
                  <span style={{ fontSize: 11, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#5a4f42', lineHeight: 1.5, fontStyle: 'italic' }}>"{p.prayer}"</div>
                <div style={{ fontSize: 10, color: green, fontFamily: 'monospace', marginTop: 4 }}>{p.band_id}</div>
              </div>
            ))}
            {prayers.length === 0 && <div style={{ padding: '24px 16px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No prayers yet.</div>}
          </div>
        </div>
      </div>
    )

    if (tab === 'Bands') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4 }}>Your Bands</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>All bands under the {org?.prefix} prefix.</p>
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ece6', background: '#fbf9f7', display: 'flex', gap: 12 }}>
            {['Band ID', 'Status'].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#8a7c6a', letterSpacing: 0.5, textTransform: 'uppercase' as const, flex: 1 }}>{h}</div>)}
          </div>
          {bands.map((b, i) => {
            const sc = statusColor(b.status)
            return (
              <div key={b.band_id} style={{ display: 'flex', gap: 12, padding: '13px 16px', alignItems: 'center', borderBottom: i < bands.length - 1 ? '1px solid #f7f4ef' : 'none' }}>
                <a href={'/band/' + b.band_id} style={{ fontFamily: 'monospace', fontSize: 13, color: green, fontWeight: 'bold', textDecoration: 'none', flex: 1 }}>{b.band_id}</a>
                <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' as const }}>{b.status}</div>
              </div>
            )
          })}
          {bands.length === 0 && <div style={{ padding: '40px 16px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>No bands yet. ✝</div>}
        </div>
      </div>
    )

    if (tab === 'Prayer Wall') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4 }}>Prayer Wall</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>Every prayer left by someone holding a {org?.prefix} band.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {prayers.map((p, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e1d6', borderLeft: '3px solid ' + green, borderRadius: 10, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>{p.user_name}</span>
                <span style={{ fontSize: 12, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
              </div>
              <div style={{ fontSize: 15, color: '#3a2f22', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>"{p.prayer}"</div>
              <div style={{ fontSize: 11, color: green, fontFamily: 'monospace' }}>{p.band_id} · {[p.city, p.country].filter(Boolean).join(', ')}</div>
            </div>
          ))}
          {prayers.length === 0 && <div style={{ padding: '40px 16px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>Prayers will appear here as bands are registered. ✝</div>}
        </div>
      </div>
    )

    if (tab === 'Lineage') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4 }}>Band Lineage</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>Track how far each {org?.prefix} band has traveled.</p>
        {lineageLoading && <div style={{ color: '#8a7c6a', textAlign: 'center', padding: 40 }}>Loading lineage... ✝</div>}
        {!lineageLoading && lineage.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: 40, textAlign: 'center', color: '#8a7c6a' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✝</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#2c2416' }}>No registered bands yet</div>
            <div style={{ fontSize: 14 }}>Lineage data will appear once bands are registered.</div>
          </div>
        )}
        {!lineageLoading && lineage.length > 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
              {[{ label: 'Bands Traveling', value: lineage.length }, { label: 'Total Holders', value: lineage.reduce((s: number, b: any) => s + Number(b.total_holders), 0) }, { label: 'Countries', value: lineage.reduce((s: number, b: any) => s + Number(b.countries), 0) }].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: isMobile ? '14px 10px' : '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 'bold', color: green }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lineage.map((b: any) => (
                <div key={b.band_id} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedBand(expandedBand === b.band_id ? null : b.band_id)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: 12 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: green, fontWeight: 'bold', minWidth: 90 }}>{b.band_id}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#5a4f42', marginBottom: 4 }}>{b.total_holders} people · {b.countries} {Number(b.countries) === 1 ? 'country' : 'countries'} · {b.prayers} prayers</div>
                      <div style={{ height: 5, background: '#f0ece6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.min(100, (Number(b.total_holders) / Math.max(...lineage.map((x: any) => Number(x.total_holders)))) * 100) + '%', background: 'linear-gradient(90deg, ' + green + ', #2d9966)', borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: '#b0a090', transform: expandedBand === b.band_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</div>
                  </div>
                  {expandedBand === b.band_id && (
                    <div style={{ borderTop: '1px solid #f0ece6', padding: '16px', background: '#fbf9f7' }}>
                      <LineageJourney bandId={b.band_id} green={green} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )

    if (tab === 'Orders') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4 }}>Order Bands</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>All bands ship laser-engraved with NFC chips and your {org?.prefix} prefix.</p>
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: isMobile ? '16px 14px' : '28px', marginBottom: 20, maxWidth: isMobile ? '100%' : 520 }}>
          <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 16 }}>New Band Order</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>QUANTITY</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {[50, 100, 250, 500, 1000].map(qty => (
                <button key={qty} onClick={() => setOrderQty(qty)} style={{ padding: '8px 14px', borderRadius: 6, border: orderQty === qty ? '2px solid ' + green : '2px solid #e8e1d6', background: orderQty === qty ? '#e6f4ee' : '#fff', color: orderQty === qty ? green : '#5a4f42', fontWeight: orderQty === qty ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>{qty}</button>
              ))}
            </div>
          </div>
          <div style={{ background: '#f7f4ef', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Volume Pricing</div>
            {[{ min: 50, max: 99, price: 4.50 }, { min: 100, max: 249, price: 4.20 }, { min: 250, max: 499, price: 4.00 }, { min: 500, max: null, price: 3.75 }].map(tier => {
              const active = orderQty >= tier.min && (tier.max === null || orderQty <= tier.max)
              return <div key={tier.min} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: active ? green : '#8a7c6a', fontWeight: active ? 700 : 400 }}><span>{tier.max ? tier.min + '–' + tier.max + ' bands' : tier.min + '+ bands'}</span><span>${tier.price.toFixed(2)}/band</span></div>
            })}
          </div>
          <div style={{ borderTop: '1px solid #e8e1d6', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#8a7c6a' }}>{orderQty} × ${pricePerBand}/band</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>${orderTotal}</div>
            </div>
            <button onClick={async () => { const res = await fetch('/api/create-org-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: orderQty, orgId: org?.id, orgName: org?.name, prefix: org?.prefix }) }); const { url } = await res.json(); if (url) window.location.href = url }} style={{ background: green, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Order →</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#8a7c6a', textAlign: 'center' }}>Engraved with {org?.prefix}-XXXXX · NFC chip included · Ships in 2–3 weeks</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden', maxWidth: isMobile ? '100%' : 520 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', fontWeight: 'bold', fontSize: 15 }}>Order History</div>
          {orders.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < orders.length - 1 ? '1px solid #f7f4ef' : 'none', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold' }}>ORD-{o.id.slice(0, 8)}</div>
                <div style={{ fontSize: 11, color: '#8a7c6a' }}>{new Date(o.created_at).toLocaleDateString()} · {o.order_metadata?.quantity || '—'} bands</div>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: 15, flexShrink: 0 }}>${((o.amount_total || 0) / 100).toFixed(2)}</div>
              <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: '#e6f4ee', color: green, textTransform: 'capitalize' as const, flexShrink: 0 }}>{o.status}</div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ padding: '24px 16px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>No orders yet.</div>}
        </div>
      </div>
    )

    return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 'bold', marginBottom: 4 }}>Church Settings</h1>
        <p style={{ color: '#8a7c6a', marginBottom: 20, fontSize: 14 }}>Your organization profile.</p>
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: isMobile ? '16px 14px' : '28px', maxWidth: isMobile ? '100%' : 520 }}>
          {[{ label: 'CHURCH NAME', value: org?.name }, { label: 'BAND PREFIX', value: org?.prefix + '-XXXXX', mono: true }, { label: 'SUBDOMAIN', value: org?.subdomain + '.prayerbands.com', mono: true }, { label: 'LOCATION', value: org?.location || '—' }, { label: 'WEBSITE', value: org?.website || '—' }, { label: 'PLAN', value: org?.plan || 'Ministry' }].map(field => (
            <div key={field.label} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{field.label}</label>
              <div style={{ border: '1px solid #e8e1d6', borderRadius: 6, padding: '10px 14px', fontSize: field.mono ? 13 : 14, fontFamily: field.mono ? 'monospace' : 'Georgia, serif', background: '#fbf9f7', color: '#2c2416', wordBreak: 'break-all' as const }}>{field.value}</div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>To update your church details, contact support@prayerbands.com</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', color: '#2c2416' }}>
      <TopBar org={org} green={green} />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {!isMobile && <Sidebar org={org} tab={tab} setTab={setTab} green={green} />}
        <div style={{ flex: 1, overflowX: 'hidden', paddingBottom: isMobile ? 80 : 0 }}>
          {renderContent()}
        </div>
      </div>
      {isMobile && <BottomNav tab={tab} setTab={setTab} green={green} />}
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
            <div style={{ fontSize: 11, color: '#8a7c6a' }}>{[r.city, r.country].filter(Boolean).join(', ') || 'Unknown'} · {new Date(r.registered_at).toLocaleDateString()}</div>
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