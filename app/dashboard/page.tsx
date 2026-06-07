'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import LivingPrayerList from '@/components/LivingPrayerList'
import Logo from '@/components/Logo'
import CirclesSection from '@/components/CirclesSection'

type Band = {
  id: string
  band_id: string
  created_at: string
  registrations: { count: number }[]
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

const TABS = ['Overview', 'Bands', 'Map', 'Prayers', 'Prayer List', 'Activity']
const TAB_ICONS: Record<string, string> = {
  Overview: '◎',
  Bands: '⟳',
  Map: '🌍',
  Prayers: '🙏',
  'Prayer List': '✝',
  Activity: '✦',
}
const AMBER = '#C8A96E'
const ADMIN_EMAIL = 'dshipps941@gmail.com'
const BAND_HEX: Record<string, string> = { sky: '#7BB8D4', sage: '#7BAE8E', amber: '#C8A96E', slate: '#7B8FAE', rose: '#C47B8E', ivory: '#E8DCC8' }
const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#7BAE8E' },
  past_due: { label: 'Past Due', color: '#AE7B7B' },
  paused: { label: 'Paused', color: '#9B7B62' },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

function BoundedMap({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

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
      const valid = points.filter(p => p.lat && p.lng && p.lng > -130 && p.lng < -60 && p.lat > 20 && p.lat < 55)
      if (!valid.length || !mapRef.current) return
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
      })
      mapInstanceRef.current = map
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, noWrap: true }).addTo(map)
      const markers: any[] = []
      valid.forEach(p => {
        const dot = L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:${AMBER};border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5],
        })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px">
          <strong style="color:${AMBER}">${p.band_id}</strong><br/>
          ${p.user_name ? `${p.user_name}<br/>` : ''}
          ${p.city || p.country ? `<span style="color:#8a7c6a">${[p.city, p.country].filter(Boolean).join(', ')}</span>` : ''}
        </div>`)
        markers.push(m)
      })
      if (markers.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 8)
      } else {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.2), { minZoom: 3, maxZoom: 12 })
      }
    }
    loadMap()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
  }, [points])

  return <div ref={mapRef} style={{ height: 280, width: '100%' }} />
}

function ActivePrayerPreview({ currentUserId, readOnly }: { currentUserId: string; readOnly?: boolean }) {
  const [tab, setTab] = useState<'others' | 'mine'>('others')
  const [others, setOthers] = useState<any[]>([])
  const [mine, setMine] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set())
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!currentUserId) return
    Promise.all([
      supabase
        .from('prayer_requests_with_counts')
        .select('*')
        .eq('visibility', 'public')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('prayer_requests_with_counts')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4),
    ]).then(([{ data: o }, { data: m }]) => {
      setOthers(o || [])
      setMine(m || [])
      setLoading(false)
    })
  }, [currentUserId])

  const handlePray = async (requestId: string) => {
    if (prayedIds.has(requestId)) return
    await fetch('/api/prayer-requests/intercede', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, intercessorId: currentUserId }),
    })
    setPrayedIds(prev => new Set([...prev, requestId]))
    setOthers(prev => prev.map(r =>
      r.id === requestId ? { ...r, total_intercessions: (r.total_intercessions || 0) + 1 } : r
    ))
  }

  const handleAnswered = async (requestId: string) => {
    await fetch('/api/prayer-requests/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, userId: currentUserId, testimony: '' }),
    })
    setMine(prev => prev.filter(r => r.id !== requestId))
  }

  const requests = tab === 'others' ? others : mine

  if (loading) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#8a7c6a', fontSize: 14 }}>Loading prayers...</div>
  )

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #f0ece6' }}>
        {(['others', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ flex: 1, padding: '10px', border: 'none', borderBottom: tab === t ? `2px solid ${AMBER}` : '2px solid transparent', background: 'transparent', color: tab === t ? AMBER : '#8a7c6a', fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Georgia, serif' }}
          >
            {t === 'others' ? 'Pray for Others' : 'My Requests'}
            {t === 'others' && others.length > 0 && (
              <span style={{ marginLeft: 5, background: AMBER, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{others.length}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {requests.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8a7c6a', fontSize: 13 }}>
            {tab === 'others' ? 'No active requests from others.' : 'You have no active requests.'}
          </div>
        ) : (
          requests.map((req, i) => (
            <div key={req.id} style={{ padding: '12px 16px', borderBottom: i < requests.length - 1 ? '1px solid #f0ece6' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2416', marginBottom: 2 }}>{req.title}</div>
                {req.body && <div style={{ fontSize: 12, color: '#8a7c6a', fontStyle: 'italic', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.body}</div>}
                <div style={{ fontSize: 11, color: '#b8a898' }}>🙏 {req.total_intercessions || 0} times &middot; {timeAgo(req.created_at)}</div>
              </div>
              {tab === 'others' && !readOnly && (
                <button
                  onClick={() => handlePray(req.id)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', background: prayedIds.has(req.id) ? '#e8f4e8' : `${AMBER}22`, color: prayedIds.has(req.id) ? '#4a8a4a' : AMBER, fontSize: 12, fontWeight: 600, cursor: prayedIds.has(req.id) ? 'default' : 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}
                >
                  {prayedIds.has(req.id) ? '✓ Prayed' : '🙏 Pray'}
                </button>
              )}
              {tab === 'mine' && !readOnly && (
                <button
                  onClick={() => handleAnswered(req.id)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#e8f4e8', color: '#4a8a4a', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}
                >
                  ✨ Answered
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0ece6', textAlign: 'right' }}>
        <span style={{ fontSize: 12, color: AMBER, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
          View all in Prayer List &rarr;
        </span>
      </div>
    </div>
  )
}

function DashboardMap({ bands, points }: { bands: Band[]; points: MapPoint[] }) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

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
        const dot = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;background:${AMBER};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        })
        const m = L.marker([p.lat, p.lng], { icon: dot }).addTo(map)
        m.bindPopup(`<div style="font-family:Georgia,serif">
          <div style="font-family:monospace;font-weight:bold;color:${AMBER}">${p.band_id}</div>
          ${p.user_name ? `<div style="font-size:13px">${p.user_name}</div>` : ''}
          ${p.city || p.country ? `<div style="font-size:12px;color:#8a7c6a">${[p.city, p.country].filter(Boolean).join(', ')}</div>` : ''}
          ${p.prayer ? `<div style="font-size:12px;font-style:italic;border-left:2px solid ${AMBER};padding-left:6px;margin-top:4px">"${p.prayer.slice(0, 80)}"</div>` : ''}
        </div>`)
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

function PrayerRequestModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [step, setStep] = useState<'loading' | 'compose' | 'sending' | 'sent' | 'error'>('loading')
  const [network, setNetwork] = useState<{ email: string; name: string; relationship: string }[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [sentCount, setSentCount] = useState(0)

  useEffect(() => {
    fetch('/api/prayer-network?uid=' + userId)
      .then(r => r.json())
      .then(d => { setNetwork(d.network || []); setStep('compose') })
      .catch(() => { setErrorMsg('Could not load your network.'); setStep('error') })
  }, [userId])

  function toggleExclude(email: string) {
    setExcluded(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])
  }

  async function send() {
    if (!message.trim()) return
    setStep('sending')
    try {
      const res = await fetch('/api/request-prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prayerText: message, anonymous, excludedEmails: excluded }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSentCount(data.sent || 0)
      setStep('sent')
      setTimeout(onClose, 2500)
    } catch (err: any) {
      setErrorMsg(err.message)
      setStep('error')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '28px 24px', width: '100%', maxWidth: 480, fontFamily: 'Georgia, serif', maxHeight: '90vh', overflowY: 'auto' }}>
        {step === 'loading' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div><div style={{ color: '#8a7c6a' }}>Loading your prayer network...</div></div>}
        {step === 'sending' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 32, marginBottom: 12 }}>✝</div><div style={{ color: '#8a7c6a' }}>Sending your prayer request...</div></div>}
        {step === 'sent' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div><div style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1208', marginBottom: 8 }}>Prayer Request Sent</div><div style={{ fontSize: 14, color: '#8a7c6a' }}>{sentCount} {sentCount === 1 ? 'person is' : 'people are'} standing with you in prayer. ✝</div></div>}
        {step === 'error' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ color: '#c0392b', marginBottom: 16 }}>{errorMsg}</div><button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Close</button></div>}
        {step === 'compose' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0, color: '#1a1208' }}>🙏 Request Prayer</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8a7c6a' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }}>Your Prayer Request</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Share what's on your heart..." rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd6ca', fontSize: 15, fontFamily: 'Georgia, serif', background: '#fdfaf7', color: '#2c2416', resize: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: '#f7f4ef', borderRadius: 8 }}>
              <input type="checkbox" id="anon" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="anon" style={{ fontSize: 14, color: '#5a4f42', cursor: 'pointer' }}>Send anonymously</label>
            </div>
            {network.length === 0 ? (
              <div style={{ background: '#f7f4ef', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: '#8a7c6a', textAlign: 'center' }}>No one in your prayer network yet. Share bands with people to build your network.</div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#7a6c5a', letterSpacing: 0.5, textTransform: 'uppercase' as const, display: 'block', marginBottom: 8 }}>Send To ({network.length - excluded.length} of {network.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {network.map(person => {
                    const isExcluded = excluded.includes(person.email)
                    return (
                      <div key={person.email} onClick={() => toggleExclude(person.email)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isExcluded ? '#f7f4ef' : '#f0f7f3', borderRadius: 8, cursor: 'pointer', border: `1px solid ${isExcluded ? '#e8e1d6' : '#c8e6d4'}`, opacity: isExcluded ? 0.6 : 1 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isExcluded ? '#b8a898' : '#1a6b4a'}`, background: isExcluded ? 'transparent' : '#1a6b4a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {!isExcluded && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>{person.name}</div>
                          <div style={{ fontSize: 12, color: '#8a7c6a' }}>{person.relationship}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #ddd6ca', background: '#fff', color: '#5a4f42', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Cancel</button>
              <button onClick={send} disabled={!message.trim()} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: message.trim() ? AMBER : '#ddd', color: '#fff', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>Send Prayer Request ✝</button>
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
  const [subscription, setSubscription] = useState<any>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewAsId, setViewAsId] = useState<string | null>(null)
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

        // Admin "view as" mode: when an admin opens /dashboard?viewAs=<userId>,
        // load that user's data instead of their own. Ignored for non-admins.
        const requestedViewAs = new URLSearchParams(window.location.search).get('viewAs')
        const viewAs = requestedViewAs && user.email === ADMIN_EMAIL ? requestedViewAs : null
        setViewAsId(viewAs)
        const effectiveId = viewAs || user.id

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', effectiveId).single()
        setProfile(prof)

        // Active subscription (read through an API route so it works in admin
        // view-as mode, where owner-only RLS would otherwise hide it).
        fetch('/api/my-subscription' + (viewAs ? `?viewAs=${viewAs}` : ''))
          .then(r => r.json())
          .then(d => {
            setSubscription(d.subscription)
            // In view-as mode the direct profiles read is RLS-blocked; use the
            // service-key profile from the route instead.
            if (d.profile) setProfile(d.profile)
          })
          .catch(() => {})
        const { data: bandsData } = await supabase
          .from('bands')
          .select('id, band_id, created_at, registrations(count)')
          .eq('owner_id', effectiveId)
          .order('created_at', { ascending: false })
        const myBands = (bandsData as Band[]) || []
        setBands(myBands)
        if (myBands.length > 0) {
          const bandIds = myBands.map(b => b.band_id)
          const { data: regsData } = await supabase
            .from('registrations')
            .select('band_id, user_name, city, country, latitude, longitude, prayer')
            .in('band_id', bandIds)
            .not('latitude', 'is', null)
          const pts = (regsData || []).filter(r => r.latitude && r.longitude).map(r => ({
            lat: r.latitude, lng: r.longitude, band_id: r.band_id,
            user_name: r.user_name, city: r.city, country: r.country, prayer: r.prayer,
          }))
          setMapPoints(pts)
          const countries = new Set((regsData || []).map(r => r.country).filter(Boolean))
          const totalRegs = myBands.reduce((s, b) => s + (b.registrations?.[0]?.count || 0), 0)
          // Prayers = prayers people left when registering this owner's bands
          // (the same data the Prayers tab lists), counted across all of them.
          const { count: prayerCount } = await supabase
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .in('band_id', bandIds)
            .not('prayer', 'is', null)
          setStats({ bands: myBands.length, prayers: prayerCount || 0, registrations: totalRegs, countries: countries.size })
          const { data: prayersData } = await supabase
            .from('registrations')
            .select('band_id, user_name, prayer, city, country, registered_at')
            .in('band_id', bandIds)
            .not('prayer', 'is', null)
            .order('registered_at', { ascending: false })
            .limit(30)
          setPrayers(prayersData || [])
          const { data: chainData } = await supabase
            .from('chain_prayers')
            .select('id, band_id, prayer_text, sent_at')
            .in('band_id', bandIds)
            .order('sent_at', { ascending: false })
            .limit(20)
          const { data: regActivity } = await supabase
            .from('registrations')
            .select('id, band_id, city, country, registered_at')
            .in('band_id', bandIds)
            .order('registered_at', { ascending: false })
            .limit(20)
          const combined = [
            ...(chainData || []).map(p => ({ ...p, type: 'prayer' as const, message: p.prayer_text, created_at: p.sent_at })),
            ...(regActivity || []).map(r => ({ ...r, type: 'registration' as const, location: [r.city, r.country].filter(Boolean).join(', '), created_at: r.registered_at })),
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

  const isViewingAs = !!viewAsId
  const effectiveId = viewAsId || user?.id

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
    } catch {}
    setPortalLoading(false)
  }
  const displayName = profile?.full_name
    || (isViewingAs ? profile?.email?.split('@')[0] : (user?.user_metadata?.full_name || user?.email?.split('@')[0]))
    || 'Friend'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div><div style={{ fontSize: 36, marginBottom: 12 }}>✝</div><div style={{ fontSize: 15, color: '#8a7c6a' }}>Loading your ministry...</div></div>
    </div>
  )

  const renderContent = () => {
    if (activeTab === 'Overview') return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: '0 0 4px' }}>Welcome, {displayName} ✝</h1>
            <p style={{ fontSize: 14, color: '#8a7c6a', margin: 0 }}>Here's how far your prayers have traveled.</p>
          </div>
          {!isViewingAs && (
            <button onClick={() => setShowPrayerModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: AMBER, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              🙏 Send Prayer Request
            </button>
          )}
        </div>

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

        {subscription && (() => {
          const plan = subscription.subscription_plans || {}
          const months = plan.interval_months || 1
          const cadence = months > 1 ? `Every ${months} months` : 'Every month'
          const bands = plan.bands_per_cycle || 1
          const hex = BAND_HEX[subscription.band_color] || AMBER
          // A subscription cancelled "at period end" stays active until the
          // period closes — show the scheduled end instead of a plain "Active".
          const cancelScheduled = !!subscription.cancel_at_period_end
          const cancelDateLong = subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null
          const cancelDateShort = subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null
          const badge = cancelScheduled
            ? { label: cancelDateShort ? `Cancels ${cancelDateShort}` : 'Cancelling', color: '#C0853E' }
            : (SUB_STATUS[subscription.status] || { label: subscription.status, color: '#9B7B62' })
          const nextShip = subscription.next_ship_date
            ? new Date(subscription.next_ship_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : '—'
          return (
            <div style={{ background: 'linear-gradient(135deg, #FBF2DC 0%, #FFFCF4 60%)', border: '1px solid #EAD9AE', borderLeft: `4px solid ${hex}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20, boxShadow: '0 4px 18px rgba(184,150,74,0.13)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🔁</span>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#1a1208' }}>{plan.name || 'Your Subscription'}</span>
                  <span style={{ background: `${badge.color}1f`, color: badge.color, border: `1px solid ${badge.color}55`, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 100 }}>{badge.label}</span>
                </div>
                {!isViewingAs && (
                  <button onClick={openBillingPortal} disabled={portalLoading} style={{ fontSize: 12, color: AMBER, background: 'none', border: '1px solid ' + AMBER, borderRadius: 8, padding: '6px 14px', fontWeight: 'bold', cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'Georgia, serif' }}>
                    {portalLoading ? 'Opening…' : 'Manage'}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#8a7c6a', marginBottom: 2 }}>Cadence</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>{cadence}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8a7c6a', marginBottom: 2 }}>Bands / shipment</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416' }}>{bands}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8a7c6a', marginBottom: 2 }}>Band color</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2416', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, boxShadow: `0 1px 4px ${hex}88`, flexShrink: 0 }} />
                    {subscription.band_color}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#8a7c6a', marginBottom: 2 }}>{cancelScheduled ? 'Cancels on' : 'Next ship date'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: cancelScheduled ? '#C0853E' : '#2c2416' }}>{cancelScheduled ? (cancelDateLong || '—') : nextShip}</div>
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>Band Journey Map</span>
              <span style={{ fontSize: 12, color: '#8a7c6a' }}>{mapPoints.length} location{mapPoints.length !== 1 ? 's' : ''}</span>
            </div>
            {mapPoints.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a7c6a' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
                <div style={{ fontSize: 14 }}>Map will appear once bands are registered with location.</div>
              </div>
            ) : (
              <BoundedMap points={mapPoints} />
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: 15 }}>Active Prayer Requests</span>
              <button onClick={() => setActiveTab('Prayer List')} style={{ fontSize: 12, color: AMBER, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>View all &rarr;</button>
            </div>
            <ActivePrayerPreview currentUserId={effectiveId} readOnly={isViewingAs} />
          </div>
        </div>

        <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '10px 16px', fontSize: 14, textDecoration: 'none', color: '#2c2416', fontFamily: 'Georgia, serif' }}>
            📦 Order Bands
          </a>
          <a href="/subscribe" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: AMBER, border: '1px solid ' + AMBER, borderRadius: 10, padding: '10px 16px', fontSize: 14, textDecoration: 'none', color: '#fff', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
            🔁 Subscribe
          </a>
        </div>

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
                      {item.type === 'prayer' ? 'Prayer on' : 'Registered'} &middot; <span style={{ color: AMBER }}>{item.band_id}</span>
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
            <a href="/store" style={{ background: AMBER, color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>Order Bands &rarr;</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bands.map(band => {
              const hands = band.registrations?.[0]?.count || 0
              return (
                <a key={band.band_id} href={`/band/${band.band_id}`} style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: hands > 0 ? `${AMBER}22` : '#f0ebe4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: hands > 0 ? AMBER : '#b8a898', textAlign: 'center', lineHeight: 1.2 }}>
                    {band.band_id.split('-')[0]}<br />{band.band_id.split('-')[1]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, color: '#2c2416' }}>{band.band_id}</div>
                    <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 2 }}>
                      {hands > 0 ? `${hands} hand${hands !== 1 ? 's' : ''}` : 'Unregistered'} &middot; 0 prayers
                    </div>
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
          {!isViewingAs && (
            <button onClick={() => setShowPrayerModal(true)} style={{ background: AMBER, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              🙏 Send Request
            </button>
          )}
        </div>
        {!isViewingAs && <CirclesSection userId={user?.id} />}
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
                <div style={{ fontSize: 11, color: AMBER, fontFamily: 'monospace' }}>
                  {p.band_id}{p.city || p.country ? ` · ${[p.city, p.country].filter(Boolean).join(', ')}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )

    if (activeTab === 'Prayer List') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>Living Prayer List</h1>
        <p style={{ fontSize: 14, color: '#8a7c6a', marginBottom: 20 }}>Pray for others. Share your own requests. Celebrate answered prayer.</p>
        <LivingPrayerList currentUserId={effectiveId} readOnly={isViewingAs} />
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
                    {item.type === 'prayer' ? 'Prayer on' : 'Registered'} &middot; <span style={{ color: AMBER }}>{item.band_id}</span>
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
      <div style={{ background: AMBER, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 'bold', letterSpacing: 1, color: '#fff', textDecoration: 'none', cursor: 'pointer' }}><Logo size={26} color="#fff" />PrayerBands</a>
        <div style={{ flex: 1 }} />
        <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Georgia, serif' }}>Sign out</button>
      </div>

      {isViewingAs && (
        <div style={{ background: '#2C1A0E', color: '#FDFAF5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 16px', fontSize: 13, flexWrap: 'wrap', position: 'sticky', top: 56, zIndex: 99 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: '#7B8FAE', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100 }}>Admin View</span>
            Viewing <strong>{displayName}</strong>{profile?.email ? ` (${profile.email})` : ''} — read only
          </span>
          <a href="/admin" style={{ color: '#C8A96E', textDecoration: 'underline', fontWeight: 700, whiteSpace: 'nowrap' }}>Exit to Admin →</a>
        </div>
      )}

      {!isMobile && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e8e1d6', padding: '0 32px', display: 'flex', gap: 4, justifyContent: 'center' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '14px 18px', border: 'none', borderBottom: activeTab === t ? `2px solid ${AMBER}` : '2px solid transparent', background: 'transparent', color: activeTab === t ? AMBER : '#5a4f42', fontSize: 14, fontWeight: activeTab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>{t}</button>
          ))}
        </div>
      )}

      <div style={{ padding: isMobile ? '16px 14px' : '28px 32px', maxWidth: 900, margin: '0 auto', paddingBottom: isMobile ? 80 : 28 }}>
        {renderContent()}
      </div>

      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8e1d6', display: 'flex', zIndex: 200, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {TABS.map(item => {
            const active = activeTab === item
            return (
              <button key={item} onClick={() => setActiveTab(item)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 2px 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', minWidth: 0 }}>
                {active && <div style={{ position: 'absolute', top: 0, width: 36, height: 3, background: AMBER, borderRadius: '0 0 3px 3px' }} />}
                <span style={{ fontSize: 16, lineHeight: 1 }}>{TAB_ICONS[item]}</span>
                <span style={{ fontSize: 10, color: active ? AMBER : '#b8a898', fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, marginTop: 3 }}>{item}</span>
              </button>
            )
          })}
        </nav>
      )}

      {showPrayerModal && !isViewingAs && <PrayerRequestModal userId={user?.id} onClose={() => setShowPrayerModal(false)} />}
    </div>
  )
}
