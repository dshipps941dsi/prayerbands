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

type MapPoint = {
  lat: number
  lng: number
  band_id: string
  user_name?: string
  city?: string
  country?: string
  prayer?: string
}

const TABS = ['Overview', 'Bands', 'Map', 'Prayers', 'Activity']
const TAB_ICONS: Record<string, string> = {
  Overview: '◎', Bands: '⟳', Map: '🌍', Prayers: '🙏', Activity: '✦'
}
const AMBER = '#C8A96E'

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

function DashboardMap({ bands, points }: { bands: Band[], points: MapPoint[] }) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mode, setMode] = useState<'current' | 'all'>('all')

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined' || !points.length) return
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
        script.onload = renderMap
        document.head.appendChild(script)
      } else { renderMap() }
    }
    const renderMap = () => {
      const L = (window as any).L
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
      const valid = points.filter(p => p.lat && p.lng)
      if (!valid.length || !mapRef.current) return
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
      const markers: any[] = []
      valid.forEach(p => {
        const dot = L.divIcon({ className: '', html: `<div style="width:12px;height:12px;background:${AMBER};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        m.bindPopup(`<div style="font-family:Georgia,serif"><div style="font-family:monospace;font-weight:bold;color:${AMBER}">${p.band_id}</div>${p.user_name ? `<div style="font-size:13px">${p.user_name}</div>` : ''}${p.city || p.country ? `<div style="font-size:12px;color:#8a7c6a">${[p.city, p.country].filter(Boolean).join(', ')}</div>` : ''}${p.prayer ? `<div style="font-size:12px;font-style:italic;border-left:2px solid ${AMBER};padding-left:6px;margin-top:4px">"${p.prayer.slice(0, 80)}"</div>` : ''}</div>`)
        markers.push(m)
      })
      if (markers.length === 1) { map.setView([valid[0].lat, valid[0].lng], 5) }
      else { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2)) }
    }
    loadMap()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [points])

  if (!points.length) return (
    <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#8a7c6a' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
      <div style={{ fontSize: 14 }}>Map will appear once bands are registered with location.</div>
    </div>
  )

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: 15 }}>Band Journey Map</span>
        <span style={{ fontSize: 12, color: '#8a7c6a' }}>{points.length} location{points.length !== 1 ? 's' : ''}</span>
      </div>
      <div ref={mapRef} style={{ height: 320, width: '100%' }} />
    </div>
  )
}

function PrayerRequestModal({ bands, userId, onClose }: { bands: Band[], userId: string, onClose: () => void }) {
  const [bandId, setBandId] = useState(bands[0]?.band_id || '')
  const [message, setMessage] = useState('')
  const [direction, setDirection] = useState<'upline' | 'downline' | 'both'>('both')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // Get registrations for this band to find upline/downline
    const { data: regs } = await supabase
      .from('registrations')
      .select('user_id, user_name, registered_at')
      .eq('band_id', bandId)
      .order('registered_at', { ascending: true })

    if (regs && regs.length > 0) {
      const myIndex = regs.findIndex(r => r.user_id === userId)
      let recipients: string[] = []
      if (direction === 'upline' || direction === 'both') {
        const upline = myIndex > 0 ? regs.slice(0, myIndex).map(r => r.user_id).filter(Boolean) : regs.map(r => r.user_id).filter(Boolean)
        recipients = [...recipients, ...upline]
      }
      if (direction === 'downline' || direction === 'both') {
        const downline = myIndex >= 0 ? regs.slice(myIndex + 1).map(r => r.user_id).filter(Boolean) : []
        recipients = [...recipients, ...downline]
      }
      // Insert prayer request notifications
      if (recipients.length > 0) {
        await supabase.from('chain_prayers').insert(
          recipients.map(recipientId => ({
            band_id: bandId,
            sender_id: userId,
            recipient_id: recipientId,
            message,
            direction,
          }))
        )
      }
    }
    setSending(false)
    setSent(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 420, fontFamily: 'Georgia, serif' }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#2c2416' }}>Prayer Sent</div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 20px', color: '#1a1208' }}>Send a Prayer Request</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Band</label>
              <select value={bandId} onChange={e => setBandId(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #ddd6ca', fontSize: 14, fontFamily: 'Georgia, serif', background: '#fdfaf7', color: '#2c2416' }}>
                {bands.map(b => <option key={b.band_id} value={b.band_id}>{b.band_id}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Send To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['upline', 'downline', 'both'] as const).map(d => (
                  <button key={d} onClick={() => setDirection(d)} style={{ flex: 1, padding: '8px 4px', borderRadius: 7, border: direction === d ? `2px solid ${AMBER}` : '2px solid #e8e1d6', background: direction === d ? '#fdf6e8' : '#fff', color: direction === d ? '#8a6a2a' : '#5a4f42', fontSize: 12, fontWeight: direction === d ? 700 : 400, cursor: 'pointer', fontFamily: 'Georgia, serif', textTransform: 'capitalize' }}>
                    {d === 'upline' ? '↑ Upline' : d === 'downline' ? '↓ Downline' : '↕ Both'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#8a7c6a', marginTop: 6 }}>
                {direction === 'upline' ? 'People who held this band before you' : direction === 'downline' ? 'People who held this band after you' : 'Everyone in this band\'s chain'}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Your Prayer</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your prayer request..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #ddd6ca', fontSize: 14, fontFamily: 'Georgia, serif', background: '#fdfaf7', color: '#2c2416', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #ddd6ca', background: '#fff', color: '#5a4f42', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Cancel</button>
              <button onClick={send} disabled={sending || !message.trim()} style={{ flex: 2, padding: '11px', borderRadius: 8, border: 'none', background: message.trim() ? AMBER : '#ddd', color: '#fff', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                {sending ? 'Sending...' : 'Send Prayer 🙏'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bands, setBands] = useState<Band[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [prayers, setPrayers] = useState<any[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [stats, setStats] = useState({ bands: 0, prayers: 0, registrations: 0, countries: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)
  const [showPrayerModal, setShowPrayerModal] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/signin'; return }
        setUser(user)

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)

        // Bands owned by user
        const { data: bandsData } = await supabase
          .from('bands')
          .select('id, band_id, created_at, registrations(count), chain_prayers(count)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
        const myBands = (bandsData as Band[]) || []
        setBands(myBands)

        if (myBands.length > 0) {
          const bandIds = myBands.map(b => b.band_id)

          // Map points from registrations
          const { data: regsData } = await supabase
            .from('registrations')
            .select('band_id, user_name, city, country, latitude, longitude, prayer')
            .in('band_id', bandIds)
            .not('latitude', 'is', null)
          const pts = (regsData || []).filter(r => r.latitude && r.longitude).map(r => ({
            lat: r.latitude, lng: r.longitude,
            band_id: r.band_id, user_name: r.user_name,
            city: r.city, country: r.country, prayer: r.prayer
          }))
          setMapPoints(pts)

          // Unique countries
          const countries = new Set((regsData || []).map(r => r.country).filter(Boolean))
          const totalPrayers = myBands.reduce((s, b) => s + (b.chain_prayers?.[0]?.count || 0), 0)
          const totalRegs = myBands.reduce((s, b) => s + (b.registrations?.[0]?.count || 0), 0)
          setStats({ bands: myBands.length, prayers: totalPrayers, registrations: totalRegs, countries: countries.size })

          // Prayers
          const { data: prayersData } = await supabase
            .from('registrations')
            .select('band_id, user_name, prayer, city, country, registered_at')
            .in('band_id', bandIds)
            .not('prayer', 'is', null)
            .order('registered_at', { ascending: false })
            .limit(30)
          setPrayers(prayersData || [])

          // Activity feed
          const { data: chainData } = await supabase
            .from('chain_prayers')
            .select('id, band_id, message, created_at')
            .in('band_id', bandIds)
            .order('created_at', { ascending: false })
            .limit(20)
          const { data: regActivity } = await supabase
            .from('registrations')
            .select('id, band_id, city, country, registered_at')
            .in('band_id', bandIds)
            .order('registered_at', { ascending: false })
            .limit(20)
          const combined = [
            ...(chainData || []).map(p => ({ ...p, type: 'prayer' as const, created_at: p.created_at })),
            ...(regActivity || []).map(r => ({ ...r, type: 'registration' as const, location: [r.city, r.country].filter(Boolean).join(', '), created_at: r.registered_at }))
          ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setActivity(combined)
        }
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✝</div>
        <div style={{ fontSize: 15, color: '#8a7c6a' }}>Loading your ministry...</div>
      </div>
    </div>
  )

  const renderContent = () => {
    if (activeTab === 'Overview') return (
      <div>
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: '0 0 4px' }}>Welcome, {displayName} ✝</h1>
          <p style={{ fontSize: 14, color: '#8a7c6a', margin: 0 }}>Here's how far your prayers have traveled.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'My Bands', value: stats.bands, icon: '⟳' },
            { label: 'People Reached', value: stats.registrations, icon: '✦' },
            { label: 'Prayers', value: stats.prayers, icon: '🙏' },
            { label: 'Countries', value: stats.countries, icon: '🌍' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1a1208', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Map preview */}
        <div style={{ marginBottom: 20 }}>
          <DashboardMap bands={bands} points={mapPoints} />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Quick Actions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setShowPrayerModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: AMBER, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
              🙏 Send Prayer Request
            </button>
            <a href="/store" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '10px 16px', fontSize: 14, textDecoration: 'none', color: '#2c2416', fontFamily: 'Georgia, serif' }}>
              📦 Order Bands
            </a>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Recent Activity</div>
          {activity.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '32px 20px', textAlign: 'center', color: '#8a7c6a', fontSize: 14 }}>
              Activity will appear as your bands are registered and prayers are left.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 8).map((item, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: item.type === 'prayer' ? '#7BAE8E18' : `${AMBER}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {item.type === 'prayer' ? '🙏' : '✦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: '#2c2416' }}>
                      {item.type === 'prayer' ? 'Prayer on' : 'Registered'} · <span style={{ color: AMBER }}>{item.band_id}</span>
                    </div>
                    {item.message && <div style={{ fontSize: 13, color: '#6B4C35', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.message}"</div>}
                    {item.location && <div style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>📍 {item.location}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#b8a898', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )

    if (activeTab === 'Bands') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>My Bands</h1>
        <p style={{ fontSize: 14, color: '#8a7c6a', marginBottom: 20 }}>All bands registered to your account.</p>
        {bands.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#8a7c6a' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>No bands yet.</div>
            <a href="/store" style={{ background: AMBER, color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>Order Bands →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bands.map(band => {
              const prayers = band.chain_prayers?.[0]?.count || 0
              const hands = band.registrations?.[0]?.count || 0
              return (
                <a key={band.band_id} href={`/band/${band.band_id}`} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: hands > 0 ? `${AMBER}22` : '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: hands > 0 ? AMBER : '#b8a898', textAlign: 'center', lineHeight: 1.2 }}>
                    {band.band_id.split('-')[0]}<br />{band.band_id.split('-')[1]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2c2416' }}>{band.band_id}</div>
                    <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 2 }}>{hands > 0 ? `${hands} hand${hands !== 1 ? 's' : ''}` : 'Unregistered'} · {prayers} prayer{prayers !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: hands > 0 ? '#7BAE8E' : '#d0c8be', flexShrink: 0 }} />
                </a>
              )
            })}
          </div>
        )}
      </div>
    )

    if (activeTab === 'Map') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Band Journey Map</h1>
        <p style={{ fontSize: 14, color: '#8a7c6a', marginBottom: 20 }}>{mapPoints.length} location{mapPoints.length !== 1 ? 's' : ''} across {stats.countries} countr{stats.countries !== 1 ? 'ies' : 'y'}.</p>
        <DashboardMap bands={bands} points={mapPoints} />
      </div>
    )

    if (activeTab === 'Prayers') return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Prayers</h1>
            <p style={{ fontSize: 14, color: '#8a7c6a', margin: 0 }}>Prayers left on your bands.</p>
          </div>
          <button onClick={() => setShowPrayerModal(true)} style={{ background: AMBER, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            🙏 Send Request
          </button>
        </div>
        {prayers.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#8a7c6a', fontSize: 14 }}>
            Prayers will appear here as people register your bands.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prayers.map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e8e1d6', borderLeft: '3px solid #7BAE8E', borderRadius: 10, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 14, color: '#2c2416' }}>{p.user_name || 'Anonymous'}</span>
                  <span style={{ fontSize: 11, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
                </div>
                <div style={{ fontSize: 15, color: '#3a2f22', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>"{p.prayer}"</div>
                <div style={{ fontSize: 11, color: AMBER, fontFamily: 'monospace' }}>{p.band_id}{p.city || p.country ? ` · ${[p.city, p.country].filter(Boolean).join(', ')}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )

    if (activeTab === 'Activity') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Activity</h1>
        <p style={{ fontSize: 14, color: '#8a7c6a', marginBottom: 20 }}>All events across your bands.</p>
        {activity.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#8a7c6a', fontSize: 14 }}>
            Activity will appear as your bands are used.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activity.map((item, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: item.type === 'prayer' ? '#7BAE8E18' : `${AMBER}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {item.type === 'prayer' ? '🙏' : '✦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#2c2416' }}>
                    {item.type === 'prayer' ? 'Prayer on' : 'Registered'} · <span style={{ color: AMBER }}>{item.band_id}</span>
                  </div>
                  {item.message && <div style={{ fontSize: 13, color: '#6B4C35', fontStyle: 'italic', marginTop: 2 }}>"{item.message}"</div>}
                  {item.location && <div style={{ fontSize: 12, color: '#9B7B62', marginTop: 2 }}>📍 {item.location}</div>}
                </div>
                <div style={{ fontSize: 11, color: '#b8a898', flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f4ef', fontFamily: 'Georgia, serif', color: '#2c2416' }}>
      {/* Top bar */}
      <div style={{ background: AMBER, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>✝ PrayerBands</span>
        <div style={{ flex: 1 }} />
        <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif' }}>Sign out</button>
      </div>

      {/* Desktop tab nav */}
      {!isMobile && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e8e1d6', padding: '0 32px', display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '14px 18px', border: 'none', borderBottom: activeTab === t ? `2px solid ${AMBER}` : '2px solid transparent', background: 'transparent', color: activeTab === t ? AMBER : '#5a4f42', fontSize: 14, fontWeight: activeTab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>{t}</button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ padding: isMobile ? '16px 14px' : '28px 32px', maxWidth: 900, margin: '0 auto', paddingBottom: isMobile ? 80 : 28 }}>
        {renderContent()}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e1d6', display: 'flex', zIndex: 200, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {TABS.map(item => {
            const active = activeTab === item
            return (
              <button key={item} onClick={() => setActiveTab(item)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 2px 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', minWidth: 0 }}>
                {active && <div style={{ position: 'absolute', top: 0, width: 36, height: 3, background: AMBER, borderRadius: '0 0 3px 3px' }} />}
                <span style={{ fontSize: 22, lineHeight: 1 }}>{TAB_ICONS[item]}</span>
                <span style={{ fontSize: 11, color: active ? AMBER : '#b8a898', fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, marginTop: 3 }}>{item}</span>
              </button>
            )
          })}
        </nav>
      )}

      {showPrayerModal && bands.length > 0 && (
        <PrayerRequestModal bands={bands} userId={user?.id} onClose={() => setShowPrayerModal(false)} />
      )}
    </div>
  )
}