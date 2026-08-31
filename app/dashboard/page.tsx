'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import LivingPrayerList from '@/components/LivingPrayerList'
import Logo from '@/components/Logo'
import { publicName } from '@/lib/public-name'
import Icon, { type IconName } from '@/components/Icon'
import PrayerTabs from '@/components/PrayerTabs'
import ShareSheet from '@/components/ShareSheet'
import GiftDedications from '@/components/GiftDedications'
import ConnectGoogleNudge from '@/components/ConnectGoogleNudge'

// Brand font import (injected once client-side)
if (typeof document !== 'undefined' && !document.getElementById('pb-brand-fonts')) {
  const link = document.createElement('link')
  link.id = 'pb-brand-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap'
  document.head.appendChild(link)
}

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

const TABS = ['Overview', 'Inbox', 'Prayers', 'Map', 'Account']
// Mobile bottom nav mirrors the band page: includes a Shop/purchase link.
const MOBILE_NAV = ['Overview', 'Inbox', 'Prayers', 'Map', 'Account']
// SVG line icons for the mobile footer — matches the band page's footer menu.
const MOBILE_TAB_ICON: Record<string, IconName> = {
  Overview: 'church-home',
  Inbox: 'bible',
  Prayers: 'prayer-hands',
  Map: 'map-pin',
  Shop: 'shop-bag',
  Account: 'user',
}
// Brand palette tokens
const CREAM_BG = '#F6F1E4'
const CARD_BG = '#FFFDF8'
const NAVY = '#0A1628'
const NAVY_HEADING = '#15223B'
const BODY_TEXT = '#2A3344'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const SILVER_BG = '#ECEEF1'
const SILVER_BORDER = 'rgba(92,101,115,0.20)'
const GOLD_BORDER = 'rgba(200,169,110,0.34)'
const NAVY_BORDER = 'rgba(10,22,40,0.12)'
const SECONDARY_TEXT = '#5C6573'
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
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, noWrap: true, attribution: '&copy; Esri' }).addTo(map)
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
          ${p.user_name ? `${publicName(p.user_name)}<br/>` : ""}
          ${p.city || p.country ? `<span style="color:#5C6573">${[p.city, p.country].filter(Boolean).join(', ')}</span>` : ''}
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
  // Answered-prayer flow: open a small modal to capture an optional testimony
  // and let the owner opt in to sharing it publicly.
  const [answering, setAnswering] = useState<any | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [answerPublic, setAnswerPublic] = useState(false)
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [answeredShare, setAnsweredShare] = useState<{ id: string; title: string } | null>(null)
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

  const openAnswered = (req: any) => {
    setAnswering(req)
    setAnswerText('')
    setAnswerPublic(false)
    setAnsweredShare(null)
  }

  const submitAnswered = async () => {
    if (!answering) return
    const req = answering
    const testimony = answerText.trim()
    const makePublic = answerPublic && !!testimony
    setSubmittingAnswer(true)
    await fetch('/api/prayer-requests/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: req.id, userId: currentUserId, testimony, makePublic }),
    })
    setSubmittingAnswer(false)
    setMine(prev => prev.filter(r => r.id !== req.id))
    if (makePublic) {
      // Keep the modal open and surface the share controls.
      setAnsweredShare({ id: req.id, title: req.title })
    } else {
      setAnswering(null)
    }
  }

  const requests = tab === 'others' ? others : mine

  if (loading) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: SECONDARY_TEXT, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Loading prayers...</div>
  )

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${SILVER_BORDER}` }}>
        {(['others', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ flex: 1, padding: '10px', border: 'none', borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', background: 'transparent', color: tab === t ? GOLD_TEXT : SECONDARY_TEXT, fontSize: 11, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            {t === 'others' ? 'Pray for Others' : 'My Requests'}
            {t === 'others' && others.length > 0 && (
              <span style={{ marginLeft: 5, background: GOLD, color: NAVY, borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{others.length}</span>
            )}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {requests.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: SECONDARY_TEXT, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            {tab === 'others' ? 'No active requests from others.' : 'You have no active requests.'}
          </div>
        ) : (
          requests.map((req, i) => (
            <div key={req.id} style={{ padding: '12px 16px', borderBottom: i < requests.length - 1 ? `1px solid ${SILVER_BORDER}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY_HEADING, marginBottom: 2, fontFamily: 'Inter, sans-serif' }}>{req.title}</div>
                {req.body && <div style={{ fontSize: 12, color: SECONDARY_TEXT, fontStyle: 'italic', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.body}</div>}
                <div style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>🙏 {req.total_intercessions || 0} times &middot; {timeAgo(req.created_at)}</div>
              </div>
              {tab === 'others' && !readOnly && (
                <button
                  onClick={() => handlePray(req.id)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: 'none', background: prayedIds.has(req.id) ? `${GOLD}22` : `${GOLD}18`, color: prayedIds.has(req.id) ? GOLD_TEXT : GOLD_TEXT, fontSize: 11, fontWeight: 700, cursor: prayedIds.has(req.id) ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}
                >
                  {prayedIds.has(req.id) ? '✓ Prayed' : '🙏 Pray'}
                </button>
              )}
              {tab === 'mine' && !readOnly && (
                <button
                  onClick={() => openAnswered(req)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: `1px solid ${GOLD_BORDER}`, background: CARD_BG, color: GOLD_TEXT, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}
                >
                  ✨ Answered
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${SILVER_BORDER}`, textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: GOLD_TEXT, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>
          View all in Prayer List &rarr;
        </span>
      </div>

      {answering && (
        <div
          onClick={() => !submittingAnswer && setAnswering(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fffdf7', borderRadius: 16, maxWidth: 440, width: '100%', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {!answeredShare ? (
              <>
                <div style={{ fontSize: 30, textAlign: 'center' }}>✨</div>
                <h3 style={{ fontFamily: 'Cinzel, serif', color: NAVY_HEADING, fontSize: 19, textAlign: 'center', margin: '6px 0 4px' }}>Prayer answered!</h3>
                <p style={{ fontFamily: 'Inter, sans-serif', color: SECONDARY_TEXT, fontSize: 13, textAlign: 'center', margin: '0 0 6px' }}>{answering.title}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', color: SECONDARY_TEXT, fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>
                  Share a short testimony to encourage those who prayed (optional).
                </p>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="How did God move in this?"
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: `1px solid ${SILVER_BORDER}`, fontFamily: 'Georgia, serif', fontSize: 14, resize: 'vertical', marginBottom: 12 }}
                />
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: answerText.trim() ? 'pointer' : 'not-allowed', opacity: answerText.trim() ? 1 : 0.5, marginBottom: 18 }}>
                  <input type="checkbox" checked={answerPublic} disabled={!answerText.trim()} onChange={e => setAnswerPublic(e.target.checked)} style={{ marginTop: 2 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: NAVY_HEADING }}>
                    Share this testimony publicly so others can be encouraged — creates a shareable page (no last name shown).
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setAnswering(null)} disabled={submittingAnswer} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${SILVER_BORDER}`, background: 'transparent', color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>Cancel</button>
                  <button onClick={submitAnswered} disabled={submittingAnswer} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: GOLD, color: NAVY, fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{submittingAnswer ? 'Saving…' : 'Save'}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 30, textAlign: 'center' }}>🙏</div>
                <h3 style={{ fontFamily: 'Cinzel, serif', color: NAVY_HEADING, fontSize: 19, textAlign: 'center', margin: '6px 0 4px' }}>Testimony saved</h3>
                <p style={{ fontFamily: 'Inter, sans-serif', color: SECONDARY_TEXT, fontSize: 13, textAlign: 'center', margin: '0 0 18px' }}>
                  Share it to bring others into the story.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <ShareSheet
                    url={`https://prayerbands.com/testimony/${answeredShare.id}`}
                    title={answeredShare.title}
                    text={`Answered prayer: "${answeredShare.title}" 🙏 — a testimony from the Prayer Bands community.`}
                    label="Share testimony"
                    variant="gold"
                  />
                </div>
                <button onClick={() => setAnswering(null)} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${SILVER_BORDER}`, background: 'transparent', color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>Done</button>
              </>
            )}
          </div>
        </div>
      )}
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
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' }).addTo(map)
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
          ${p.user_name ? `<div style="font-size:13px">${publicName(p.user_name)}</div>` : ""}
          ${p.city || p.country ? `<div style="font-size:12px;color:#5C6573">${[p.city, p.country].filter(Boolean).join(', ')}</div>` : ''}
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
    <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
      <div style={{ fontSize: 14 }}>Map will appear once bands are registered with location.</div>
    </div>
  )

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Journey Map</span>
        <span style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>{points.length} location{points.length !== 1 ? 's' : ''}</span>
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
      <div style={{ background: CARD_BG, borderRadius: '16px 16px 0 0', padding: '28px 24px', width: '100%', maxWidth: 480, fontFamily: 'Inter, sans-serif', maxHeight: '90vh', overflowY: 'auto' }}>
        {step === 'loading' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 32, marginBottom: 12, color: GOLD }}>🙏</div><div style={{ color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>Loading your prayer network...</div></div>}
        {step === 'sending' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 32, marginBottom: 12, color: GOLD }}>✝︎</div><div style={{ color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>Sending your prayer request...</div></div>}
        {step === 'sent' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: 48, marginBottom: 16, color: GOLD }}>🙏</div><div style={{ fontSize: 20, fontWeight: 700, color: NAVY_HEADING, marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Prayer Request Sent</div><div style={{ fontSize: 14, color: SECONDARY_TEXT }}>{sentCount} {sentCount === 1 ? 'person is' : 'people are'} standing with you in prayer. ✝︎</div></div>}
        {step === 'error' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ color: '#c0392b', marginBottom: 16 }}>{errorMsg}</div><button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: `1px solid ${SILVER_BORDER}`, background: CARD_BG, cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: BODY_TEXT }}>Close</button></div>}
        {step === 'compose' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>🙏 Request Prayer</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: SECONDARY_TEXT }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, letterSpacing: '0.06em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6, fontFamily: 'Cinzel, serif' }}>Your Prayer Request</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Share what's on your heart..." rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${SILVER_BORDER}`, fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', background: CREAM_BG, color: BODY_TEXT, resize: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: SILVER_BG, borderRadius: 8 }}>
              <input type="checkbox" id="anon" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="anon" style={{ fontSize: 14, color: BODY_TEXT, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Send anonymously</label>
            </div>
            {network.length === 0 ? (
              <div style={{ background: SILVER_BG, borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: SECONDARY_TEXT, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>No one in your prayer network yet. Share bands with people to build your network.</div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, letterSpacing: '0.06em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 8, fontFamily: 'Cinzel, serif' }}>Send To ({network.length - excluded.length} of {network.length})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {network.map(person => {
                    const isExcluded = excluded.includes(person.email)
                    return (
                      <div key={person.email} onClick={() => toggleExclude(person.email)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isExcluded ? SILVER_BG : `${GOLD}0d`, borderRadius: 8, cursor: 'pointer', border: `1px solid ${isExcluded ? SILVER_BORDER : GOLD_BORDER}`, opacity: isExcluded ? 0.6 : 1 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isExcluded ? SILVER_BORDER : GOLD}`, background: isExcluded ? 'transparent' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {!isExcluded && <span style={{ color: NAVY, fontSize: 12, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{person.name}</div>
                          <div style={{ fontSize: 12, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{person.relationship}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 8, border: `1px solid ${SILVER_BORDER}`, background: CARD_BG, color: BODY_TEXT, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
              <button onClick={send} disabled={!message.trim()} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', background: message.trim() ? GOLD : '#C9CFD6', color: message.trim() ? NAVY : SECONDARY_TEXT, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Send Prayer Request ✝︎</button>
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
  // Map lens: own bands, or how far what you gave away has carried.
  const [mapMode, setMapMode] = useState<'mine' | '1' | '2' | 'all'>('mine')
  const [reach, setReach] = useState<{ points: MapPoint[]; counts: { direct: number; total: number } }>({ points: [], counts: { direct: 0, total: 0 } })
  const [stats, setStats] = useState({ bands: 0, prayers: 0, registrations: 0, countries: 0 })
  const [subscription, setSubscription] = useState<any>(null)
  const [pendingShipment, setPendingShipment] = useState<any>(null)
  const [dedRecipient, setDedRecipient] = useState('')
  const [dedNote, setDedNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteMsg, setNoteMsg] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewAsId, setViewAsId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [showAllBands, setShowAllBands] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [replaceOld, setReplaceOld] = useState('')
  const [replaceNew, setReplaceNew] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [replaceMsg, setReplaceMsg] = useState('')
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)
  const [showPrayerModal, setShowPrayerModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null)
  const [subSize, setSubSize] = useState('M')
  const [subDesign, setSubDesign] = useState('')
  const [bandDesigns, setBandDesigns] = useState<{ slug: string; name: string }[]>([])
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsMsg, setPrefsMsg] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [inboxNew, setInboxNew] = useState(0)
  const [prayedReq, setPrayedReq] = useState<Set<string>>(new Set())
  const [notifDays, setNotifDays] = useState(7)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Build the shareable referral link once the profile (with its code) loads.
  useEffect(() => {
    if (profile?.referral_code) setShareUrl(`${window.location.origin}/store?ref=${profile.referral_code}`)
  }, [profile?.referral_code])

  // Load reach for whichever depth the map is showing. Fetched per mode rather
  // than all at once so a large network is not pulled down to draw one ring.
  useEffect(() => {
    if (mapMode === 'mine') return
    let alive = true
    fetch(`/api/my-reach?depth=${mapMode}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setReach({ points: d.points || [], counts: d.counts || { direct: 0, total: 0 } }) })
      .catch(() => {})
    return () => { alive = false }
  }, [mapMode])

  // Counts drive the toggle labels, so fetch them once even before a reach
  // mode is picked — otherwise the buttons cannot say what they contain.
  useEffect(() => {
    fetch('/api/my-reach?depth=all')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.counts) setReach(prev => ({ ...prev, counts: d.counts })) })
      .catch(() => {})
  }, [])

  const shownPoints = mapMode === 'mine' ? mapPoints : reach.points

  const copyReferral = async () => {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl) } catch { /* clipboard blocked */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

        // Backfill: link any bands from this account's past orders (guest
        // checkout, or purchases made before the account existed) before we read
        // the band list, so they show up in reach right away. Idempotent.
        if (!viewAs) {
          try { await fetch('/api/link-purchased-bands', { method: 'POST' }) } catch {}
        }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', effectiveId).single()
        setProfile(prof)

        // Notifications inbox feed (derived server-side from band/order/sub events).
        fetch('/api/my-notifications' + (viewAs ? `?viewAs=${viewAs}` : ''))
          .then(r => r.json())
          .then(d => { setNotifications(d.notifications || []); setUnread(d.unread || 0) })
          .catch(() => {})

        // Active subscription (read through an API route so it works in admin
        // view-as mode, where owner-only RLS would otherwise hide it).
        fetch('/api/my-subscription' + (viewAs ? `?viewAs=${viewAs}` : ''))
          .then(r => r.json())
          .then(d => {
            setSubscription(d.subscription)
            setPendingShipment(d.pendingShipment || null)
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
          // Fetch every registration, not just geocoded ones. A stop whose
          // geocoding failed still belongs in the country tally; only the map
          // needs coordinates, and the pin filter below already handles that.
          const { data: regsData } = await supabase
            .from('registrations')
            .select('band_id, user_name, city, country, latitude, longitude, prayer')
            .in('band_id', bandIds)
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

  // Opening the inbox clears the unread badge (remembering how many were new so
  // the list can highlight them). Don't mark seen while viewing as another user.
  useEffect(() => {
    if (activeTab !== 'Inbox') return
    setInboxNew(unread)
    if (unread > 0) {
      setUnread(0)
      if (!isViewingAs) fetch('/api/my-notifications', { method: 'POST' }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Widen the inbox window: 7 → 30 → 90 → all.
  const NOTIF_TIERS = [7, 30, 90, 0]
  async function loadMoreNotifs() {
    const idx = NOTIF_TIERS.indexOf(notifDays)
    const next = NOTIF_TIERS[Math.min(idx + 1, NOTIF_TIERS.length - 1)]
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/my-notifications?days=${next}` + (viewAsId ? `&viewAs=${viewAsId}` : ''))
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications || []); setNotifDays(d.days ?? next) }
    } finally { setLoadingMore(false) }
  }

  // Inbox actions.
  async function dismissNotif(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (!isViewingAs) {
      fetch('/api/my-notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss', id }) }).catch(() => {})
    }
  }

  async function prayForRequest(requestId: string) {
    if (prayedReq.has(requestId) || isViewingAs) return
    setPrayedReq(prev => new Set([...prev, requestId]))
    fetch('/api/prayer-requests/intercede', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, intercessorId: user?.id }),
    }).catch(() => {})
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
    } catch {}
    setPortalLoading(false)
  }

  // Load the band designs (store catalog) for the shipment-preference picker.
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(({ products }) => {
        const bands = (products || []).filter((p: any) => p.category === 'band').map((p: any) => ({ slug: p.slug, name: p.name }))
        setBandDesigns(bands)
      })
      .catch(() => {})
  }, [])

  // Keep the shipment-preference editor in sync with the loaded subscription.
  useEffect(() => {
    if (subscription) {
      setSubDesign(subscription.band_design || '')
      setSubSize(String(subscription.band_size || 'M').toUpperCase())
    }
  }, [subscription])

  // Keep the per-cycle gift-note editor in sync with the pending shipment.
  useEffect(() => {
    if (pendingShipment) {
      setDedRecipient(pendingShipment.dedication_recipient || '')
      setDedNote(pendingShipment.dedication_note || '')
    }
  }, [pendingShipment])

  async function saveShipmentNote() {
    setSavingNote(true); setNoteMsg('')
    try {
      const res = await fetch('/api/my-shipment-note', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dedication_recipient: dedRecipient, dedication_note: dedNote }),
      })
      const data = await res.json()
      if (res.ok && data.shipment) { setPendingShipment(data.shipment); setNoteMsg('saved'); setTimeout(() => setNoteMsg(''), 2500) }
      else setNoteMsg(data.error || 'Could not save.')
    } catch { setNoteMsg('Network error.') } finally { setSavingNote(false) }
  }

  async function savePrefs() {
    setSavingPrefs(true); setPrefsMsg('')
    try {
      const res = await fetch('/api/my-subscription', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ band_design: subDesign, band_size: subSize }),
      })
      const data = await res.json()
      if (res.ok && data.subscription) { setSubscription(data.subscription); setPrefsMsg('saved'); setTimeout(() => setPrefsMsg(''), 2500) }
      else setPrefsMsg(data.error || 'Could not save.')
    } catch { setPrefsMsg('Network error.') } finally { setSavingPrefs(false) }
  }
  const displayName = profile?.full_name
    || (isViewingAs ? profile?.email?.split('@')[0] : (user?.user_metadata?.full_name || user?.email?.split('@')[0]))
    || 'Friend'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CREAM_BG, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
      <div><div style={{ fontSize: 36, marginBottom: 12, color: GOLD }}>✝︎</div><div style={{ fontSize: 15, color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>Loading your ministry...</div></div>
    </div>
  )

  const renderContent = () => {
    if (activeTab === 'Inbox') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Notifications</h1>
        <p style={{ color: SECONDARY_TEXT, marginBottom: 20, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Updates about your bands, orders, and subscription — newest first.</p>
        {notifications.length === 0 ? (
          <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '48px 20px', textAlign: 'center', color: SECONDARY_TEXT }}>
            <div style={{ fontSize: 32, marginBottom: 10, color: GOLD_TEXT }}>📖</div>
            <div style={{ fontSize: 14, fontFamily: 'Inter, sans-serif' }}>No notifications yet. As your bands travel and orders ship, they’ll show up here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n, i) => {
              const isPrayerLike = n.type === 'prayer' || n.type === 'prayer_request'
              return (
              <div key={n.id} style={{ background: CARD_BG, border: `1px solid ${i < inboxNew ? GOLD_BORDER : NAVY_BORDER}`, borderLeft: i < inboxNew ? `3px solid ${GOLD}` : `1px solid ${NAVY_BORDER}`, borderRadius: 10, padding: '13px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${GOLD}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY_HEADING, fontFamily: 'Inter, sans-serif' }}>
                    {n.title}
                    {i < inboxNew && <span style={{ marginLeft: 8, fontSize: 9, background: GOLD, color: NAVY, borderRadius: 8, padding: '1px 7px', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', verticalAlign: 'middle' }}>NEW</span>}
                  </div>
                  {n.detail && <div style={{ fontSize: 13, color: isPrayerLike ? BODY_TEXT : SECONDARY_TEXT, fontStyle: isPrayerLike ? 'italic' : 'normal', marginTop: 2, fontFamily: isPrayerLike ? 'Cormorant Garamond, Georgia, serif' : 'Inter, sans-serif' }}>{isPrayerLike ? `“${n.detail}”` : n.detail}</div>}
                  {n.band_id && <div style={{ fontSize: 11, color: GOLD_TEXT, fontFamily: 'monospace', marginTop: 3 }}>{n.band_id}</div>}
                  {/* Quick actions */}
                  {!isViewingAs && (n.type === 'prayer_request' || n.type === 'circle_request') && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      {n.type === 'prayer_request' && (
                        <button onClick={() => prayForRequest(n.requestId)} disabled={prayedReq.has(n.requestId)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: prayedReq.has(n.requestId) ? `${GOLD}22` : GOLD, color: prayedReq.has(n.requestId) ? GOLD_TEXT : NAVY, fontSize: 11, fontWeight: 700, cursor: prayedReq.has(n.requestId) ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>{prayedReq.has(n.requestId) ? '✓ Prayed' : '🙏 Pray'}</button>
                      )}
                      {n.type === 'circle_request' && (
                        <a href={`/circles/${n.circleId}`} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${GOLD_BORDER}`, background: CARD_BG, color: GOLD_TEXT, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>Open circle →</a>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{timeAgo(n.ts)}</div>
                  {!isViewingAs && (
                    <button onClick={() => dismissNotif(n.id)} aria-label="Dismiss" title="Dismiss" style={{ background: 'none', border: 'none', color: SECONDARY_TEXT, fontSize: 15, lineHeight: 1, cursor: 'pointer', padding: 2, opacity: 0.6 }}>✕</button>
                  )}
                </div>
              </div>
            )})}
            {notifDays !== 0 && (
              <button onClick={loadMoreNotifs} disabled={loadingMore} style={{ marginTop: 6, alignSelf: 'center', background: 'none', border: `1px solid ${NAVY_BORDER}`, borderRadius: 8, padding: '8px 18px', fontSize: 12, color: SECONDARY_TEXT, cursor: loadingMore ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>
                {loadingMore ? 'Loading…' : notifDays === 7 ? 'Load last 30 days' : notifDays === 30 ? 'Load last 90 days' : 'Load all'}
              </button>
            )}
          </div>
        )}
        {notifications.length > 0 && (
          <p style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 14, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
            Showing {notifDays === 0 ? 'all activity' : `the last ${notifDays} days`}.
          </p>
        )}
      </div>
    )

    if (activeTab === 'Overview') return (
      <div>
        {!isViewingAs && <ConnectGoogleNudge />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY_HEADING, margin: '0 0 4px', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Welcome, {displayName} ✝︎</h1>
            <p style={{ fontSize: 14, color: SECONDARY_TEXT, margin: 0, fontFamily: 'Inter, sans-serif' }}>Here's how far your prayers have traveled.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {!isViewingAs && (
              <button onClick={() => setShowPrayerModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: NAVY, color: '#F5EDD8', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(10,22,40,0.25)' }}>
                🙏 Send Prayer Request
              </button>
            )}
            <a href="/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '10px 16px', fontSize: 12, textDecoration: 'none', color: BODY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
              📦 Order Bands
            </a>
            <a href="/subscribe" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '10px 16px', fontSize: 12, textDecoration: 'none', color: BODY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
              🔁 Subscribe
            </a>
            {!isViewingAs && (
              <a href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '10px 16px', fontSize: 12, textDecoration: 'none', color: BODY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
                ⚙ Settings
              </a>
            )}
            {!isViewingAs && user?.email === ADMIN_EMAIL && (
              <a href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: NAVY, border: `1px solid ${NAVY}`, borderRadius: 10, padding: '10px 16px', fontSize: 12, textDecoration: 'none', color: GOLD, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
                🛠 Admin
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'My Bands', value: stats.bands, icon: '⟳', desc: 'Bands you own — each one you’ve ordered or claimed to your account.' },
            { label: 'People Reached', value: stats.registrations, icon: '✦', desc: 'Everyone who has registered one of your bands as it travels from person to person.' },
            { label: 'Prayers', value: stats.prayers, icon: '🙏', desc: 'Prayers left by people when they registered your bands.' },
            { label: 'Countries', value: stats.countries, icon: '🌍', desc: 'Distinct countries your bands have reached so far.' },
          ].map(s => (
            <div
              key={s.label}
              onMouseEnter={() => setHoveredKpi(s.label)}
              onMouseLeave={() => setHoveredKpi(h => h === s.label ? null : h)}
              onClick={() => setHoveredKpi(h => h === s.label ? null : s.label)}
              style={{ position: 'relative', background: CARD_BG, border: `1px solid ${hoveredKpi === s.label ? GOLD_BORDER : SILVER_BORDER}`, borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(10,22,40,0.06)', cursor: 'help' }}
            >
              <div style={{ fontSize: 20, marginBottom: 4, color: GOLD_TEXT }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: NAVY_HEADING, lineHeight: 1, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: SECONDARY_TEXT, marginTop: 4, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>{s.label}<span style={{ fontSize: 10, opacity: 0.7 }}>ⓘ</span></div>
              {hoveredKpi === s.label && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 30, background: NAVY, color: '#F5EDD8', borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.55, fontFamily: 'Inter, sans-serif', boxShadow: '0 8px 24px rgba(10,22,40,0.30)', border: `1px solid ${GOLD}44` }}>
                  {s.desc}
                  <span style={{ position: 'absolute', bottom: '100%', left: 22, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `6px solid ${NAVY}` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <GiftDedications userId={effectiveId} readOnly={isViewingAs} />

        {!isViewingAs && profile?.referral_code && (
          <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #132544 100%)`, border: `1px solid ${GOLD}55`, borderRadius: 10, padding: isMobile ? '16px 16px' : '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 4px 18px rgba(10,22,40,0.18)' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD, marginBottom: 4 }}>🎁 Share Prayer Bands</div>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, fontWeight: 700, color: '#F5EDD8', marginBottom: 6 }}>Give friends 5% off — using your link</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#F5EDD8', background: 'rgba(255,255,255,0.08)', border: `1px solid ${GOLD}44`, borderRadius: 6, padding: '6px 10px', wordBreak: 'break-all' }}>{shareUrl || `…/store?ref=${profile.referral_code}`}</code>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: GOLD }}>code: {profile.referral_code}</span>
              </div>
            </div>
            <button onClick={copyReferral} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>{copied ? '✓ Copied' : 'Copy Link'}</button>
          </div>
        )}

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
            <div style={{ background: `linear-gradient(135deg, #F5EDD8 0%, ${CARD_BG} 60%)`, border: `1px solid ${GOLD_BORDER}`, borderLeft: `4px solid ${hex}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20, boxShadow: '0 4px 18px rgba(184,150,74,0.13)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🔁</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{plan.name || 'Your Subscription'}</span>
                  <span style={{ background: `${badge.color}1f`, color: badge.color, border: `1px solid ${badge.color}55`, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 100 }}>{badge.label}</span>
                </div>
                {!isViewingAs && (
                  <button onClick={openBillingPortal} disabled={portalLoading} style={{ fontSize: 11, color: NAVY, background: GOLD, border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, cursor: portalLoading ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {portalLoading ? 'Opening…' : 'Manage'}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 2, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Cadence</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{cadence}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 2, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bands / shipment</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{bands}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 2, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Band design</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>
                    {bandDesigns.find(d => d.slug === subscription.band_design)?.name || subscription.band_design || 'Standard Band'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 2, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{cancelScheduled ? 'Cancels on' : 'Next ship date'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: cancelScheduled ? '#C0853E' : BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{cancelScheduled ? (cancelDateLong || '—') : nextShip}</div>
                </div>
              </div>

              {!isViewingAs && (
                <div style={{ borderTop: `1px solid ${GOLD_BORDER}`, marginTop: 14, paddingTop: 14 }}>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 8, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Shipment preferences <span style={{ textTransform: 'none', letterSpacing: 0, color: '#9A8A7A', fontFamily: 'Inter, sans-serif' }}>· applies to your next shipment</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' }}>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>Band design</div>
                      <select value={subDesign} onChange={e => setSubDesign(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${SILVER_BORDER}`, background: CARD_BG, color: BODY_TEXT, fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}>
                        {bandDesigns.length === 0 && <option value="">Loading designs…</option>}
                        {bandDesigns.map(d => (
                          <option key={d.slug} value={d.slug}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>Size</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['S', 'M', 'L'].map(s => (
                          <button key={s} onClick={() => setSubSize(s)} style={{ padding: '6px 13px', borderRadius: 8, border: subSize === s ? `2px solid ${GOLD}` : `1px solid ${SILVER_BORDER}`, background: subSize === s ? `${GOLD}1f` : CARD_BG, color: subSize === s ? GOLD_TEXT : SECONDARY_TEXT, fontWeight: subSize === s ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{s}</button>
                        ))}
                      </div>
                    </div>
                    {(subDesign !== (subscription.band_design || '') || subSize !== String(subscription.band_size || 'M').toUpperCase()) && (
                      <button onClick={savePrefs} disabled={savingPrefs} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 11, fontWeight: 700, cursor: savingPrefs ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{savingPrefs ? 'Saving…' : 'Save'}</button>
                    )}
                    {prefsMsg === 'saved'
                      ? <span style={{ color: GOLD_TEXT, fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Saved ✓</span>
                      : prefsMsg && <span style={{ color: '#c0392b', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{prefsMsg}</span>}
                  </div>
                </div>
              )}

              {!isViewingAs && pendingShipment && (
                <div style={{ borderTop: `1px solid ${GOLD_BORDER}`, marginTop: 14, paddingTop: 14 }}>
                  <div style={{ fontSize: 10, color: SECONDARY_TEXT, marginBottom: 8, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Gift message <span style={{ textTransform: 'none', letterSpacing: 0, color: '#9A8A7A', fontFamily: 'Inter, sans-serif' }}>· optional · shown to the recipient on their first tap</span>
                  </div>
                  <input value={dedRecipient} onChange={e => setDedRecipient(e.target.value)} placeholder="Recipient's name (optional)" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: `1px solid ${SILVER_BORDER}`, borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', color: BODY_TEXT, background: CARD_BG, marginBottom: 8, outline: 'none' }} />
                  <textarea value={dedNote} onChange={e => setDedNote(e.target.value.slice(0, 300))} placeholder="A short message they'll read on their first tap…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: `1px solid ${SILVER_BORDER}`, borderRadius: 8, fontSize: 13, fontFamily: 'Inter, sans-serif', color: BODY_TEXT, background: CARD_BG, minHeight: 60, resize: 'vertical', outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    {(dedRecipient !== (pendingShipment.dedication_recipient || '') || dedNote !== (pendingShipment.dedication_note || '')) && (
                      <button onClick={saveShipmentNote} disabled={savingNote} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 11, fontWeight: 700, cursor: savingNote ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{savingNote ? 'Saving…' : 'Save Message'}</button>
                    )}
                    {noteMsg === 'saved'
                      ? <span style={{ color: GOLD_TEXT, fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Saved ✓</span>
                      : noteMsg && <span style={{ color: '#c0392b', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{noteMsg}</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Journey Map</span>
              <span style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>{shownPoints.length} location{shownPoints.length !== 1 ? 's' : ''}</span>
            </div>
            {/* One map, four lenses. Your own bands, then how far what you gave
                away has carried: the people you handed bands to, their
                recipients, and everyone below you however many generations. */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 12px 0', flexWrap: 'wrap' }}>
              {([
                { id: 'mine', label: 'My bands' },
                { id: '1', label: `Direct${reach.counts.direct ? ` (${reach.counts.direct})` : ''}` },
                { id: '2', label: '+ Their recipients' },
                { id: 'all', label: `Total reach${reach.counts.total ? ` (${reach.counts.total})` : ''}` },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setMapMode(m.id)} style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  background: mapMode === m.id ? NAVY : 'transparent',
                  color: mapMode === m.id ? GOLD : SECONDARY_TEXT,
                  border: `1px solid ${mapMode === m.id ? NAVY : SILVER_BORDER}`,
                  fontSize: 11, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
                }}>{m.label}</button>
              ))}
            </div>
            {shownPoints.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: SECONDARY_TEXT }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
                <div style={{ fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                  {mapMode === 'mine'
                    ? 'Map will appear once bands are registered with location.'
                    : 'Nobody here yet — this fills in as people you hand bands to register them.'}
                </div>
              </div>
            ) : (
              <BoundedMap points={shownPoints} />
            )}
          </div>

          <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(10,22,40,0.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SILVER_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Active Prayer Requests</span>
              <button onClick={() => setActiveTab('Prayer List')} style={{ fontSize: 11, color: GOLD_TEXT, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>View all &rarr;</button>
            </div>
            <ActivePrayerPreview currentUserId={effectiveId} readOnly={isViewingAs} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Cinzel, serif' }}>Recent Activity</div>
          {activity.length === 0 ? (
            <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', color: SECONDARY_TEXT, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              Activity will appear as your bands are registered and prayers are left.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 8).map((item, i) => (
                <div key={i} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: item.type === 'prayer' ? `${GOLD}22` : SILVER_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {item.type === 'prayer' ? '🙏' : '✦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>
                      {item.type === 'prayer' ? 'Prayer on' : 'Registered'} &middot; <span style={{ color: GOLD_TEXT }}>{item.band_id}</span>
                    </div>
                    {item.message && <div style={{ fontSize: 13, color: BODY_TEXT, fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.message}"</div>}
                    {item.location && <div style={{ fontSize: 12, color: SECONDARY_TEXT, marginTop: 2 }}>📍 {item.location}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: SECONDARY_TEXT, flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>{timeAgo(item.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )

    if (activeTab === 'Map') return (
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Journey Map</h1>
        <p style={{ fontSize: 14, color: SECONDARY_TEXT, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>{mapPoints.length} location{mapPoints.length !== 1 ? 's' : ''} across {stats.countries} countr{stats.countries !== 1 ? 'ies' : 'y'}.</p>
        <DashboardMap bands={bands} points={mapPoints} />
      </div>
    )

    if (activeTab === 'Prayers') return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Prayers</h1>
            <p style={{ fontSize: 14, color: SECONDARY_TEXT, margin: 0, fontFamily: 'Inter, sans-serif' }}>Prayers left on your bands.</p>
          </div>
          {!isViewingAs && (
            <button onClick={() => setShowPrayerModal(true)} style={{ background: GOLD, color: NAVY, border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              🙏 Send Request
            </button>
          )}
        </div>
        {!isViewingAs && <PrayerTabs userId={user?.id} />}
        {prayers.length === 0 ? (
          <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: SECONDARY_TEXT, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            Prayers will appear here as people register your bands.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prayers.map((p, i) => (
              <div key={i} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderLeft: `3px solid ${GOLD}`, borderRadius: 10, padding: '16px', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: NAVY_HEADING, fontFamily: 'Inter, sans-serif' }}>{p.user_name || 'Anonymous'}</span>
                  <span style={{ fontSize: 11, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>{timeAgo(p.registered_at)}</span>
                </div>
                <div style={{ fontSize: 15, color: BODY_TEXT, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>"{p.prayer}"</div>
                <div style={{ fontSize: 11, color: GOLD_TEXT, fontFamily: 'monospace' }}>
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
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Living Prayer List</h1>
        <p style={{ fontSize: 14, color: SECONDARY_TEXT, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>Pray for others. Share your own requests. Celebrate answered prayer.</p>
        <LivingPrayerList currentUserId={effectiveId} readOnly={isViewingAs} />
      </div>
    )

    if (activeTab === 'Account') return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: NAVY_HEADING, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Account</h1>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!isViewingAs && (
              <a href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '9px 16px', fontSize: 12, textDecoration: 'none', color: BODY_TEXT, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
                ⚙ Settings
              </a>
            )}
            {!isViewingAs && user?.email === ADMIN_EMAIL && (
              <a href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: NAVY, border: `1px solid ${NAVY}`, borderRadius: 10, padding: '9px 16px', fontSize: 12, textDecoration: 'none', color: GOLD, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', fontWeight: 600, boxShadow: '0 1px 4px rgba(10,22,40,0.06)', whiteSpace: 'nowrap' }}>
                🛠 Admin
              </a>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY_HEADING, margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Recent Activity</h2>
            {activity.length > 3 && (
              <button onClick={() => setShowAllActivity(v => !v)} style={{ background: 'none', border: 'none', color: GOLD_TEXT, fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>
                {showAllActivity ? 'Show less' : 'View All'}
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: SECONDARY_TEXT, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>Recent events across your bands.</p>
          {activity.length === 0 ? (
            <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: SECONDARY_TEXT, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              Activity will appear as your bands are used.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(showAllActivity ? activity : activity.slice(0, 3)).map((item, i) => (
                <div key={i} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: item.type === 'prayer' ? `${GOLD}22` : SILVER_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {item.type === 'prayer' ? '🙏' : '✦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>
                      {item.type === 'prayer' ? 'Prayer on' : 'Registered'} &middot; <span style={{ color: GOLD_TEXT }}>{item.band_id}</span>
                    </div>
                    {item.message && <div style={{ fontSize: 13, color: BODY_TEXT, fontStyle: 'italic', marginTop: 2 }}>"{item.message}"</div>}
                    {item.location && <div style={{ fontSize: 12, color: SECONDARY_TEXT, marginTop: 2 }}>📍 {item.location}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: SECONDARY_TEXT, flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>{timeAgo(item.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Bands */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY_HEADING, margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>My Bands</h2>
            {bands.length > 3 && (
              <button onClick={() => setShowAllBands(v => !v)} style={{ background: 'none', border: 'none', color: GOLD_TEXT, fontSize: 12, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>
                {showAllBands ? 'Show less' : 'View All'}
              </button>
            )}
          </div>
          <p style={{ fontSize: 13, color: SECONDARY_TEXT, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>Your most recent bands.</p>
          {bands.length === 0 ? (
            <div style={{ background: CARD_BG, border: `1px solid ${SILVER_BORDER}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: SECONDARY_TEXT }}>
              <div style={{ fontSize: 32, marginBottom: 8, color: GOLD_TEXT }}>⟳</div>
              <div style={{ fontSize: 14, marginBottom: 16, fontFamily: 'Inter, sans-serif' }}>No bands yet.</div>
              <a href="/store" style={{ background: GOLD, color: NAVY, padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Order Bands &rarr;</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(showAllBands ? bands : bands.slice(0, 3)).map(band => {
                const hands = band.registrations?.[0]?.count || 0
                return (
                  <a key={band.band_id} href={`/band/${band.band_id}`} style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: hands > 0 ? `${GOLD}22` : SILVER_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: hands > 0 ? GOLD_TEXT : SECONDARY_TEXT, textAlign: 'center', lineHeight: 1.2 }}>
                      {band.band_id.split('-')[0]}<br />{band.band_id.split('-')[1]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: BODY_TEXT, fontFamily: 'Inter, sans-serif' }}>{band.band_id}</div>
                      <div style={{ fontSize: 12, color: SECONDARY_TEXT, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                        {hands > 0 ? `${hands} hand${hands !== 1 ? 's' : ''}` : 'Unregistered'} &middot; 0 prayers
                      </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: hands > 0 ? GOLD : SILVER_BORDER, flexShrink: 0 }} />
                  </a>
                )
              })}
            </div>
          )}

          {/* Lost a band? Self-service replacement */}
          {bands.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {!showReplace ? (
                <button onClick={() => { setShowReplace(true); setReplaceMsg('') }} style={{ background: 'none', border: 'none', color: SECONDARY_TEXT, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' }}>
                  Lost a band? Replace it &rarr;
                </button>
              ) : (
                <div style={{ background: CARD_BG, border: `1px solid ${NAVY_BORDER}`, borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY_HEADING, marginBottom: 4, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Replace a lost band</div>
                  <p style={{ fontSize: 12, color: SECONDARY_TEXT, marginBottom: 12, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>Once your replacement band arrives, pick the lost band and enter the new band&rsquo;s ID. Its prayer journey moves to the new band; the old one is retired.</p>
                  <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Cinzel, serif' }}>Lost band</label>
                  <select value={replaceOld} onChange={e => setReplaceOld(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${SILVER_BORDER}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: CARD_BG, color: BODY_TEXT, marginBottom: 12, boxSizing: 'border-box' }}>
                    <option value="">Select the band you lost…</option>
                    {bands.map(b => <option key={b.band_id} value={b.band_id}>{b.band_id}</option>)}
                  </select>
                  <label style={{ fontSize: 11, fontWeight: 700, color: GOLD_TEXT, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Cinzel, serif' }}>New band ID</label>
                  <input value={replaceNew} onChange={e => setReplaceNew(e.target.value)} placeholder="e.g. PB-NEW34" style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: `1px solid ${SILVER_BORDER}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: CARD_BG, color: BODY_TEXT, marginBottom: 14, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      disabled={replacing || !replaceOld || !replaceNew.trim()}
                      onClick={async () => {
                        setReplacing(true); setReplaceMsg('')
                        const res = await fetch('/api/replace-band', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_band_id: replaceOld, new_band_id: replaceNew }) })
                        const d = await res.json()
                        if (res.ok) { setReplaceMsg(`✅ Done — moved ${d.movedRegistrations} prayer record(s) to ${d.newBandId}.`); setTimeout(() => window.location.reload(), 1800) }
                        else { setReplaceMsg('❌ ' + (d.error || 'Could not replace band.')); setReplacing(false) }
                      }}
                      style={{ background: (replacing || !replaceOld || !replaceNew.trim()) ? '#C9CFD6' : GOLD, color: (replacing || !replaceOld || !replaceNew.trim()) ? SECONDARY_TEXT : NAVY, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    >{replacing ? 'Replacing…' : 'Replace band'}</button>
                    <button onClick={() => { setShowReplace(false); setReplaceOld(''); setReplaceNew(''); setReplaceMsg('') }} style={{ background: 'transparent', border: `1px solid ${SILVER_BORDER}`, borderRadius: 8, padding: '10px 18px', fontSize: 13, color: SECONDARY_TEXT, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: SECONDARY_TEXT, fontFamily: 'Inter, sans-serif' }}>
                    Don&rsquo;t have a replacement yet?{' '}
                    <a
                      href={replaceOld ? `/store?replaces=${encodeURIComponent(replaceOld)}` : '#'}
                      onClick={e => { if (!replaceOld) { e.preventDefault(); setReplaceMsg('❌ Pick the lost band first.') } }}
                      style={{ color: GOLD_TEXT, fontWeight: 700, textDecoration: 'underline' }}
                    >Order one &rarr;</a>{' '}
                    and its journey will transfer automatically.
                  </div>
                  {replaceMsg && <div style={{ marginTop: 12, fontSize: 13, color: replaceMsg.startsWith('❌') ? '#c0392b' : GOLD_TEXT, lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>{replaceMsg}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM_BG, fontFamily: 'Inter, sans-serif', color: BODY_TEXT }}>
      <div style={{ background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 56, gap: 12, boxShadow: '0 2px 12px rgba(10,22,40,0.25)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: GOLD, textDecoration: 'none', cursor: 'pointer', fontFamily: 'Cinzel, serif' }}><Logo size={26} color={GOLD} />Prayer Bands</a>
        <div style={{ flex: 1 }} />
        {/* Way back to the everyday band view. The dashboard is the account
            overview people visit occasionally; the band page is where they read
            the daily verse. /my-band resolves whichever band they last held. */}
        <a href="/my-band" style={{ background: GOLD, color: NAVY, padding: '6px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>← My Band</a>
        <button onClick={async () => { const s = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); await s.auth.signOut(); window.location.href = '/signin' }} style={{ background: 'rgba(200,169,110,0.15)', border: `1px solid ${GOLD_BORDER}`, color: GOLD, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>Sign out</button>
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
        <div style={{ background: CARD_BG, borderBottom: `1px solid ${NAVY_BORDER}`, padding: '0 32px', display: 'flex', gap: 4, justifyContent: 'center', boxShadow: '0 1px 4px rgba(10,22,40,0.05)', position: 'relative' }}>
          {TABS.filter(t => t !== 'Inbox').map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '14px 18px', border: 'none', borderBottom: activeTab === t ? `2px solid ${GOLD}` : '2px solid transparent', background: 'transparent', color: activeTab === t ? GOLD_TEXT : SECONDARY_TEXT, fontSize: 12, fontWeight: activeTab === t ? 700 : 400, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t}
            </button>
          ))}
          {/* Notification bell pinned to the far right of the nav bar */}
          {user && (
            <button onClick={() => setActiveTab('Inbox')} title="Notifications" style={{ position: 'absolute', right: 32, top: 0, bottom: 0, padding: '0 4px', border: 'none', borderBottom: activeTab === 'Inbox' ? `2px solid ${GOLD}` : '2px solid transparent', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Icon name="bible" size={18} color={activeTab === 'Inbox' ? GOLD_TEXT : SECONDARY_TEXT} bg={CARD_BG} />
                {unread > 0 && <span style={{ position: 'absolute', top: -7, right: -11, background: GOLD, color: NAVY, borderRadius: 10, minWidth: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>}
              </span>
            </button>
          )}
        </div>
      )}

      <div style={{ padding: isMobile ? '16px 14px' : '28px 32px', maxWidth: 900, margin: '0 auto', paddingBottom: isMobile ? 80 : 28 }}>
        {renderContent()}
      </div>

      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: NAVY, borderTop: `1px solid rgba(200,169,110,0.2)`, display: 'flex', zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxShadow: '0 -2px 12px rgba(10,22,40,0.2)' }}>
          {MOBILE_NAV.filter(item => item !== 'Inbox' || !!user).map(item => {
            const active = activeTab === item
            return (
              <button key={item} onClick={() => { if (item === 'Shop') { window.location.href = '/store' } else { setActiveTab(item) } }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 2px 8px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', minWidth: 0 }}>
                {active && <div style={{ position: 'absolute', top: 0, width: 36, height: 3, background: GOLD, borderRadius: '0 0 3px 3px' }} />}
                <span style={{ position: 'relative', display: 'inline-flex', lineHeight: 1 }}>
                  <Icon name={MOBILE_TAB_ICON[item]} size={22} color={active ? GOLD : 'rgba(255,255,255,0.45)'} bg={NAVY} />
                  {item === 'Inbox' && unread > 0 && <span style={{ position: 'absolute', top: -6, right: -10, background: GOLD, color: NAVY, borderRadius: 8, minWidth: 15, height: 15, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{unread}</span>}
                </span>
                <span style={{ fontSize: 9, color: active ? GOLD : 'rgba(200,169,110,0.45)', fontFamily: 'Cinzel, serif', fontWeight: active ? 700 : 400, marginTop: 3, letterSpacing: '0.03em' }}>{item}</span>
              </button>
            )
          })}
        </nav>
      )}

      {showPrayerModal && !isViewingAs && <PrayerRequestModal userId={user?.id} onClose={() => setShowPrayerModal(false)} />}
    </div>
  )
}
