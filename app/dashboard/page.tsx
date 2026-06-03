'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Band = {
  id: string
  band_id: string
  created_at: string
  registrations: { count: number }[]
  chain_prayers: { count: number }[]
}

type Activity = {
  id: string
  type: 'prayer' | 'registration'
  band_id: string
  message?: string
  location?: string
  created_at: string
}

function PersonalMap({ points }: { points: any[] }) {
  const [mode, setMode] = useState<'current' | 'all'>('current')
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
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
        const color = mode === 'current' ? '#C8A96E' : '#e8526a'
        const dot = L.divIcon({
          className: '',
          html: '<div style="width:12px;height:12px;background:' + color + ';border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [12, 12], iconAnchor: [6, 6],
        })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        m.bindPopup('<div style="font-family:Georgia,serif"><div style="font-family:monospace;font-weight:bold;color:#C8A96E">' + p.bandId + '</div>' + (p.name ? '<div style="font-size:13px">' + p.name + '</div>' : '') + (p.city || p.country ? '<div style="font-size:12px;color:#9B7B62">' + [p.city, p.country].filter(Boolean).join(', ') + '</div>' : '') + (p.prayer ? '<div style="font-size:12px;font-style:italic;border-left:2px solid #C8A96E;padding-left:6px;margin-top:4px">"' + p.prayer.slice(0, 80) + '"</div>' : '') + '</div>')
        markers.push(m)
      })
      if (markers.length === 1) { map.setView([valid[0].lat, valid[0].lng], 5) }
      else if (markers.length > 1) { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2)) }
    }
    loadMap()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [points, mode])

  const currentCount = points.filter(p => p.isCurrent && p.lat && p.lng).length
  const allCount = points.filter(p => p.lat && p.lng).length

  return (
    <div style={{ background: '#fff', border: '1px solid #E8DFD0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, color: '#9B7B62' }}>
          {mode === 'current' ? currentCount + ' current locations' : allCount + ' total registrations'}
        </span>
        <div style={{ display: 'flex', gap: 4, background: '#f7f4ef', borderRadius: 6, padding: 3 }}>
          <button onClick={() => setMode('current')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: mode === 'current' ? '#C8A96E' : 'transparent', color: mode === 'current' ? '#fff' : '#9B7B62', fontSize: 12, cursor: 'pointer', fontFamily: 'Lato, sans-serif', fontWeight: mode === 'current' ? 700 : 400 }}>Current ({currentCount})</button>
          <button onClick={() => setMode('all')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: mode === 'all' ? '#C8A96E' : 'transparent', color: mode === 'all' ? '#fff' : '#9B7B62', fontSize: 12, cursor: 'pointer', fontFamily: 'Lato, sans-serif', fontWeight: mode === 'all' ? 700 : 400 }}>All Journeys ({allCount})</button>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 500, width: '100%' }} />
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bands, setBands] = useState<Band[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [mapPoints, setMapPoints] = useState<any[]>([])
  const [stats, setStats] = useState({ bands: 0, prayers: 0, registrations: 0, countries: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'bands' | 'activity' | 'map'>('overview')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/signin'; return }
      setUser(user)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: bandsData } = await supabase
        .from('bands')
        .select('id, band_id, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setBands((bandsData as Band[]) || [])

      // Get registration counts separately
      const bandIds = (bandsData || []).map((b: any) => b.band_id)
      const { data: regCounts } = await supabase
        .from('registrations')
        .select('band_id')
        .in('band_id', bandIds.length > 0 ? bandIds : ['none'])
      
      const regCountMap: Record<string, number> = {}
      ;(regCounts || []).forEach(r => {
        regCountMap[r.band_id] = (regCountMap[r.band_id] || 0) + 1
      })

      // Merge counts back
      const bandsWithCounts = (bandsData || []).map((b: any) => ({
        ...b,
        registrations: [{ count: regCountMap[b.band_id] || 0 }],
        chain_prayers: [{ count: 0 }],
      }))
      setBands(bandsWithCounts as Band[])

      const { data: prayers } = await supabase
        .from('chain_prayers')
        .select('id, band_id, message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: regs } = await supabase
        .from('registrations')
        .select('id, band_id, location, created_at')
        .in('band_id', (bandsData || []).map((b: Band) => b.band_id))
        .order('created_at', { ascending: false })
        .limit(10)

      const activityItems: Activity[] = [
        ...((prayers || []).map((p: any) => ({ id: p.id, type: 'prayer' as const, band_id: p.band_id, message: p.message, created_at: p.created_at }))),
        ...((regs || []).map((r: any) => ({ id: r.id, type: 'registration' as const, band_id: r.band_id, location: r.location, created_at: r.created_at }))),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12)
      setActivity(activityItems)

      const totalRegs = Object.values(regCountMap).reduce((sum, c) => sum + c, 0)
      setStats({ bands: (bandsData || []).length, prayers: 0, registrations: totalRegs, countries: 0 })

      // Load map points
      const mapBandIds = (bandsData || []).map((b: Band) => b.band_id)
      if (mapBandIds.length > 0) {
        const { data: mapData } = await supabase
          .from('registrations')
          .select('band_id, user_name, city, country, latitude, longitude, prayer, registered_at')
          .in('band_id', mapBandIds)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
        const latest: Record<string, any> = {}
        ;(mapData || []).forEach(r => {
          if (!latest[r.band_id] || new Date(r.registered_at) > new Date(latest[r.band_id].registered_at)) {
            latest[r.band_id] = r
          }
        })
        const latestKeys = new Set(Object.values(latest).map((r: any) => r.band_id + r.registered_at))
        setMapPoints((mapData || []).map(r => ({
          lat: r.latitude, lng: r.longitude, bandId: r.band_id,
          name: r.user_name, city: r.city, country: r.country,
          prayer: r.prayer, date: r.registered_at,
          isCurrent: latestKeys.has(r.band_id + r.registered_at),
        })))
      }

      setLoading(false)
    }

    load()
  }, [])

  const signOut = async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return mins + 'm ago'
    if (hours < 24) return hours + 'h ago'
    return days + 'd ago'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDFAF5', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 52, color: '#C8A96E', marginBottom: 16 }}>✝</div>
        <div style={{ fontFamily: 'Lato, sans-serif', fontSize: 14, color: '#9B7B62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading your ministry...</div>
      </div>
    </div>
  )

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend'

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#FDFAF5', minHeight: '100vh', color: '#2C1A0E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .stat-card { background: #fff; border: 1px solid #E8DFD0; border-radius: 10px; padding: 28px 24px; transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(44,26,14,0.08); }
        .band-row { background: #fff; border: 1px solid #E8DFD0; border-radius: 8px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: box-shadow 0.2s; cursor: pointer; }
        .band-row:hover { box-shadow: 0 4px 20px rgba(44,26,14,0.08); }
        .tab-btn { font-family: 'Lato', sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 20px; border-radius: 4px; border: 1px solid #E8DFD0; background: transparent; cursor: pointer; transition: all 0.2s; color: #9B7B62; }
        .tab-btn.active { background: #2C1A0E; color: #FDFAF5; border-color: #2C1A0E; }
        .activity-item { padding: 16px 0; border-bottom: 1px solid #F5EFE4; display: flex; align-items: flex-start; gap: 14; }
        .activity-item:last-child { border-bottom: none; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } .main-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <nav style={{ background: '#2C1A0E', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#C8A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>✝</div>
          <span className="playfair" style={{ fontSize: 18, fontWeight: 600, color: '#FDFAF5' }}>PrayerBands</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/store" style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Store</a>
          <span style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{user?.email}</span>
          <button onClick={signOut} style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A96E', background: 'none', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: 48 }}>
          <span style={{ fontFamily: 'Lato, sans-serif', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8A96E', display: 'block', marginBottom: 8 }}>Ministry Dashboard</span>
          <h1 className="playfair" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600 }}>
            Welcome back, <em style={{ color: '#C8A96E' }}>{firstName}</em>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {(['overview', 'bands', 'activity', 'map'] as const).map(tab => (
            <button key={tab} className={'tab-btn ' + (activeTab === tab ? 'active' : '')} onClick={() => setActiveTab(tab)}>
              {tab === 'overview' ? '📊 Overview' : tab === 'bands' ? '🎗 My Bands' : tab === 'activity' ? '⚡ Activity' : '🗺 Map'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 40 }}>
              {[
                { label: 'Bands Given', value: stats.bands, icon: '🎗', color: '#C8A96E' },
                { label: 'Prayers Left', value: stats.prayers, icon: '🙏', color: '#7BAE8E' },
                { label: 'Registrations', value: stats.registrations, icon: '✦', color: '#7B8FAE' },
                { label: 'Countries', value: mapPoints.length > 0 ? new Set(mapPoints.map(p => p.country).filter(Boolean)).size : '—', icon: '🌍', color: '#AE7B7B' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <div className="playfair" style={{ fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div className="lato" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9B7B62', marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <div>
                <h2 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Quick Actions</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { icon: '✝', label: 'Register a Band', desc: 'Activate a new PrayerBand', href: '/register', color: '#C8A96E' },
                    { icon: '🙏', label: 'Leave a Prayer', desc: 'Pray for a band in your chain', href: '/prayer-wall', color: '#7BAE8E' },
                    { icon: '🛒', label: 'Order More Bands', desc: 'Individual or church packs', href: '/store', color: '#7B8FAE' },
                  ].map(action => (
                    <a key={action.label} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#fff', border: '1px solid #E8DFD0', borderRadius: 8, textDecoration: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = action.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E8DFD0' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: action.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{action.icon}</div>
                      <div>
                        <div className="playfair" style={{ fontSize: 16, fontWeight: 600, color: '#2C1A0E' }}>{action.label}</div>
                        <div className="lato" style={{ fontSize: 13, color: '#9B7B62', marginTop: 2, fontWeight: 300 }}>{action.desc}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: '#C8B49A', fontSize: 18 }}>→</div>
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Recent Activity</h2>
                <div style={{ background: '#fff', border: '1px solid #E8DFD0', borderRadius: 10, padding: '8px 20px' }}>
                  {activity.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
                      <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300 }}>No activity yet — register your first band to get started.</p>
                    </div>
                  ) : activity.slice(0, 6).map(item => (
                    <div key={item.id} className="activity-item">
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.type === 'prayer' ? '#7BAE8E18' : '#C8A96E18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {item.type === 'prayer' ? '🙏' : '✦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lato" style={{ fontSize: 13, fontWeight: 700, color: '#2C1A0E' }}>
                          {item.type === 'prayer' ? 'Prayer left' : 'Band registered'} · <span style={{ color: '#C8A96E' }}>{item.band_id}</span>
                        </div>
                        {item.message && <div className="playfair" style={{ fontSize: 13, color: '#6B4C35', fontStyle: 'italic', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.message}"</div>}
                        {item.location && <div className="lato" style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>📍 {item.location}</div>}
                      </div>
                      <div className="lato" style={{ fontSize: 11, color: '#C8B49A', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'bands' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600 }}>My Bands</h2>
              <a href="/register" style={{ fontFamily: 'Lato, sans-serif', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#C8A96E', color: '#fff', padding: '9px 20px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>+ Register Band</a>
            </div>
            {bands.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎗</div>
                <h3 className="playfair" style={{ fontSize: 22, marginBottom: 12 }}>No bands yet</h3>
                <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300, marginBottom: 24 }}>Register your first band or order new ones from the store.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <a href="/register" style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#C8A96E', color: '#fff', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>Register a Band</a>
                  <a href="/store" style={{ fontFamily: 'Lato, sans-serif', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#C8A96E', border: '1.5px solid #C8A96E', padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>Order Bands</a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {bands.map(band => (
                  <a key={band.id} href={'/band/' + band.band_id} style={{ textDecoration: 'none' }}>
                    <div className="band-row">
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#C8A96E18', border: '2px solid #C8A96E44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✝</div>
                      <div style={{ flex: 1 }}>
                        <div className="playfair" style={{ fontSize: 18, fontWeight: 600, color: '#C8A96E' }}>{band.band_id}</div>
                        <div className="lato" style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>Registered {new Date(band.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 24, marginRight: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div className="playfair" style={{ fontSize: 20, fontWeight: 700, color: '#7BAE8E' }}>{band.chain_prayers?.[0]?.count || 0}</div>
                          <div className="lato" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62' }}>Prayers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="playfair" style={{ fontSize: 20, fontWeight: 700, color: '#7B8FAE' }}>{band.registrations?.[0]?.count || 0}</div>
                          <div className="lato" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B7B62' }}>Hands</div>
                        </div>
                      </div>
                      <div style={{ color: '#C8B49A', fontSize: 18 }}>→</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, marginBottom: 24 }}>All Activity</h2>
            <div style={{ background: '#fff', border: '1px solid #E8DFD0', borderRadius: 10, padding: '8px 24px' }}>
              {activity.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300 }}>No activity yet.</p>
                </div>
              ) : activity.map(item => (
                <div key={item.id} className="activity-item">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.type === 'prayer' ? '#7BAE8E18' : '#C8A96E18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {item.type === 'prayer' ? '🙏' : '✦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="lato" style={{ fontSize: 14, fontWeight: 700 }}>
                      {item.type === 'prayer' ? 'Prayer left on' : 'Band registered'} · <span style={{ color: '#C8A96E' }}>{item.band_id}</span>
                    </div>
                    {item.message && <div className="playfair" style={{ fontSize: 14, color: '#6B4C35', fontStyle: 'italic', marginTop: 4 }}>"{item.message}"</div>}
                    {item.location && <div className="lato" style={{ fontSize: 13, color: '#9B7B62', marginTop: 3 }}>📍 {item.location}</div>}
                  </div>
                  <div className="lato" style={{ fontSize: 12, color: '#C8B49A', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div>
            <h2 className="playfair" style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>Prayer Map</h2>
            <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300, marginBottom: 20 }}>See where your bands are traveling around the world.</p>
            {mapPoints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🗺</div>
                <h3 className="playfair" style={{ fontSize: 22, marginBottom: 12 }}>No map data yet</h3>
                <p className="lato" style={{ fontSize: 14, color: '#9B7B62', fontWeight: 300 }}>Register bands and map data will appear here as they travel.</p>
              </div>
            ) : (
              <PersonalMap points={mapPoints} />
            )}
          </div>
        )}

      </div>
    </div>
  )
}
