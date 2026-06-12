'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'

// Brand font import
if (typeof document !== 'undefined' && !document.getElementById('pb-brand-fonts')) {
  const link = document.createElement('link')
  link.id = 'pb-brand-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap'
  document.head.appendChild(link)
}

// Brand palette
const CREAM_BG = '#F6F1E4'
const CARD_BG = '#FFFDF8'
const NAVY = '#0A1628'
const NAVY_HEADING = '#15223B'
const BODY_TEXT = '#2A3344'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const SILVER_BG = '#ECEEF1'
const SILVER_BORDER = 'rgba(92,101,115,0.20)'
const NAVY_BORDER = 'rgba(10,22,40,0.12)'
const SECONDARY_TEXT = '#5C6573'

const NAV = ['Overview', 'Bands', 'Prayer Wall', 'Lineage', 'Orders', 'Settings']
const NAV_ICONS: Record<string, string> = {
  Overview: '◎', Bands: '⟳', 'Prayer Wall': '🙏', Lineage: '✦', Orders: '📦', Settings: '⚙'
}

// Preset theme colors a ministry can pick (plus a custom picker).
const PRESET_COLORS = ['#1a6b4a', '#2b6cb0', '#6b46c1', '#b83280', '#c05621', '#b8964a', '#2c7a7b', '#9b2c2c']

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
        m.bindPopup('<div style="font-family:Georgia,serif"><div style="font-family:monospace;font-weight:bold;color:' + green + '">' + p.bandId + '</div>' + (p.name ? '<div style="font-size:13px">' + p.name + '</div>' : '') + (p.city || p.country ? '<div style="font-size:12px;color:#5C6573">' + [p.city, p.country].filter(Boolean).join(', ') + '</div>' : '') + (p.prayer ? '<div style="font-size:12px;font-style:italic;border-left:2px solid ' + green + ';padding-left:6px;margin-top:4px">"' + p.prayer.slice(0, 80) + '"</div>' : '') + '</div>')
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
    <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Ministry Map</span>
        <div style={{ display: 'flex', gap: 4, background: SILVER_BG, borderRadius: 6, padding: 3 }}>
          <button onClick={() => setMode('current')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: mode === 'current' ? GOLD : 'transparent', color: mode === 'current' ? NAVY : SECONDARY_TEXT, fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontWeight: mode === 'current' ? 700 : 400, letterSpacing: '0.04em' }}>Current ({currentCount})</button>
          <button onClick={() => setMode('all')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: mode === 'all' ? GOLD : 'transparent', color: mode === 'all' ? NAVY : SECONDARY_TEXT, fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontWeight: mode === 'all' ? 700 : 400, letterSpacing: '0.04em' }}>All ({allCount})</button>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 300, width: '100%' }} />
    </div>
  )
}

function TopBar({ org, green }: { org: any, green: string }) {
  return (
    <div style={{ background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 12, boxShadow: '0 2px 12px rgba(10,22,40,0.25)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', color: GOLD, textDecoration: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif' }}><Logo size={26} color={GOLD} />Prayer Bands</a>
      <span style={{ background: 'rgba(200,169,110,0.12)', border: `1px solid rgba(200,169,110,0.25)`, borderRadius: 4, padding: '2px 8px', fontSize: 11, letterSpacing: 0.5, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, color: GOLD }}>{org?.subdomain}.prayerbands.com</span>
      <div style={{ flex: 1 }} />
      <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(200,169,110,0.12)', border: `1px solid rgba(200,169,110,0.25)`, color: GOLD, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Sign out</button>
    </div>
  )
}

function Sidebar({ org, tab, setTab, green }: { org: any, tab: string, setTab: (t: string) => void, green: string }) {
  return (
    <div style={{ width: 290, background: CARD_BG, borderRight: `1px solid ${NAVY_BORDER}`, padding: '28px 0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto', boxShadow: '2px 0 8px rgba(10,22,40,0.04)' }}>
      <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${SILVER_BORDER}` }}>
        {org?.logo_url && <img src={org.logo_url} alt={org?.name} style={{ width: 250, height: 125, objectFit: 'contain', display: 'block', marginBottom: 12, borderRadius: 8, border: `1px solid ${SILVER_BORDER}`, background: '#fff', padding: 6 }} />}
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY_HEADING, lineHeight: 1.3, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{org?.name}</div>
        <div style={{ fontSize: 12, color: SECONDARY_TEXT, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{org?.location}</div>
        <div style={{ display: 'inline-block', marginTop: 8, background: `${GOLD}18`, color: GOLD_TEXT, fontSize: 11, padding: '2px 8px', borderRadius: 12, fontFamily: 'monospace', letterSpacing: 0.5, border: `1px solid ${GOLD}44` }}>{org?.prefix}-XXXXX</div>
      </div>
      <div style={{ padding: '12px 0' }}>
        {NAV.map(item => (
          <div key={item} onClick={() => setTab(item)} style={{ padding: '10px 24px', cursor: 'pointer', fontSize: 11, borderLeft: tab === item ? `3px solid ${GOLD}` : '3px solid transparent', color: tab === item ? GOLD_TEXT : SECONDARY_TEXT, background: tab === item ? `${GOLD}0d` : 'transparent', fontWeight: tab === item ? 700 : 400, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{item}</div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ margin: 16, background: `linear-gradient(135deg, ${NAVY} 0%, #132544 100%)`, color: '#fff', borderRadius: 8, padding: '12px 14px', fontSize: 12, border: `1px solid ${GOLD}33` }}>
        <div style={{ fontWeight: 700, marginBottom: 2, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em', color: GOLD, fontSize: 11 }}>{org?.plan || 'Ministry'} Plan</div>
        <div style={{ opacity: 0.7, fontFamily: 'Inter, sans-serif', fontSize: 11 }}>{org?.created_at ? 'Since ' + new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</div>
      </div>
      {org?.website && (
        <a
          href={/^https?:\/\//i.test(org.website) ? org.website : `https://${org.website}`}
          target="_blank"
          rel="noopener noreferrer"
          title={org.website}
          style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 16px 16px', padding: '9px 12px', fontSize: 12, color: GOLD_TEXT, textDecoration: 'none', fontFamily: 'Inter, sans-serif', background: SILVER_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 8 }}
        >
          <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>🌐</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}</span>
        </a>
      )}
    </div>
  )
}

function BottomNav({ tab, setTab, green }: { tab: string, setTab: (t: string) => void, green: string }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: NAVY, borderTop: `1px solid rgba(200,169,110,0.2)`, display: 'flex', zIndex: 200, boxShadow: '0 -2px 12px rgba(10,22,40,0.2)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {NAV.map(item => {
        const active = tab === item
        return (
          <button key={item} onClick={() => setTab(item)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 2px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', minWidth: 0 }}>
            {active && <div style={{ position: 'absolute', top: 0, width: 28, height: 2, background: GOLD, borderRadius: '0 0 2px 2px' }} />}
            <span style={{ fontSize: 16, lineHeight: 1 }}>{NAV_ICONS[item]}</span>
            <span style={{ fontSize: 9, color: active ? GOLD : 'rgba(200,169,110,0.45)', fontFamily: 'Cinzel, serif', fontWeight: active ? 700 : 400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', paddingInline: 2, letterSpacing: '0.03em' }}>{item}</span>
          </button>
        )
      })}
    </nav>
  )
}

function OrgDashboardInner() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams?.get('tab') || 'Overview')
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
  const [isMobile, setIsMobile] = useState(false)
  const [settings, setSettings] = useState({ name: '', location: '', website: '', color: '#1a6b4a' })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/signin'; return }
        const profileRes = await fetch('/api/org-profile?uid=' + user.id)
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
        // Only prayers left on THIS org's bands (band ids are prefixed, e.g. FBC-XXXXX).
        const prayerQuery = supabase.from('registrations').select('band_id, user_name, prayer, city, country, registered_at').not('prayer', 'is', null)
        if (orgData?.prefix) prayerQuery.ilike('band_id', `${orgData.prefix}-%`)
        const { data: prayersData } = await prayerQuery.order('registered_at', { ascending: false }).limit(20)
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

  // Keep the Settings form in sync with the loaded org.
  useEffect(() => {
    if (org) setSettings({ name: org.name || '', location: org.location || '', website: org.website || '', color: org.color || '#1a6b4a' })
  }, [org])

  // ── Team members (multi-user orgs) ──
  const loadTeam = async () => {
    setTeamLoading(true)
    try {
      const res = await fetch('/api/org-members')
      const data = await res.json()
      if (res.ok) { setMembers(data.members || []); setInvites(data.invites || []) }
    } catch { /* ignore */ } finally { setTeamLoading(false) }
  }

  // Load the team roster the first time the Settings tab is opened.
  useEffect(() => {
    if (tab === 'Settings' && orgId && members.length === 0) loadTeam()
  }, [tab, orgId])

  const sendInvite = async () => {
    setInviteSending(true); setInviteMsg('')
    try {
      const res = await fetch('/api/org-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, display_name: inviteName }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteEmail(''); setInviteName(''); setInviteMsg('sent')
        setInvites(prev => [data.invite, ...prev.filter(i => i.id !== data.invite.id)])
      } else {
        setInviteMsg(data.error || 'Could not send the invite.')
      }
    } catch {
      setInviteMsg('Network error. Please try again.')
    } finally {
      setInviteSending(false)
    }
  }

  const revokeInvite = async (id: string) => {
    setInvites(prev => prev.filter(i => i.id !== id))
    try {
      await fetch('/api/org-invite?id=' + encodeURIComponent(id), { method: 'DELETE' })
    } catch { /* optimistic; ignore */ }
  }

  const green = org?.color || '#1a6b4a'

  const saveSettings = async () => {
    setSettingsSaving(true); setSettingsMsg('')
    try {
      const res = await fetch('/api/update-org-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (res.ok && data.org) { setOrg(data.org); setSettingsMsg('saved') }
      else setSettingsMsg(data.error || 'Could not save. Please try again.')
    } catch {
      setSettingsMsg('Network error. Please try again.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoUploading(true); setSettingsMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-org-logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && data.org) { setOrg(data.org); setSettingsMsg('saved') }
      else setSettingsMsg(data.error || 'Could not upload logo.')
    } catch {
      setSettingsMsg('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  const removeLogo = async () => {
    setLogoUploading(true); setSettingsMsg('')
    try {
      const res = await fetch('/api/update-org-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: null }),
      })
      const data = await res.json()
      if (res.ok && data.org) setOrg(data.org)
      else setSettingsMsg(data.error || 'Could not remove logo.')
    } catch {
      setSettingsMsg('Network error. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }
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

  const labelStyle = { fontSize: 11, fontWeight: 700 as const, color: GOLD_TEXT, display: 'block' as const, marginBottom: 6, letterSpacing: '0.06em' as const, textTransform: 'uppercase' as const, fontFamily: 'Cinzel, serif' }
  const settingInput = { width: '100%', border: `1px solid ${SILVER_BORDER}`, borderRadius: 6, padding: '10px 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', background: CARD_BG, color: BODY_TEXT, boxSizing: 'border-box' as const, outline: 'none' }

  if (loading) return (
    <div style={{ color: SECONDARY_TEXT, fontSize: 15, paddingTop: 80, textAlign: 'center', fontFamily: 'Cinzel, serif', background: CREAM_BG, minHeight: '100vh' }}>
      <div style={{ fontSize: 32, marginBottom: 12, color: GOLD }}>✝</div>
      Loading your ministry...
    </div>
  )
  if (!org) return <div style={{ color: SECONDARY_TEXT, fontSize: 15, paddingTop: 80, textAlign: 'center', fontFamily: 'Inter, sans-serif', background: CREAM_BG, minHeight: '100vh' }}>No organization found. <a href="/signin" style={{ color: GOLD_TEXT }}>Sign in again</a></div>

  const renderContent = () => {
    if (tab === 'Overview') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px', maxWidth: 1100 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Ministry Dashboard</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Every band is a prayer in motion. Here's how far {org?.name}'s love has traveled.</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
          {[{ label: 'Total Bands', value: stats?.total_bands || 0, icon: '⟳' }, { label: 'Active Bands', value: stats?.active_bands || 0, icon: '✦' }, { label: 'Prayers Offered', value: stats?.total_prayers || 0, icon: '◎' }, { label: 'Countries', value: stats?.countries || 0, icon: '◈' }].map(s => (
            <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: isMobile ? '14px 12px' : '20px', boxShadow: '0 1px 4px rgba(10,22,40,0.06)' }}>
              <div style={{ fontSize: 20, marginBottom: 4, color: GOLD_TEXT }}>{s.icon}</div>
              <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, color: NAVY_HEADING, lineHeight: 1, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{Number(s.value).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 4, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <OrgMap orgId={org?.id} green={green} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 20 }}>
          <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Recent Bands</span>
              <button onClick={() => setTab('Bands')} style={{ fontSize: 11, color: GOLD_TEXT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>View all →</button>
            </div>
            {bands.slice(0, 6).map((b, i) => {
              const sc = statusColor(b.status)
              return (
                <div key={b.band_id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, borderBottom: i < 5 ? `1px solid ${SILVER_BORDER}` : 'none' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD_TEXT, fontWeight: 'bold', flex: 1 }}>{b.band_id}</div>
                  <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' as const }}>{b.status}</div>
                </div>
              )
            })}
            {bands.length === 0 && <div style={{ padding: '24px 16px', color: SECONDARY_TEXT, fontSize: 13, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No bands yet.</div>}
          </div>
          <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Recent Prayers</span>
              <button onClick={() => setTab('Prayer Wall')} style={{ fontSize: 11, color: GOLD_TEXT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>View all →</button>
            </div>
            {prayers.slice(0, 4).map((p, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < 3 ? `1px solid ${SILVER_BORDER}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{p.user_name}</span>
                  <span style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{timeAgo(p.registered_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: BODY_TEXT, lineHeight: 1.5, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>"{p.prayer}"</div>
                <div style={{ fontSize: 10, color: GOLD_TEXT, fontFamily: 'monospace', marginTop: 4 }}>{p.band_id}</div>
              </div>
            ))}
            {prayers.length === 0 && <div style={{ padding: '24px 16px', color: SECONDARY_TEXT, fontSize: 13, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No prayers yet.</div>}
          </div>
        </div>
      </div>
    )

    if (tab === 'Bands') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Your Bands</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>All bands under the {org?.prefix} prefix.</p>
        <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, background: SILVER_BG, display: 'flex', gap: 12 }}>
            {['Band ID', 'Status'].map(h => <div key={h} style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, letterSpacing: '0.06em', textTransform: 'uppercase' as const, flex: 1, fontFamily: 'Cinzel, serif' }}>{h}</div>)}
          </div>
          {bands.map((b, i) => {
            const sc = statusColor(b.status)
            return (
              <div key={b.band_id} style={{ display: 'flex', gap: 12, padding: '13px 16px', alignItems: 'center', borderBottom: i < bands.length - 1 ? `1px solid ${SILVER_BORDER}` : 'none' }}>
                <a href={'/band/' + b.band_id} style={{ fontFamily: 'monospace', fontSize: 13, color: GOLD_TEXT, fontWeight: 'bold', textDecoration: 'none', flex: 1 }}>{b.band_id}</a>
                <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' as const }}>{b.status}</div>
              </div>
            )
          })}
          {bands.length === 0 && <div style={{ padding: '40px 16px', color: SECONDARY_TEXT, fontSize: 14, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No bands yet. ✝</div>}
        </div>
      </div>
    )

    if (tab === 'Prayer Wall') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Prayer Wall</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Every prayer left by someone holding a {org?.prefix} band.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {prayers.map((p, i) => (
            <div key={i} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: '16px', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: NAVY_HEADING, fontFamily: 'Inter, sans-serif' }}>{p.user_name}</span>
                <span style={{ fontSize: 12, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{timeAgo(p.registered_at)}</span>
              </div>
              <div style={{ fontSize: 15, color: BODY_TEXT, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>"{p.prayer}"</div>
              <div style={{ fontSize: 11, color: GOLD_TEXT, fontFamily: 'monospace' }}>{p.band_id} · {[p.city, p.country].filter(Boolean).join(', ')}</div>
            </div>
          ))}
          {prayers.length === 0 && <div style={{ padding: '40px 16px', color: SECONDARY_TEXT, fontSize: 14, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Prayers will appear here as bands are registered. ✝</div>}
        </div>
      </div>
    )

    if (tab === 'Lineage') return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Lineage</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Track how far each {org?.prefix} band has traveled.</p>
        {lineageLoading && <div style={{ color: SECONDARY_TEXT, textAlign: 'center', padding: 40, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>Loading lineage... ✝</div>}
        {!lineageLoading && lineage.length === 0 && (
          <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: 40, textAlign: 'center', color: SECONDARY_TEXT, boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: GOLD }}>✝</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>No registered bands yet</div>
            <div style={{ fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Lineage data will appear once bands are registered.</div>
          </div>
        )}
        {!lineageLoading && lineage.length > 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
              {[{ label: 'Bands Traveling', value: lineage.length }, { label: 'Total Holders', value: lineage.reduce((s: number, b: any) => s + Number(b.total_holders), 0) }, { label: 'Countries', value: lineage.reduce((s: number, b: any) => s + Number(b.countries), 0) }].map(s => (
                <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: isMobile ? '14px 10px' : '20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(10,22,40,0.06)' }}>
                  <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 4, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lineage.map((b: any) => (
                <div key={b.band_id} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                  <div onClick={() => setExpandedBand(expandedBand === b.band_id ? null : b.band_id)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: 12 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: GOLD_TEXT, fontWeight: 'bold', minWidth: 90 }}>{b.band_id}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: BODY_TEXT, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>{b.total_holders} people · {b.countries} {Number(b.countries) === 1 ? 'country' : 'countries'} · {b.prayers} prayers</div>
                      <div style={{ height: 5, background: SILVER_BG, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: Math.min(100, (Number(b.total_holders) / Math.max(...lineage.map((x: any) => Number(x.total_holders)))) * 100) + '%', background: `linear-gradient(90deg, ${GOLD}, #E2C98A)`, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: SECONDARY_TEXT, transform: expandedBand === b.band_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</div>
                  </div>
                  {expandedBand === b.band_id && (
                    <div style={{ borderTop: `1px solid ${SILVER_BORDER}`, padding: '16px', background: SILVER_BG }}>
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
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Order Bands</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>All bands ship laser-engraved with NFC chips and your {org?.prefix} prefix.</p>
        <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 12, padding: isMobile ? '16px 14px' : '28px', marginBottom: 20, maxWidth: isMobile ? '100%' : 520, boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>New Band Order</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>QUANTITY</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {[50, 100, 250, 500, 1000].map(qty => (
                <button key={qty} onClick={() => setOrderQty(qty)} style={{ padding: '8px 14px', borderRadius: 6, border: orderQty === qty ? `2px solid ${GOLD}` : `2px solid ${SILVER_BORDER}`, background: orderQty === qty ? `${GOLD}18` : CARD_BG, color: orderQty === qty ? GOLD_TEXT : BODY_TEXT, fontWeight: orderQty === qty ? 700 : 400, cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>{qty}</button>
              ))}
            </div>
          </div>
          <div style={{ background: SILVER_BG, borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12, color: GOLD_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Volume Pricing</div>
            {[{ min: 50, max: 99, price: 4.50 }, { min: 100, max: 249, price: 4.20 }, { min: 250, max: 499, price: 4.00 }, { min: 500, max: null, price: 3.75 }].map(tier => {
              const active = orderQty >= tier.min && (tier.max === null || orderQty <= tier.max)
              return <div key={tier.min} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: active ? GOLD_TEXT : SECONDARY_TEXT, fontWeight: active ? 700 : 400, fontFamily: 'Inter, sans-serif' }}><span>{tier.max ? tier.min + '–' + tier.max + ' bands' : tier.min + '+ bands'}</span><span>${tier.price.toFixed(2)}/band</span></div>
            })}
          </div>
          <div style={{ borderTop: `1px solid ${SILVER_BORDER}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{orderQty} × ${pricePerBand}/band</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>${orderTotal}</div>
            </div>
            <button onClick={async () => { const res = await fetch('/api/create-org-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: orderQty, orgId: org?.id, orgName: org?.name, prefix: org?.prefix }) }); const { url } = await res.json(); if (url) window.location.href = url }} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Order →</button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: SECONDARY_TEXT, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>Engraved with {org?.prefix}-XXXXX · NFC chip included · Ships in 2–3 weeks</div>
        </div>
        <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', maxWidth: isMobile ? '100%' : 520, boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Order History</div>
          {orders.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < orders.length - 1 ? `1px solid ${SILVER_BORDER}` : 'none', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', color: GOLD_TEXT }}>ORD-{o.id.slice(0, 8)}</div>
                <div style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{new Date(o.created_at).toLocaleDateString()} · {o.order_metadata?.quantity || '—'} bands</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>${((o.amount_total || 0) / 100).toFixed(2)}</div>
              <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: `${GOLD}18`, color: GOLD_TEXT, textTransform: 'capitalize' as const, flexShrink: 0, border: `1px solid ${GOLD}44` }}>{o.status}</div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ padding: '24px 16px', color: SECONDARY_TEXT, fontSize: 13, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No orders yet.</div>}
        </div>
      </div>
    )

    return (
      <div style={{ padding: isMobile ? '16px 14px' : '32px' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Church Settings</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Update your ministry&rsquo;s profile and theme color.</p>
        <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 12, padding: isMobile ? '16px 14px' : '28px', maxWidth: isMobile ? '100%' : 520, boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
          {/* Editable fields */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>CHURCH NAME</label>
            <input value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} style={settingInput} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>LOCATION</label>
            <input value={settings.location} onChange={e => setSettings(s => ({ ...s, location: e.target.value }))} placeholder="City, State" style={settingInput} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>WEBSITE</label>
            <input value={settings.website} onChange={e => setSettings(s => ({ ...s, website: e.target.value }))} placeholder="https://yourchurch.org" style={settingInput} />
          </div>

          {/* Logo upload */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>MINISTRY LOGO</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
              {org?.logo_url ? (
                <img src={org.logo_url} alt="Ministry logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'contain', border: `1px solid ${SILVER_BORDER}`, background: '#fff', padding: 4 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 8, border: `1px dashed ${SILVER_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SECONDARY_TEXT, fontSize: 22 }}>✝</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                <label style={{ display: 'inline-block', background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 11, fontWeight: 700, cursor: logoUploading ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {logoUploading ? 'Uploading…' : (org?.logo_url ? 'Replace logo' : 'Upload logo')}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={logoUploading} style={{ display: 'none' }} />
                </label>
                {org?.logo_url && (
                  <button onClick={removeLogo} disabled={logoUploading} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove</button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 8, fontFamily: 'Inter, sans-serif' }}>PNG, JPG, WEBP, or SVG · up to 2MB.</div>
          </div>

          {/* Theme color picker */}
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>THEME COLOR</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setSettings(s => ({ ...s, color: c }))} aria-label={'Theme color ' + c} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: settings.color.toLowerCase() === c.toLowerCase() ? '3px solid #2c2416' : '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', cursor: 'pointer', padding: 0 }} />
              ))}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: SECONDARY_TEXT, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                <input type="color" value={settings.color} onChange={e => setSettings(s => ({ ...s, color: e.target.value }))} style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                Custom
              </label>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: SECONDARY_TEXT }}>{settings.color}</span>
            </div>
            <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 8, fontFamily: 'Inter, sans-serif' }}>Used across your dashboard and your public band pages. Saved changes apply right away.</div>
          </div>

          {/* Read-only fields */}
          {[{ label: 'BAND PREFIX', value: org?.prefix + '-XXXXX', mono: true }, { label: 'SUBDOMAIN', value: org?.subdomain + '.prayerbands.com', mono: true }, { label: 'PLAN', value: org?.plan || 'Ministry' }].map(field => (
            <div key={field.label} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{field.label}</label>
              <div style={{ border: `1px solid ${SILVER_BORDER}`, borderRadius: 6, padding: '10px 14px', fontSize: field.mono ? 13 : 14, fontFamily: field.mono ? 'monospace' : 'Inter, sans-serif', background: SILVER_BG, color: SECONDARY_TEXT, wordBreak: 'break-all' as const }}>{field.value}</div>
            </div>
          ))}

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, flexWrap: 'wrap' as const }}>
            <button onClick={saveSettings} disabled={settingsSaving} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 11, fontWeight: 700, cursor: settingsSaving ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: settingsSaving ? 0.7 : 1 }}>{settingsSaving ? 'Saving…' : 'Save Changes'}</button>
            {settingsMsg === 'saved'
              ? <span style={{ color: GOLD_TEXT, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Saved ✓</span>
              : settingsMsg && <span style={{ color: '#c0392b', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>{settingsMsg}</span>}
          </div>
          <div style={{ fontSize: 12, color: SECONDARY_TEXT, marginTop: 16, fontFamily: 'Inter, sans-serif' }}>To change your band prefix or subdomain, contact support@prayerbands.com</div>
        </div>

        {/* Team Members */}
        <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 12, padding: isMobile ? '16px 14px' : '28px', maxWidth: isMobile ? '100%' : 520, marginTop: 20, boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Team Members</h2>
          <p style={{ color: SECONDARY_TEXT, fontSize: 13, marginBottom: 18, fontFamily: 'Inter, sans-serif' }}>Invite others from your church to share this dashboard. Everyone you add has the same access.</p>

          {/* Current members */}
          {teamLoading && members.length === 0 ? (
            <div style={{ color: SECONDARY_TEXT, fontSize: 13, padding: '8px 0', fontFamily: 'Inter, sans-serif' }}>Loading team…</div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${SILVER_BORDER}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${GOLD}1f`, color: GOLD_TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{(m.display_name || m.email || '?').trim().charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: NAVY_HEADING, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
                      {m.display_name || '—'}
                      {m.is_you && <span style={{ fontSize: 11, color: SECONDARY_TEXT, fontWeight: 400 }}> (you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: SECONDARY_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{m.email}</div>
                  </div>
                  {m.is_owner && <span style={{ fontSize: 11, background: `${GOLD}1f`, color: GOLD_TEXT, padding: '2px 8px', borderRadius: 10, flexShrink: 0, border: `1px solid ${GOLD}44`, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>Owner</span>}
                </div>
              ))}
            </div>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>PENDING INVITES</label>
              {invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', border: `1px dashed ${SILVER_BORDER}`, color: SECONDARY_TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✉</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: NAVY_HEADING, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: '#c17f2a', fontFamily: 'Inter, sans-serif' }}>Invite pending</div>
                  </div>
                  <button onClick={() => revokeInvite(inv.id)} style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>Cancel</button>
                </div>
              ))}
            </div>
          )}

          {/* Invite form */}
          <div style={{ borderTop: `1px solid ${SILVER_BORDER}`, paddingTop: 18 }}>
            <label style={labelStyle}>INVITE A NEW MEMBER</label>
            <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Name (optional)" style={{ ...settingInput, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="their@email.com" type="email" onKeyDown={e => { if (e.key === 'Enter' && inviteEmail && !inviteSending) sendInvite() }} style={{ ...settingInput, flex: 1, minWidth: 180, width: 'auto' }} />
              <button onClick={sendInvite} disabled={inviteSending || !inviteEmail} style={{ background: (inviteSending || !inviteEmail) ? '#C9CFD6' : GOLD, color: (inviteSending || !inviteEmail) ? '#fff' : NAVY, border: 'none', borderRadius: 8, padding: '0 20px', fontSize: 11, fontWeight: 700, cursor: (inviteSending || !inviteEmail) ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{inviteSending ? 'Sending…' : 'Send Invite'}</button>
            </div>
            {inviteMsg === 'sent'
              ? <div style={{ color: GOLD_TEXT, fontSize: 13, fontWeight: 600, marginTop: 10, fontFamily: 'Inter, sans-serif' }}>Invitation sent ✓</div>
              : inviteMsg && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 10, fontFamily: 'Inter, sans-serif' }}>{inviteMsg}</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: CREAM_BG, minHeight: '100vh', color: BODY_TEXT }}>
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
  if (loading) return <div style={{ fontSize: 13, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>Loading...</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {regs.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? GOLD : SILVER_BORDER, marginTop: 3 }} />
            {i < regs.length - 1 && <div style={{ width: 1, height: 20, background: SILVER_BORDER, margin: '2px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>
              {r.user_name || 'Anonymous'}
              {i === 0 && <span style={{ fontSize: 10, background: `${GOLD}18`, color: GOLD_TEXT, padding: '1px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 400, border: `1px solid ${GOLD}44` }}>origin</span>}
            </div>
            <div style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{[r.city, r.country].filter(Boolean).join(', ') || 'Unknown'} · {new Date(r.registered_at).toLocaleDateString()}</div>
            {r.prayer && <div style={{ fontSize: 12, color: BODY_TEXT, fontStyle: 'italic', marginTop: 2, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>"{r.prayer}"</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrgDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Cinzel, serif', color: SECONDARY_TEXT, background: CREAM_BG, minHeight: '100vh' }}>Loading... ✝</div>}>
      <OrgDashboardInner />
    </Suspense>
  )
}