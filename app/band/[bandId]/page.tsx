'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'
import Icon, { type IconName } from '@/components/Icon'
import NotificationsPanel from '@/components/NotificationsPanel'
import NetworkConnectPrompt from '@/components/NetworkConnectPrompt'
import PrayerTabs from '@/components/PrayerTabs'
import PurchaseTab from '@/components/PurchaseTab'
import { useApplyTheme } from '@/components/ThemeProvider'
import { track } from '@/lib/analytics'
import { CATEGORIES, getVerseForCategory } from '@/lib/verses'
import { recordVerseView, type VerseWalk } from '@/lib/verseWalk'
import WalkLine from '@/components/band/WalkLine'
import IncomingGiftScreen from './screens/IncomingGiftScreen'

type Registration = {
  id: string
  user_name: string
  city: string
  country: string
  registered_at: string
  prayer: string
  user_id: string | null
  latitude?: number | null
  longitude?: number | null
}

type BandStatus = {
  screen: 'personal_space' | 'incoming_transfer' | 'incoming_gift' | 'first_tap_gift' | 'journey' | 'first_tap_blank' | 'not_found' | 'loading' | 'error'
  reason?: string
  band?: any
  registrations?: Registration[]
  currentHolder?: Registration
  transfer?: any
  senderName?: string
  dedicatorName?: string
}

// Colors resolve from theme CSS variables (--pb-*, set on :root by useApplyTheme).
// Fallbacks equal the original palette, so an unthemed band looks unchanged.
const GOLD  = 'var(--pb-primary, #B8860B)'
const GREEN = 'var(--pb-accent-alt, #1a4a3a)'
const NAVY  = 'var(--pb-tab-bar, #1a2a4a)'
// Lighter tint of the themed dark color — used as the second stop on dark
// gradients (verse card, transfer banner) so they stay on-theme instead of
// fading to a hardcoded blue. Falls back to the original navy-blue when unset.
const NAVY_LT = 'color-mix(in srgb, var(--pb-tab-bar, #1a2a4a) 80%, #ffffff)'
const DARK  = 'var(--pb-text, #2C1810)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const GRAY  = 'var(--pb-text-muted, #7A6A5A)'
// Text on primary/gold buttons — dark on the gold default theme, white on the
// dark-primary themes (beach/mountain/military), via the theme token.
const INK   = 'var(--pb-text-on-primary, #0f0d09)'
const serif = "'Playfair Display', Georgia, serif"
// Body/UI text uses a sans stack — serif (above) is reserved for large
// headings/verses; small serif body text was hard to read.
const body  = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

function Avatar({ letter, color, size = 44 }: { letter: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: size * 0.4, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {letter}
    </div>
  )
}

// Prayer-chain avatars follow the band theme by role:
// origin -> tab bar, current holder -> primary, past holders -> avatar-past.
function avatarColor(i: number, total: number): string {
  if (i === 0) return 'var(--pb-tab-bar, #1a2a4a)'
  if (i === total - 1) return 'var(--pb-primary, #B8860B)'
  return 'var(--pb-avatar-past, #9BB5A0)'
}

function ClaimForm({ onSubmit, onBack, title, subtitle, submitLabel, claimName, setClaimName, claimPrayer, setClaimPrayer, claimCity, setClaimCity, claimState, setClaimState, claimCountry, setClaimCountry, submitting }: {
  onSubmit: () => void
  onBack?: () => void
  title: string
  subtitle: string
  submitLabel: string
  claimName: string
  setClaimName: (v: string) => void
  claimPrayer: string
  setClaimPrayer: (v: string) => void
  claimCity: string
  setClaimCity: (v: string) => void
  claimState: string
  setClaimState: (v: string) => void
  claimCountry: string
  setClaimCountry: (v: string) => void
  submitting: boolean
}) {
  return (
    <div style={{ margin: '16px 20px', background: 'white', borderRadius: 16, padding: '24px', border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
      {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: GRAY, fontFamily: body, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16 }}>← Back</button>}
      <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20 }}>{subtitle}</div>
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your name *</label>
      <input value={claimName} onChange={e => setClaimName(e.target.value)} placeholder="First name or full name" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>City *</label>
          <input value={claimCity} onChange={e => setClaimCity(e.target.value)} placeholder="City" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>State / Province *</label>
          <input value={claimState} onChange={e => setClaimState(e.target.value)} placeholder="State" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Country *</label>
      <input value={claimCountry} onChange={e => setClaimCountry(e.target.value)} placeholder="Country" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }} />
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer (optional)</label>
      <textarea value={claimPrayer} onChange={e => setClaimPrayer(e.target.value)} placeholder="A prayer, a verse, or what this moment means to you..." rows={4} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 20, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
      <button onClick={onSubmit} disabled={submitting || !claimName.trim() || !claimCity.trim() || !claimCountry.trim()} style={{ display: 'block', width: '100%', padding: 15, background: claimName.trim() ? GOLD : '#ccc', color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: claimName.trim() ? 'pointer' : 'not-allowed' }}>
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

export default function BandPage() {
  const params = useParams()
  const router = useRouter()
  const bandId = (params?.bandId as string)?.toUpperCase()

  const [status, setStatus] = useState<BandStatus>({ screen: 'loading' })
  const [userId, setUserId] = useState<string | null>(null)
  const [claimName, setClaimName] = useState('')
  const [claimCity, setClaimCity] = useState('')
  const [claimState, setClaimState] = useState('')
  const [claimCountry, setClaimCountry] = useState('United States')
  const [claimPrayer, setClaimPrayer] = useState('')
  const [showSignup, setShowSignup] = useState(false)
  const [claimStep, setClaimStep] = useState<'prompt' | 'form' | 'done' | 'view'>('prompt')
  const [giftAcknowledged, setGiftAcknowledged] = useState(false)
  const [transferNote, setTransferNote] = useState('')
  const [transferStep, setTransferStep] = useState<'idle' | 'sheet' | 'pending' | 'save_prompt'>('idle')
  const [transferComplete, setTransferComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)
  const [verseCategory, setVerseCategory] = useState('all')
  const [prayers, setPrayers] = useState<any[]>([])
  const [prayerTitle, setPrayerTitle] = useState('')
  const [prayerBody, setPrayerBody] = useState('')
  const [prayerStep, setPrayerStep] = useState<'list' | 'form' | 'answer'>('list')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [testimony, setTestimony] = useState('')
  const [prayerSubmitting, setPrayerSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'prayers' | 'journey' | 'purchase' | 'account'>('home')
  const [claimingOwnership, setClaimingOwnership] = useState(false)
  const [unread, setUnread] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [walk, setWalk] = useState<VerseWalk>({ total: 0, run: 0, returning: false })

  // Apply this band's color theme (CSS variables on :root).
  useApplyTheme(status.band?.theme)

  // Fixed theme backdrop: a viewport-pinned layer behind the content so the
  // theme background stays put while the page scrolls. Done with a position:fixed
  // element rather than `background-attachment: fixed`, which iOS Safari ignores.
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;inset:0;z-index:-1;background:var(--pb-page,#FAF6EF);pointer-events:none'
    document.body.appendChild(el)
    return () => { el.remove() }
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null))
  }, [])

  // Unread notification count for the bell (signed-in account holders only).
  useEffect(() => {
    if (!userId) { setUnread(0); return }
    fetch('/api/my-notifications')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnread(d.unread || 0) })
      .catch(() => {})
  }, [userId])

  // "Your walk": record today's verse view and load the day count. Cross-device
  // for signed-in users (Supabase); localStorage fallback for accountless holders
  // that merges in on sign-up. Only counts when the owner is viewing their band.
  useEffect(() => {
    if (status.screen !== 'personal_space' || !bandId) return
    let alive = true
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    recordVerseView({ bandId, userId, supabase }).then(w => { if (alive) setWalk(w) }).catch(() => {})
    return () => { alive = false }
  }, [status.screen, bandId, userId])

  // Returning from sign-up after choosing "Create Free Account" on the
  // pass-on save prompt — auto-open the transfer flow.
  useEffect(() => {
    if (!bandId || !userId) return
    if (localStorage.getItem(`pendingTransfer_${bandId}`)) {
      localStorage.removeItem(`pendingTransfer_${bandId}`)
      setTransferStep('sheet')
    }
  }, [bandId, userId])

  useEffect(() => {
    if (!bandId) return
    const localHolder = localStorage.getItem(`holder_${bandId}`)
    const url = `/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}${localHolder ? '&localHolder=true' : ''}`
    fetch(url).then(r => r.json()).then(data => setStatus(data)).catch(() => setStatus({ screen: 'error' }))
  }, [bandId, userId])

  useEffect(() => {
    if (!userId || !bandId) return
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.from('prayer_requests').select('*').eq('user_id', userId).eq('band_id', bandId)
      .order('created_at', { ascending: false }).then(({ data }) => setPrayers(data ?? []))
  }, [userId, bandId])

  useEffect(() => {
    if (transferStep !== 'pending') return
    // Poll while the recipient taps to accept — but stop after ~10 min so an
    // un-accepted transfer doesn't poll forever in an open tab. A refresh
    // re-checks if they're still waiting.
    let attempts = 0
    const MAX_ATTEMPTS = 120
    const interval = setInterval(() => {
      if (++attempts > MAX_ATTEMPTS) { clearInterval(interval); return }
      fetch(`/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`)
        .then(r => r.json())
        .then(data => {
          if (data.band?.status === 'registered') {
            clearInterval(interval)
            localStorage.removeItem(`holder_${bandId}`)
            setTransferStep('idle')
            setTransferComplete(true)
          }
        })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [transferStep, bandId, userId])

  async function handleClaim() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, name: claimName, city: claimCity, state: claimState, country: claimCountry, prayer: claimPrayer, userId: userId ?? null }),
      })
      if (!res.ok) throw new Error('register-band failed')
      localStorage.setItem(`holder_${bandId}`, 'true')
      setClaimStep('done')
      setTimeout(() => { window.location.reload() }, 8000)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Attach this (unowned) band to the signed-in user's account.
  async function claimToAccount() {
    setClaimingOwnership(true)
    try {
      const res = await fetch('/api/claim-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId }),
      })
      const data = await res.json()
      if (res.status === 401) { router.push(`/signin?redirect=/band/${bandId}`); return }
      if (!res.ok) { alert(data.error || 'Could not claim this band.'); return }
      const url = `/api/band-status?id=${bandId}${userId ? `&userId=${userId}` : ''}`
      const fresh = await fetch(url).then(r => r.json())
      setStatus(fresh)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setClaimingOwnership(false)
    }
  }

  async function handleInitiateTransfer() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/initiate-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, note: transferNote }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) { router.push(`/signin?redirect=/band/${bandId}`); return }
        alert(data.error || 'Something went wrong. Please try again.')
        return
      }
      setTransferStep('pending')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelTransfer() {
    try {
      const res = await fetch('/api/cancel-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Could not cancel the transfer.')
        return
      }
      setTransferStep('idle')
    } catch {
      alert('Something went wrong. Please try again.')
    }
  }

  async function handleAcceptTransfer() {
    if (!claimName.trim()) return
    setSubmitting(true)
    try {
      // register-band completes the pending transfer server-side (atomic with
      // the new holder's registration) — no client-side band/transfer writes.
      const res = await fetch('/api/register-band', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, name: claimName, city: claimCity, state: claimState, country: claimCountry, prayer: claimPrayer }),
      })
      if (!res.ok) throw new Error('register-band failed')
      localStorage.setItem(`holder_${bandId}`, 'true')
      setClaimStep('done')
      setTimeout(() => { window.location.reload() }, 8000)
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function Nav() {
    const currentHolder = status.registrations?.[status.registrations.length - 1]
    return (
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(44,24,16,0.1)', background: 'rgba(250,246,239,0.97)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" aria-label="Prayer Bands home" style={{ display: 'inline-flex', textDecoration: 'none' }}>
          <Logo size={28} withName nameColor={DARK} nameSize={18} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {status.screen === 'personal_space' && currentHolder?.user_name && (
            <div style={{ fontFamily: serif, fontSize: 13, fontWeight: 600, color: DARK, textAlign: 'right' }}>{currentHolder.user_name}</div>
          )}
          {userId ? (
            <button onClick={() => setNotifOpen(true)} aria-label="Notifications" title="Notifications" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Icon name="bible" size={22} color="var(--pb-primary, #C8A96E)" bg="#FAF6EF" />
              {unread > 0 && <span style={{ position: 'absolute', top: -7, right: -9, background: GOLD, color: INK, borderRadius: 10, minWidth: 16, height: 16, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>}
            </button>
          ) : (
            <a href={`/signin?redirect=${encodeURIComponent(`/band/${bandId}`)}`} style={{ fontFamily: serif, fontSize: 13, fontWeight: 700, color: GOLD, textDecoration: 'none', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '6px 14px', whiteSpace: 'nowrap' }}>Sign in</a>
          )}
        </div>
        <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} userId={userId} onSeen={() => setUnread(0)} />
      </nav>
    )
  }

  function StatsStrip({ regs }: { regs: Registration[] }) {
    const countries = new Set(regs.map(r => r.country).filter(Boolean)).size
    const prayerCount = regs.filter(r => r.prayer).length
    return (
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid rgba(44,24,16,0.08)' }}>
        {[{ num: regs.length, lbl: 'People' }, { num: countries || '—', lbl: 'Countries' }, { num: prayerCount, lbl: 'Prayers' }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(44,24,16,0.08)' : 'none' }}>
            <span style={{ display: 'block', fontFamily: serif, fontSize: 20, fontWeight: 700, color: GOLD }}>{s.num}</span>
            <span style={{ display: 'block', fontFamily: body, fontSize: 10, color: GRAY, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{s.lbl}</span>
          </div>
        ))}
      </div>
    )
  }

  function PendingBanner() {
    return (
      <div style={{ background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✝</div>
        <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Waiting for them to tap</div>
        <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 20 }}>Hand the band to the other person and ask them to tap it with their phone.</div>
        <button onClick={handleCancelTransfer} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '10px 20px', fontFamily: body, fontSize: 13, cursor: 'pointer' }}>Cancel transfer</button>
      </div>
    )
  }

  function VerseEngine() {
    const verse = getVerseForCategory(verseCategory)
    const hour = new Date().getHours()
    const greeting = walk.returning ? 'Welcome back'
      : hour < 12 ? 'Good morning'
      : hour < 18 ? 'Good afternoon' : 'Good evening'
    return (
      <div style={{ margin: '20px 20px 0' }}>
        <div style={{ textAlign: 'center', fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 2 }}>{greeting}</div>
        <WalkLine total={walk.total} run={walk.run} onOpenJourney={() => setActiveTab('journey')} />
        <div style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LT})`, borderRadius: 14, padding: '24px 20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            {verseCategory === 'all' ? "Today's Verse" : CATEGORIES.find(c => c.id === verseCategory)?.label}
          </div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 12 }}>"{verse.text}"</div>
          <div style={{ fontFamily: body, fontSize: 13, opacity: 0.7, fontWeight: 600 }}>{verse.ref}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 2, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setVerseCategory(cat.id)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 12, fontWeight: 600, background: verseCategory === cat.id ? GOLD : 'white', color: verseCategory === cat.id ? INK : GRAY, boxShadow: '0 1px 4px rgba(44,24,16,0.1)', transition: 'all 0.2s' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Leaflet map of the band's journey — markers for each location, connected in
  // chronological order. Marker/line color follow the band's theme.
  function JourneyMap({ regs }: { regs: Registration[] }) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<any>(null)
    const points = regs.filter(r => r.latitude != null && r.longitude != null)

    useEffect(() => {
      if (!mapRef.current || typeof window === 'undefined' || !points.length) return
      const gold = (getComputedStyle(document.documentElement).getPropertyValue('--pb-primary') || '').trim() || '#C8A96E'
      const render = () => {
        const L = (window as any).L
        if (!L || !mapRef.current) return
        if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
        const valid = regs.filter(p => p.latitude != null && p.longitude != null)
        if (!valid.length) return
        const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false })
        mapInstanceRef.current = map
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
        const latlngs: any[] = []
        const markers: any[] = []
        valid.forEach(p => {
          const ll = [p.latitude as number, p.longitude as number]
          latlngs.push(ll)
          const dot = L.divIcon({ className: '', html: `<div style="width:12px;height:12px;background:${gold};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] })
          const m = L.marker(ll, { icon: dot }).addTo(map)
          m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px"><strong>${p.user_name || 'Someone'}</strong>${(p.city || p.country) ? `<br/><span style="color:#5C6573">${[p.city, p.country].filter(Boolean).join(', ')}</span>` : ''}</div>`)
          markers.push(m)
        })
        if (latlngs.length > 1) L.polyline(latlngs, { color: gold, weight: 2, opacity: 0.65, dashArray: '4 6' }).addTo(map)
        if (markers.length === 1) map.setView(latlngs[0], 6)
        else map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25))
      }
      if ((window as any).L) { render(); return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } } }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
      }
      let script = document.getElementById('leaflet-js') as HTMLScriptElement | null
      if (!script) { script = document.createElement('script'); script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; document.head.appendChild(script) }
      script.addEventListener('load', render, { once: true })
      return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
    }, [regs])

    if (!points.length) return null
    return (
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(44,24,16,0.12)', marginBottom: 20, boxShadow: '0 1px 6px rgba(44,24,16,0.06)' }}>
        <div ref={mapRef} style={{ height: 240, width: '100%' }} />
      </div>
    )
  }

  function PrayerChain({ regs }: { regs: Registration[] }) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <JourneyMap regs={regs} />
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(44,24,16,0.08)' }}>Prayer Chain</div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 22, top: 8, bottom: 8, width: 1, background: 'rgba(44,24,16,0.1)' }} />
          {[...regs].reverse().map((reg, i) => {
            const orig = regs.length - 1 - i
            const isOrigin = orig === 0
            const isCurrent = orig === regs.length - 1 && regs.length > 1
            return (
            <div key={reg.id} style={{ display: 'flex', gap: 16, marginBottom: 24, position: 'relative' }}>
              <Avatar letter={reg.user_name?.[0]?.toUpperCase() ?? '?'} color={avatarColor(orig, regs.length)} />
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK }}>
                    {reg.user_name}
                    {isOrigin && <span style={{ display: 'inline-block', fontSize: 10, fontFamily: body, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, marginLeft: 6, background: 'rgba(184,134,11,0.12)', color: GOLD }}>Origin</span>}
                    {isCurrent && <span style={{ display: 'inline-block', fontSize: 10, fontFamily: body, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, marginLeft: 6, background: 'rgba(44,24,16,0.08)', color: GRAY }}>Current</span>}
                  </span>
                  <span style={{ fontFamily: body, fontSize: 11, color: '#9A8A7A' }}>{new Date(reg.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {(reg.city || reg.country) && <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 6 }}>📍 {[reg.city, reg.country].filter(Boolean).join(', ')}</div>}
                {reg.prayer && (
                  <>
                    <div style={{ fontFamily: body, fontSize: 13, color: '#3C2C1C', lineHeight: 1.6, fontStyle: 'italic', ...(expandedPrayer !== reg.id ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}) }}>"{reg.prayer}"</div>
                    <button onClick={() => setExpandedPrayer(expandedPrayer === reg.id ? null : reg.id)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: body, fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
                      {expandedPrayer === reg.id ? 'Show less' : 'Read full prayer'}
                    </button>
                  </>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    )
  }

  function SuccessCard({ title, subtitle, showCountdown }: { title: string; subtitle: string; showCountdown?: boolean }) {
    const [ageConsent, setAgeConsent] = useState(false)
    const [authMode, setAuthMode] = useState<'prompt' | 'email' | null>(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [authSubmitting, setAuthSubmitting] = useState(false)
    const [authDone, setAuthDone] = useState(false)
    const [countdown, setCountdown] = useState(8)

    useEffect(() => {
      if (userId) return
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }, [])

    async function handleEmailSignUp() {
      if (!ageConsent || !email.trim() || !password.trim()) return
      setAuthSubmitting(true)
      setAuthError('')
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: password.trim(), options: { emailRedirectTo: `${window.location.origin}/band/${bandId}` } })
      if (error) { setAuthError(error.message) } else { track('sign_up', { method: 'email' }); setAuthDone(true) }
      setAuthSubmitting(false)
    }

    async function handleGoogleSignIn() {
      if (!ageConsent) return
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
    }

    if (userId) return null

    return (
      <div>
        <div style={{ margin: '24px 20px', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
          <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6 }}>{subtitle}</div>
        </div>
        {!authDone && (
          <div style={{ margin: '0 20px 24px', background: 'white', borderRadius: 16, padding: '24px', border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Save your place in this journey</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>Create a free account to get your daily verse every time you tap, track your prayers, and follow this band's story.</div>
            <div onClick={() => setAgeConsent(!ageConsent)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1, border: `2px solid ${ageConsent ? GOLD : 'rgba(44,24,16,0.2)'}`, background: ageConsent ? GOLD : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ageConsent && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ fontFamily: body, fontSize: 13, color: DARK, lineHeight: 1.5 }}>I confirm that I am <strong>13 years of age or older</strong>, or I am a parent or guardian creating this account on behalf of a child.</div>
            </div>
            {authMode === null && (
              <div>
                <button onClick={() => { if (ageConsent) setAuthMode('email') }} disabled={!ageConsent} style={{ display: 'block', width: '100%', padding: '13px', marginBottom: 10, background: ageConsent ? GOLD : '#ccc', color: ageConsent ? INK : 'white', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                  Create with email &amp; password
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                  <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
                  <span style={{ fontFamily: body, fontSize: 12, color: GRAY, letterSpacing: '0.06em' }}>or continue with</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
                </div>
                <button onClick={handleGoogleSignIn} disabled={!ageConsent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', marginBottom: 10, background: ageConsent ? DARK : '#ccc', color: 'white', border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15, fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: 18 }}>G</span> Continue with Google
                </button>
                <button onClick={async () => {
                  if (!ageConsent) return
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
                }} disabled={!ageConsent} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '13px', marginBottom: 10,
                  background: ageConsent ? '#1877F2' : '#ccc', color: 'white',
                  border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15,
                  fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed',
                  boxSizing: 'border-box',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>f</span> Continue with Facebook
                </button>
              </div>
            )}
            {authMode === 'email' && (
              <div>
                <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
                <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 6, outline: 'none', boxSizing: 'border-box' }} />
                {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
                <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 16 }}>Already have an account? <a href="/signin" style={{ color: GOLD }}>Sign in</a></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleEmailSignUp} disabled={authSubmitting || !email.trim() || !password.trim()} style={{ flex: 1, padding: '13px', background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{authSubmitting ? 'Creating...' : 'Create Account ✝'}</button>
                  <button onClick={() => setAuthMode(null)} style={{ padding: '13px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Back</button>
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 16, fontFamily: body, fontSize: 12, color: GRAY }}>No account needed to hold a band or leave a prayer.</div>
            {showCountdown !== false && (
              <div style={{ textAlign: 'center', marginTop: 16, fontFamily: body, fontSize: 14, color: DARK }}>
                Taking you to your band in <span style={{ fontFamily: serif, fontWeight: 700, color: GOLD, fontSize: 22 }}>{countdown}</span>
              </div>
            )}
          </div>
        )}
        {authDone && (
          <div style={{ margin: '0 20px 24px', background: 'white', borderRadius: 16, padding: '20px 24px', border: `1px solid ${GOLD}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.5 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</div>
          </div>
        )}
      </div>
    )
  }

  function BottomNav() {
    const tabs: { id: string; icon: IconName; label: string }[] = [
      { id: 'home', icon: 'church-home', label: 'Home' },
      { id: 'prayers', icon: 'prayer-hands', label: 'Prayers' },
      { id: 'journey', icon: 'map-pin', label: 'Journey' },
      { id: 'purchase', icon: 'shop-bag', label: 'Purchase' },
      { id: 'account', icon: 'user', label: 'Account' },
    ]
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: DARK, borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer',
            }}
          >
            <Icon name={tab.icon} size={22} color={activeTab === tab.id ? GOLD : 'rgba(255,255,255,0.4)'} bg={DARK} />
            <span style={{
              fontFamily: body, fontSize: 9, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: activeTab === tab.id ? GOLD : 'rgba(255,255,255,0.4)',
              fontWeight: activeTab === tab.id ? 700 : 400,
            }}>{tab.label}</span>
            {activeTab === tab.id && (
              <div style={{ width: 20, height: 2, background: GOLD, borderRadius: 1 }} />
            )}
          </button>
        ))}
      </div>
    )
  }

  if (status.screen === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: body, color: GRAY, fontStyle: 'italic' }}>Loading band journey...</div></div>
  }

  if (status.screen === 'not_found') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band not found</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY, marginBottom: 24 }}>
            We couldn&apos;t find a band with the ID <strong>{bandId}</strong>. Double-check the ID printed on your wristband.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/store" style={{ display: 'inline-block', background: GOLD, color: INK, textDecoration: 'none', fontFamily: serif, fontSize: 13, fontWeight: 700, padding: '12px 24px', borderRadius: 8 }}>Get a Prayer Band</a>
            <a href="/contact" style={{ display: 'inline-block', background: 'transparent', color: INK, textDecoration: 'none', fontFamily: serif, fontSize: 13, fontWeight: 700, padding: '12px 24px', borderRadius: 8, border: '1px solid rgba(10,22,40,0.18)' }}>Contact Support</a>
          </div>
        </div>
      </div>
    )
  }

  if (status.screen === 'error') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontFamily: body, fontSize: 14, color: GRAY, marginBottom: 24 }}>
            We had trouble loading your band. This is usually temporary.
          </div>
          <button onClick={() => window.location.reload()} style={{ background: GOLD, color: INK, border: 'none', fontFamily: serif, fontSize: 13, fontWeight: 700, padding: '12px 24px', borderRadius: 8, cursor: 'pointer' }}>Try Again</button>
        </div>
      </div>
    )
  }

  const regs = status.registrations ?? []

  if (status.screen === 'personal_space') {
    return (
      <div style={{ minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />

        {activeTab === 'home' && (
          <>
            {transferStep === 'pending' && <PendingBanner />}
            {transferComplete && (
              <div style={{ margin: '20px 20px 0', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
                <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band transferred</div>
                <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20 }}>Your band is now in new hands. The prayer chain continues. ✝</div>
                <a href="/dashboard" style={{ display: 'inline-block', background: GOLD, color: INK, padding: '12px 28px', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Go to Dashboard</a>
              </div>
            )}
            <div style={{ padding: '24px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700 }}>{bandId}</div>
                  <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginTop: 2 }}>{regs.length === 0 ? 'Just arrived' : 'Held by you'}</div>
                </div>
                {transferStep === 'idle' && !transferComplete && (
                  <button onClick={() => {
                    const accountless = !userId && localStorage.getItem(`holder_${bandId}`) === 'true'
                    setTransferStep(accountless ? 'save_prompt' : 'sheet')
                  }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: GOLD, color: INK, border: 'none', borderRadius: 10, padding: '10px 18px', fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>↗ Transfer Band</button>
                )}
              </div>
            </div>
            <VerseEngine />
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(44,24,16,0.08)' }}>
                <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700 }}>Prayer Journal</div>
                {prayerStep === 'list' && userId && <button onClick={() => setPrayerStep('form')} style={{ background: GOLD, color: INK, border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: serif, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>}
              </div>
              {!userId && (
                <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid rgba(44,24,16,0.1)', textAlign: 'center' }}>
                  <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Track your prayers</div>
                  <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>Create a free account to keep a prayer journal on this band.</div>
                  <button onClick={() => setShowSignup(true)} style={{ display: 'inline-block', background: GOLD, color: INK, padding: '10px 24px', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Create Account ✝</button>
                </div>
              )}
              {userId && prayerStep === 'form' && (
                <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid rgba(44,24,16,0.1)', marginBottom: 12 }}>
                  <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Prayer title</label>
                  <input value={prayerTitle} onChange={e => setPrayerTitle(e.target.value)} placeholder="What are you praying for?" style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
                  <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Details (optional)</label>
                  <textarea value={prayerBody} onChange={e => setPrayerBody(e.target.value)} placeholder="Share more about this prayer request..." rows={3} style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => {
                      if (!prayerTitle.trim()) return
                      setPrayerSubmitting(true)
                      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                      const { data } = await supabase.from('prayer_requests').insert({ user_id: userId, band_id: bandId, title: prayerTitle, body: prayerBody, status: 'active', visibility: 'private' }).select().single()
                      if (data) setPrayers(prev => [data, ...prev])
                      setPrayerTitle(''); setPrayerBody(''); setPrayerStep('list'); setPrayerSubmitting(false)
                    }} disabled={prayerSubmitting || !prayerTitle.trim()} style={{ flex: 1, padding: '10px', background: prayerTitle.trim() ? GOLD : '#ccc', color: INK, border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: prayerTitle.trim() ? 'pointer' : 'not-allowed' }}>
                      {prayerSubmitting ? 'Saving...' : 'Add Prayer ✝'}
                    </button>
                    <button onClick={() => setPrayerStep('list')} style={{ padding: '10px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
              {userId && prayerStep === 'answer' && answeringId && (
                <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: `1px solid ${GOLD}`, marginBottom: 12 }}>
                  <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>God answered this prayer ✝</div>
                  <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>Share what happened — your testimony encourages others.</div>
                  <textarea value={testimony} onChange={e => setTestimony(e.target.value)} placeholder="Share how God answered this prayer..." rows={3} style={{ display: 'block', width: '100%', padding: '10px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => {
                      setPrayerSubmitting(true)
                      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                      await supabase.from('prayer_requests').update({ status: 'answered', answered_testimony: testimony, answered_at: new Date().toISOString() }).eq('id', answeringId)
                      setPrayers(prev => prev.map(p => p.id === answeringId ? { ...p, status: 'answered', answered_testimony: testimony } : p))
                      setAnsweringId(null); setTestimony(''); setPrayerStep('list'); setPrayerSubmitting(false)
                    }} disabled={prayerSubmitting} style={{ flex: 1, padding: '10px', background: GOLD, color: INK, border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {prayerSubmitting ? 'Saving...' : 'Mark Answered ✝'}
                    </button>
                    <button onClick={() => { setPrayerStep('list'); setAnsweringId(null) }} style={{ padding: '10px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
              {userId && prayers.length === 0 && prayerStep === 'list' && (
                <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px dashed rgba(44,24,16,0.15)', textAlign: 'center', fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>No entries yet — tap + Add to begin ✝</div>
              )}
              {userId && prayerStep === 'list' && prayers.map(p => (
                <div key={p.id} style={{ background: p.status === 'answered' ? 'linear-gradient(135deg, rgba(26,74,58,0.05), white)' : 'white', borderRadius: 12, padding: '16px', marginBottom: 10, border: p.status === 'answered' ? `1px solid ${GREEN}` : '1px solid rgba(44,24,16,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, flex: 1 }}>{p.title}</div>
                    {p.status === 'answered'
                      ? <span style={{ background: 'rgba(26,74,58,0.12)', color: GREEN, fontFamily: body, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>Answered ✝</span>
                      : <button onClick={() => { setAnsweringId(p.id); setPrayerStep('answer') }} style={{ background: 'rgba(184,134,11,0.1)', color: GOLD, border: 'none', borderRadius: 20, fontFamily: body, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 10px', cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>Mark Answered</button>}
                  </div>
                  {p.body && <div style={{ fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.5, marginBottom: 4 }}>{p.body}</div>}
                  {p.answered_testimony && <div style={{ fontFamily: body, fontSize: 13, color: GREEN, fontStyle: 'italic', lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(26,74,58,0.1)' }}>"{p.answered_testimony}"</div>}
                  <div style={{ fontFamily: body, fontSize: 11, color: '#9A8A7A', marginTop: 6 }}>{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'prayers' && (
          <div style={{ padding: '24px 20px' }}>
            {userId ? (
              <PrayerTabs userId={userId} />
            ) : (
              <div style={{ background: 'white', borderRadius: 14, padding: '20px', border: '1px solid rgba(44,24,16,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div>
                <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sign in to use your Prayer Partners</div>
                <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>
                  Connect with others in prayer, share requests, and join circles.
                </div>
                <a href="/signin" style={{ display: 'inline-block', background: GOLD, color: INK, padding: '12px 28px', borderRadius: 10, fontFamily: serif, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign In ✝</a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'journey' && (
          <div style={{ padding: '0' }}>
            <PrayerChain regs={regs} />
          </div>
        )}

        {activeTab === 'purchase' && <PurchaseTab bandId={bandId} />}

        {activeTab === 'account' && (
          <div style={{ padding: '24px 20px' }}>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Account</div>
            {userId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="/dashboard" style={{ display: 'block', background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}>
                  📊 My Dashboard
                </a>
                <a href="/store" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}>
                  <Icon name="shop-bag" size={18} color={DARK} bg="white" /> Purchase More Bands
                </a>
                <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}>
                  <Icon name="settings" size={18} color={DARK} bg="white" /> Settings
                </a>
                <button onClick={async () => {
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.auth.signOut()
                  window.location.reload()
                }} style={{ display: 'block', width: '100%', background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: '#C0392B', textAlign: 'left', cursor: 'pointer' }}>
                  🚪 Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>Sign in to access your full account, prayer network, and all your bands.</div>
                <a href="/signin" style={{ display: 'block', textAlign: 'center', background: GOLD, color: INK, borderRadius: 12, padding: '16px 20px', fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Sign In ✝</a>
                <a href="/store" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}><Icon name="shop-bag" size={18} color={DARK} bg="white" /> Purchase Bands</a>
              </div>
            )}
          </div>
        )}

        {showSignup && (
          <div onClick={() => setShowSignup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: CREAM, borderRadius: '20px 20px 0 0', padding: '28px 24px 48px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <SuccessCard title="Save your place" subtitle="Create a free account to get your daily verse every time you tap, track your prayers, and follow this band's story." showCountdown={false} />
            </div>
          </div>
        )}

        {transferStep === 'save_prompt' && (
          <div onClick={() => setTransferStep('idle')} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FDFAF5', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12, color: GOLD }}>✝</div>
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: '#2C1A0E', textAlign: 'center', marginBottom: 10, lineHeight: 1.3 }}>Your place in this story matters</div>
              <div style={{ fontFamily: body, fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>You&rsquo;ve been part of this band&rsquo;s journey. Create a free account to preserve your prayer, your name in the chain, and follow where it goes next.</div>
              <button onClick={() => {
                localStorage.setItem(`pendingTransfer_${bandId}`, 'true')
                setTransferStep('idle')
                setShowSignup(true)
              }} style={{ display: 'block', width: '100%', padding: 15, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>Create Free Account</button>
              <button onClick={() => setTransferStep('sheet')} style={{ display: 'block', width: '100%', padding: 10, background: 'transparent', color: GRAY, border: 'none', fontFamily: body, fontSize: 13, cursor: 'pointer' }}>Continue Without Saving</button>
            </div>
          </div>
        )}

        {transferStep === 'sheet' && (
          <div onClick={() => setTransferStep('idle')} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: CREAM, borderRadius: '20px 20px 0 0', padding: '28px 24px 48px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Pass This Band On</div>
              <div style={{ fontFamily: body, fontSize: 14, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>Write a prayer or note for the person you're giving this to.</div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer for them (optional)</label>
              <textarea value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="e.g. I'm giving you this band because I've been praying for you..." rows={3} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: 'white', resize: 'none', marginBottom: 16, outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <button onClick={handleInitiateTransfer} disabled={submitting} style={{ display: 'block', width: '100%', padding: 15, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>{submitting ? 'Setting up...' : 'Ready to hand it off →'}</button>
              <button onClick={() => setTransferStep('idle')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ height: 100 }} />
        <BottomNav />
      </div>
    )
  }

  if (status.screen === 'incoming_transfer') {
    return (
      <div style={{ minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />
        {claimStep === 'prompt' && (
          <div style={{ margin: '24px 20px', background: `linear-gradient(160deg, ${NAVY}, ${NAVY_LT})`, borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{status.senderName ? `${status.senderName} is passing this band to you` : 'Someone is passing this band to you'}</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.8, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>This band has traveled through {regs.length} {regs.length === 1 ? 'person' : 'people'}. Now it's being offered to you.</div>
            {status.transfer?.note && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.transfer.note}"</div>}
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>Accept this band →</button>
            <button onClick={() => setClaimStep('view')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Just view the journey</button>
          </div>
        )}
        {claimStep === 'view' && (
          <div style={{ margin: '24px 20px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 12 }}>Take your time. When you&apos;re ready, you can accept the band.</div>
            <button onClick={() => setClaimStep('form')} style={{ display: 'inline-block', padding: '13px 28px', background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Accept this band →</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="You're joining the chain ✝" subtitle="Add your name and a prayer to complete the handoff." submitLabel="Accept & add my prayer ✝" onSubmit={handleAcceptTransfer} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="The band is yours now" subtitle="You've been added to the prayer chain. Every time you tap this band, you'll see the full journey — and when you're ready, you can pass it on too." />}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'first_tap_gift') {
    return (
      <div style={{ minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        {claimStep === 'prompt' && (
          <div style={{ margin: '24px 20px', background: 'linear-gradient(135deg, #1a4a3a, #2E7D6B)', borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✝</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{status.dedicatorName ? `${status.dedicatorName} is praying for you` : 'Someone is praying for you'}</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>This band was sent to you as an act of prayer. You are not forgotten.</div>
            {status.band?.dedication_note && <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.band.dedication_note}"</div>}
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>This band is mine now →</button>
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Just add a prayer</button>
          </div>
        )}
        <NetworkConnectPrompt bandId={bandId} />
        {claimStep === 'form' && <ClaimForm title="Join the Journey" subtitle="Your prayer becomes part of this band's story forever." submitLabel="Add my prayer to this band ✝" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="You're part of this story" subtitle="Your prayer has been woven into this band's journey. When you pass it on, they'll see every prayer that came before — including yours." />}
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'journey') {
    return (
      <div style={{ minHeight: '100vh', fontFamily: body, color: DARK }}>
        <Nav />
        <StatsStrip regs={regs} />
        <div style={{ padding: '24px 20px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>✝ Prayer Band Journey</div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{bandId}</div>
          <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>Currently held by {status.currentHolder?.user_name ?? 'someone'} in {status.currentHolder?.city ?? 'the world'}</div>
        </div>
        <NetworkConnectPrompt bandId={bandId} />
        {claimStep === 'prompt' && (
          <div style={{ margin: '20px 20px 0', background: 'white', borderRadius: 14, padding: '18px 20px', border: `1px solid ${GOLD}`, textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Do you now have this band?</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>If this band was passed to you, join the chain.</div>
            <button onClick={() => setClaimStep('form')} style={{ padding: '10px 24px', background: GOLD, color: INK, border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>I now have this band →</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="Join the Chain" subtitle="Add your name and prayer to continue this band's journey." submitLabel="Join the chain ✝" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard title="Welcome to the chain" subtitle="Your prayer has been added. Tap your band any time to see the full journey." />}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  if (status.screen === 'incoming_gift' && !giftAcknowledged) {
    return (
      <IncomingGiftScreen
        bandId={bandId}
        recipient={status.band?.dedication_recipient}
        note={status.band?.dedication_note}
        onProceed={() => setGiftAcknowledged(true)}
      />
    )
  }

  return (
    <div style={{ background: DARK, minHeight: '100vh', fontFamily: body, color: 'white' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Logo size={28} color="#fff" withName nameColor="#fff" nameSize={18} />
        <span style={{ fontFamily: body, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{bandId}</span>
      </nav>

      {claimStep === 'prompt' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px 28px 140px', textAlign: 'center' }}>

          {/* Cross */}
          <div style={{ fontSize: 56, marginBottom: 24, color: GOLD }}>✝</div>

          {/* Main message */}
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 16, lineHeight: 1.3, maxWidth: 320 }}>
            Every prayer begins somewhere.
          </div>
          <div style={{ fontFamily: body, fontSize: 15, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 32, maxWidth: 340 }}>
            This band is yours. What you carry, who you pass it to, the prayers you leave along the way — it starts here, with you.
          </div>

          {/* Verse */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 24px', marginBottom: 40, maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily: serif, fontSize: 15, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>
              "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do."
            </div>
            <div style={{ fontFamily: body, fontSize: 12, color: GOLD, letterSpacing: '0.1em' }}>EPHESIANS 2:10</div>
          </div>

          {/* CTA */}
          <button
            onClick={() => setClaimStep('form')}
            style={{
              padding: '16px 40px', background: GOLD, color: INK,
              border: 'none', borderRadius: 12, fontFamily: serif,
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(184,134,11,0.3)',
            }}
          >
            Begin your journey →
          </button>

          {userId && status.band && !status.band.owner_id && (
            <button
              onClick={claimToAccount}
              disabled={claimingOwnership}
              style={{ marginTop: 16, padding: '12px 28px', background: 'transparent', color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 10, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              {claimingOwnership ? 'Claiming…' : '+ Claim this band to my account'}
            </button>
          )}

          <div style={{ marginTop: 20, fontFamily: body, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {bandId}
          </div>
        </div>
      )}

      {claimStep === 'form' && (
        <div style={{ background: CREAM }}>
          <ClaimForm
            title="Start the Journey"
            subtitle="Your prayer is the first link in this band's chain."
            submitLabel="Begin the journey ✝"
            onSubmit={handleClaim}
            onBack={() => setClaimStep('prompt')}
            claimName={claimName}
            setClaimName={setClaimName}
            claimPrayer={claimPrayer}
            setClaimPrayer={setClaimPrayer}
            claimCity={claimCity}
            setClaimCity={setClaimCity}
            claimState={claimState}
            setClaimState={setClaimState}
            claimCountry={claimCountry}
            setClaimCountry={setClaimCountry}
            submitting={submitting}
          />
        </div>
      )}

      {claimStep === 'done' && (
        <div style={{ background: CREAM }}>
          <SuccessCard title="The journey has begun" subtitle="Your prayer is the first in this band's chain. Every person who holds it next will see what you wrote today." />
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  )
}