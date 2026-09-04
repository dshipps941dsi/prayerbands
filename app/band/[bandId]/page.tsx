'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'
import { escapeHtml } from '@/lib/escape-html'
import Icon, { type IconName } from '@/components/Icon'
import AvatarBadge from '@/components/AvatarBadge'
import NotificationsPanel from '@/components/NotificationsPanel'
import NetworkConnectPrompt from '@/components/NetworkConnectPrompt'
import PrayerTabs from '@/components/PrayerTabs'
import FocusOverlay from '@/components/FocusOverlay'
import ReachMap from '@/components/ReachMap'
import PurchaseTab from '@/components/PurchaseTab'
import { useApplyTheme } from '@/components/ThemeProvider'
import SuccessCard from './screens/SuccessCard'
import { COUNTRIES, subdivisionsFor } from '@/lib/locations'
import { publicName } from '@/lib/public-name'
import { track } from '@/lib/analytics'
import { CATEGORIES, getVerseForCategory, verseSlug } from '@/lib/verses'
import { recordVerseView, type VerseWalk } from '@/lib/verseWalk'
import WalkLine from '@/components/band/WalkLine'

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
  // Sent top-level, NOT on `band` — /api/band-status strips the blessing from
  // the public band object and returns it only on the incoming_gift screen.
  dedicationNote?: string | null
  dedicationRecipient?: string | null
  // Who put this band into circulation. A display name only — never the
  // attribution email.
  uplineName?: string | null
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
// Bottom-nav colors come from dedicated tab-bar tokens so a theme controls the
// footer background and its active icon independently — otherwise the black
// theme's near-black text color became the footer bg and the primary vanished.
const TAB_BG       = 'var(--pb-tab-bar, #1a2a4a)'
const TAB_ACTIVE   = 'var(--pb-tab-active, var(--pb-primary, #C8A96E))'
const TAB_INACTIVE = 'color-mix(in srgb, var(--pb-tab-active, #C8A96E) 46%, transparent)'
// Logo colors — the mark and the two words ("Prayer" / "bands") are themeable
// independently, falling back to sensible defaults from the core palette.
const LOGO_MARK   = 'var(--pb-logo-mark, #3D5A73)'
const LOGO_PRAYER = 'var(--pb-logo-prayer, var(--pb-text, #2C1810))'
const LOGO_BANDS  = 'var(--pb-logo-bands, var(--pb-primary, #9A7A35))'
const serif = "'Playfair Display', Georgia, serif"
// Body/UI text uses a sans stack — serif (above) is reserved for large
// headings/verses; small serif body text was hard to read.
const body  = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

// Give $2 / Get $2 referral promo — a ~60-day test from 2026-08-27. After this
// date the Home banner stops showing (the referral mechanics keep working).

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
          {/* A dropdown where "state" is a real concept, free text elsewhere —
              France has départements, Japan prefectures. A valid subdivision is
              what guarantees the map pin: even a misspelled city falls back to
              the state centroid instead of resolving to nothing. */}
          <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>
            {subdivisionsFor(claimCountry)?.label ?? 'Region'} {subdivisionsFor(claimCountry) ? '*' : '(optional)'}
          </label>
          {subdivisionsFor(claimCountry) ? (
            <select value={claimState} onChange={e => setClaimState(e.target.value)} style={{ display: 'block', width: '100%', padding: '12px 10px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }}>
              <option value="">Select…</option>
              {subdivisionsFor(claimCountry)!.items.map(s => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input value={claimState} onChange={e => setClaimState(e.target.value)} placeholder="Region" style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: CREAM, outline: 'none', boxSizing: 'border-box' }} />
          )}
        </div>
      </div>
      <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Country *</label>
      <select
        value={claimCountry}
        // Changing country invalidates any subdivision picked under the old one.
        onChange={e => { setClaimCountry(e.target.value); setClaimState('') }}
        style={{ display: 'block', width: '100%', padding: '12px 10px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
      >
        {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
      </select>
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
  // Admin's own email, so the Account tab can offer a way into the control
  // centre. Everything now routes to the band view, which left /admin reachable
  // only by typing the URL.
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [claimName, setClaimName] = useState('')
  const [claimCity, setClaimCity] = useState('')
  const [claimState, setClaimState] = useState('')
  const [claimCountry, setClaimCountry] = useState('United States')
  const [claimPrayer, setClaimPrayer] = useState('')
  const [showSignup, setShowSignup] = useState(false)
  const [claimStep, setClaimStep] = useState<'prompt' | 'form' | 'done' | 'view'>('prompt')
  const [transferNote, setTransferNote] = useState('')
  const [transferName, setTransferName] = useState('')  // who the band is being passed to
  const [transferStep, setTransferStep] = useState<'idle' | 'sheet' | 'pending' | 'save_prompt'>('idle')
  const [transferComplete, setTransferComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)
  const [verseCategory, setVerseCategory] = useState('all')
  const [activeTab, setActiveTab] = useState<'home' | 'journey' | 'purchase' | 'account'>('home')
  // Full-screen focus mode: meditate on the verse, or the journal with nothing else.
  const [focus, setFocus] = useState<null | 'verse' | 'prayer'>(null)
  // Auto-hiding bottom nav: hidden on load for a clean first view, revealed
  // when the user scrolls up (to navigate), tucked away again on scroll down.
  // The bottom nav is the main navigation, so it's always visible. Only the top
  // header auto-hides: it slides away as you scroll down to read and returns
  // when you scroll back up (and is always shown at the top of the page).
  const [headerHidden, setHeaderHidden] = useState(false)
  // Journey tab: this band's direct line, or the whole reach web.
  const [journeyView, setJourneyView] = useState<'band' | 'reach'>('band')
  const [credit, setCredit] = useState<{ balance_cents: number; referrals: number; code: string | null; expires_at: string | null } | null>(null)
  const [refShared, setRefShared] = useState(false)
  const [verseShared, setVerseShared] = useState(false)
  const [myProfile, setMyProfile] = useState<{ avatar_icon: string | null; full_name: string | null; avatar_initials: string | null; avatar_font: string | null } | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [claimingOwnership, setClaimingOwnership] = useState(false)
  const [unread, setUnread] = useState(0)
  const [msgsOpen, setMsgsOpen] = useState(false)  // "My Messages" accordion on the Account tab
  // Bands this person owns or holds, for the header switcher.
  const [myBands, setMyBands] = useState<{ band_id: string; label: string | null }[]>([])
  const [defaultBandId, setDefaultBandId] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [walk, setWalk] = useState<VerseWalk>({ total: 0, run: 0, returning: false })

  // Apply this band's color theme (CSS variables on :root).
  // Colour matters here: the plain bands all carry theme 'default', so without
  // it a Pink or Black theme created in the admin would style none of them.
  //
  // ?previewTheme=<key> lets an admin see any theme on this real page without
  // changing the band — purely a visual override, read after mount so it never
  // affects the server render or the band's stored theme.
  const [previewTheme] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('previewTheme')
  )
  useApplyTheme(
    previewTheme ?? status.band?.theme,
    previewTheme ? null : (status.band as { color?: string } | undefined)?.color
  )

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
    supabase.auth.getUser().then(({ data }) => { setUserId(data?.user?.id ?? null); setUserEmail(data?.user?.email ?? null) })
  }, [])

  // Unread notification count for the bell (signed-in account holders only).
  useEffect(() => {
    if (!userId) { setUnread(0); return }
    fetch('/api/my-notifications')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnread(d.unread || 0) })
      .catch(() => {})
  }, [userId])

  // Claim an unowned band for whoever is signed in and holding it.
  //
  // The OTP path claims explicitly after verifying the code, but signing in
  // with Google or Facebook returns here without ever doing so — which left
  // two real accounts (Jackson, Brinley) signed up but owning nothing, their
  // band still showing owner_id null and untransferable. Claiming on load
  // covers every route back, not just the one we remembered to instrument.
  //
  // /api/claim-band does the guarding: it refuses a band owned by someone else
  // or actively held by a different account, so this cannot take a band that
  // is not theirs.
  //
  // But an untouched band has no holder to compare against, so those guards let
  // it through — and merely opening the page claimed it. PB-SCSXD was given
  // away, then silently re-claimed two minutes later by its own giver opening
  // the link to check the dedication read well. Had it shipped that way, Chris
  // would have made an account and been told the band belonged to someone else.
  //
  // Requiring a registration is what separates the two cases. This exists to
  // recover a stop somebody made as a guest and then signed in to keep, so with
  // no registration there is nothing to recover and nothing to infer: an
  // account being signed in on the phone that opened the link says nothing
  // about who the band is for. Every account this was written for — Jackson's,
  // Brinley's — registered first and signed in after, so all of them still
  // claim on the way back.
  useEffect(() => {
    if (!userId || !status.band) return
    if (status.band.owner_id) return
    if (!status.registrations?.length) return
    fetch('/api/claim-band', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bandId }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, status.band?.band_id, status.band?.owner_id, status.registrations?.length])

  // Bands available in the header switcher. Signed-out visitors get none, so
  // the control stays hidden for anyone tapping a stranger's band.
  useEffect(() => {
    if (!userId) { setMyBands([]); return }
    fetch('/api/my-bands')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bands) { setMyBands(d.bands); setDefaultBandId(d.default_band_id ?? null) } })
      .catch(() => {})
  }, [userId])

  // Pin (or unpin) this band as the one the installed app opens to.
  function toggleDefaultBand() {
    const next = defaultBandId === bandId ? null : bandId
    setDefaultBandId(next) // optimistic
    fetch('/api/set-default-band', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bandId }),
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setDefaultBandId(d.default_band_id ?? null) }).catch(() => {})
  }

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

  // Auto-hide only the top header: hide it as you scroll DOWN (more room to
  // read), bring it back as you scroll UP, and always show it at the very top.
  // The bottom nav never moves. Threshold avoids flicker on tiny scrolls.
  useEffect(() => {
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0
    const onScroll = () => {
      const y = window.scrollY
      if (y <= 4) { setHeaderHidden(false); lastY = y; return } // at top: header always shown
      if (Math.abs(y - lastY) < 8) return
      setHeaderHidden(y > lastY) // scroll down -> hide header; scroll up -> show it
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The signed-in person's avatar + name, for the account header and nav.
  useEffect(() => {
    if (!userId) { setMyProfile(null); return }
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.from('profiles').select('avatar_icon, full_name, avatar_initials, avatar_font').eq('id', userId).maybeSingle()
      .then(({ data }) => setMyProfile(data ? { avatar_icon: (data as any).avatar_icon ?? null, full_name: (data as any).full_name ?? null, avatar_initials: (data as any).avatar_initials ?? null, avatar_font: (data as any).avatar_font ?? null } : null))
    fetch('/api/me/role').then(r => r.json()).then(d => setMyRole(d.role ?? null)).catch(() => setMyRole(null))
  }, [userId])

  // Referral credit + code — fetched once signed in, so the Home promo banner
  // and the Account tab both have it.
  useEffect(() => {
    if (!userId || credit) return
    fetch('/api/my-credit')
      .then(r => r.json())
      .then(d => setCredit({ balance_cents: d.balance_cents ?? 0, referrals: d.referrals ?? 0, code: d.code ?? null, expires_at: d.expires_at ?? null }))
      .catch(() => {})
  }, [userId, credit])

  // Share your referral link the easy way. On a phone the share sheet covers
  // Messages, Facebook, Mail, WhatsApp — every channel in one tap — with the
  // message and the /store?ref=<code> link already written, so tapping it lands
  // the friend on the store with the discount applied. Desktop copies it.
  async function shareReferral() {
    if (!credit?.code) return
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'
    // Land them on the home page — the code is captured site-wide and follows
    // them to checkout, so the link is a warm invitation, not a store push.
    const link = `${origin}/?ref=${encodeURIComponent(credit.code)}`
    const message = `Join me in prayer with your first Prayer Band 🙏 Here's $2 off to begin — tap: ${link}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Join me in prayer', text: message }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(message) } catch {}
    setRefShared(true); setTimeout(() => setRefShared(false), 1800)
  }

  // Share the day's verse — the text and reference, with a nudge to the site so
  // whoever receives it can get a band of their own. Native sheet on mobile,
  // clipboard on desktop.
  async function shareVerse() {
    const v = getVerseForCategory(verseCategory)
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'
    // Land recipients on the public verse page — it shows this exact verse with
    // no band or account needed, and carries the sharer's referral code so a
    // shared verse can also earn credit if they later get a band.
    const link = `${origin}/verse?v=${verseSlug(v.ref)}${credit?.code ? `&ref=${encodeURIComponent(credit.code)}` : ''}`
    // Keep the link out of the text — the share sheet appends `url` itself, so
    // putting it in both shows it twice.
    const message = `"${v.text}" — ${v.ref}\n\nA daily verse from Prayer Bands 🙏`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: v.ref, text: message, url: link }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(`${message} ${link}`) } catch {}
    setVerseShared(true); setTimeout(() => setVerseShared(false), 1800)
  }

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
      // No auto-reload. This screen is where someone creates their account, and
      // an 8s timer tore them off it mid-signup — long before they could enter
      // an email, wait for a code and type it. Moving on is now their choice.
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
        body: JSON.stringify({ bandId, note: transferNote, recipientName: transferName }),
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
      // No auto-reload. This screen is where someone creates their account, and
      // an 8s timer tore them off it mid-signup — long before they could enter
      // an email, wait for a code and type it. Moving on is now their choice.
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function Nav() {
    const currentHolder = status.registrations?.[status.registrations.length - 1]
    return (
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))', paddingRight: 24, paddingBottom: 16, paddingLeft: 24, borderBottom: '1px solid rgba(44,24,16,0.1)', background: 'rgba(250,246,239,0.97)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', position: 'sticky', top: 0, zIndex: 100, transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)', transition: 'transform 0.3s ease' }}>
        <button
          onClick={() => { setActiveTab('home'); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          aria-label="Go to home"
          style={{ display: 'inline-flex', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', alignItems: 'center' }}
        >
          <Logo size={28} withName nameColor={LOGO_PRAYER} nameColorAlt={LOGO_BANDS} markColor={LOGO_MARK} nameSize={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Band switcher. Only appears once someone holds more than one —
              matching a band to an outfit means carrying several — so a single
              -band holder sees no extra chrome. Selecting one opens that band's
              own view rather than routing through the dashboard. */}
          {myBands.length > 1 && (
            <select
              aria-label="Switch band"
              value={bandId}
              onChange={e => { if (e.target.value !== bandId) window.location.href = `/band/${e.target.value}` }}
              style={{ fontFamily: serif, fontSize: 13, fontWeight: 700, color: DARK, background: 'white', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', maxWidth: 130 }}
            >
              {myBands.map(b => (
                <option key={b.band_id} value={b.band_id}>
                  {b.band_id}{b.label ? ` · ${b.label}` : ''}
                </option>
              ))}
            </select>
          )}
          {myBands.length > 1 && (
            <button onClick={toggleDefaultBand}
              aria-label={defaultBandId === bandId ? 'This is your default band — tap to unset' : 'Set as your default band'}
              title={defaultBandId === bandId ? 'The app opens to this band — tap to unset' : 'Make this the band the app opens to'}
              style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={defaultBandId === bandId ? GOLD : 'none'} stroke={defaultBandId === bandId ? GOLD : GRAY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.9 6.26L21.5 9.2l-4.75 4.64L17.9 21 12 17.6 6.1 21l1.15-7.16L2.5 9.2l6.6-.94z"/></svg>
            </button>
          )}
          {myBands.length <= 1 && (
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: GRAY, letterSpacing: '0.06em' }}>{bandId}</span>
          )}
          {userId ? (
            <button onClick={() => setNotifOpen(true)} aria-label="Notifications" title="Notifications" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Icon name="mail" size={22} color="var(--pb-primary, #C8A96E)" bg="#FAF6EF" />
              {unread > 0 && <span style={{ position: 'absolute', top: -7, right: -9, background: '#E5484D', color: '#fff', border: '1.5px solid #fff', borderRadius: 10, minWidth: 17, height: 17, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>{unread}</span>}
            </button>
          ) : (
            <a href={`/signin?redirect=${encodeURIComponent(`/band/${bandId}`)}`} style={{ fontFamily: serif, fontSize: 13, fontWeight: 700, color: INK, background: GOLD, textDecoration: 'none', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '7px 16px', whiteSpace: 'nowrap' }}>Sign in</a>
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
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✝︎</div>
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
        {/* Topic chips sit above the verse card — pick a feeling, then the
            card below shows a verse for it. Breaks up the Home sections. */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, marginBottom: 12, paddingBottom: 2, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setVerseCategory(cat.id)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 12, fontWeight: 600, background: verseCategory === cat.id ? GOLD : 'white', color: verseCategory === cat.id ? INK : GRAY, boxShadow: '0 1px 4px rgba(44,24,16,0.1)', transition: 'all 0.2s' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <div onClick={() => setFocus('verse')} role="button" tabIndex={0} aria-label="Meditate on this verse full screen"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocus('verse') } }}
          style={{ position: 'relative', background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LT})`, borderRadius: 14, padding: '24px 20px', color: 'white', textAlign: 'center', cursor: 'pointer' }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
          </div>
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            {verseCategory === 'all' ? "Today's Verse" : CATEGORIES.find(c => c.id === verseCategory)?.label}
          </div>
          <div style={{ fontFamily: serif, fontSize: 17, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 12 }}>"{verse.text}"</div>
          <div style={{ fontFamily: body, fontSize: 13, opacity: 0.7, fontWeight: 600, marginBottom: 16 }}>{verse.ref}</div>
          <button
            onClick={e => { e.stopPropagation(); shareVerse() }}
            aria-label="Share this verse"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.14)', color: 'white', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 9, padding: '8px 16px', fontFamily: body, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {verseShared ? 'Copied' : 'Share verse'}
          </button>
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
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' }).addTo(map)
        const latlngs: any[] = []
        const markers: any[] = []
        valid.forEach(p => {
          const ll = [p.latitude as number, p.longitude as number]
          latlngs.push(ll)
          const dot = L.divIcon({ className: '', html: `<div style="width:12px;height:12px;background:${gold};border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] })
          const m = L.marker(ll, { icon: dot }).addTo(map)
          // Names and places are typed by whoever registered the stop, and
          // bindPopup takes raw HTML, so both are escaped before going in.
          m.bindPopup(`<div style="font-family:Georgia,serif;font-size:13px"><strong>${escapeHtml(publicName(p.user_name, "Someone"))}</strong>${(p.city || p.country) ? `<br/><span style="color:#5C6573">${escapeHtml([p.city, p.country].filter(Boolean).join(', '))}</span>` : ''}</div>`)
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
        {/* Where the band came from, above the stops. Shown as its own line
            rather than a fake registration: whoever put it into circulation did
            not necessarily hold it or leave a prayer, so inventing a stop for
            them would put something in the journey that never happened. */}
        {status.uplineName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px dashed rgba(44,24,16,0.12)' }}>
            <span style={{ fontSize: 18, color: GOLD }}>✝︎</span>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY }}>
              Given by <strong style={{ color: DARK, fontFamily: serif, fontSize: 15 }}>{status.uplineName}</strong>
            </div>
          </div>
        )}
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


  function BottomNav() {
    const tabs: { id: string; icon: IconName; label: string }[] = [
      { id: 'home', icon: 'church-home', label: 'Home' },
      { id: 'journey', icon: 'map-pin', label: 'Journey' },
      { id: 'purchase', icon: 'shop-bag', label: 'Purchase' },
      { id: 'account', icon: 'user', label: 'Account' },
    ]
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: TAB_BG, borderTop: '1px solid color-mix(in srgb, var(--pb-tab-active, #C8A96E) 22%, transparent)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
        transform: 'translateY(0)', // bottom nav is always visible — it's the main navigation
        transition: 'transform 0.25s ease',
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
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {tab.id === 'account' && myProfile?.avatar_icon ? (
                <span style={{ fontSize: 20, lineHeight: '22px', height: 22, display: 'flex', alignItems: 'center', opacity: activeTab === tab.id ? 1 : 0.5 }}>{myProfile.avatar_icon}</span>
              ) : (
                <Icon name={tab.icon} size={22} color={activeTab === tab.id ? TAB_ACTIVE : TAB_INACTIVE} bg={TAB_BG} />
              )}
              {tab.id === 'account' && unread > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -9, background: '#E5484D', color: '#fff', border: `1.5px solid ${TAB_BG}`, borderRadius: 10, minWidth: 16, height: 16, fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>{unread}</span>
              )}
            </div>
            <span style={{
              fontFamily: body, fontSize: 9, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: activeTab === tab.id ? TAB_ACTIVE : TAB_INACTIVE,
              fontWeight: activeTab === tab.id ? 700 : 400,
            }}>{tab.label}</span>
            {activeTab === tab.id && (
              <div style={{ width: 20, height: 2, background: TAB_ACTIVE, borderRadius: 1 }} />
            )}
          </button>
        ))}
        {/* Link out to the full marketing website (the logo now stays in-app). */}
        <a
          href="/"
          aria-label="Full Prayer Bands website"
          style={{ flex: 1, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={TAB_INACTIVE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span style={{ fontFamily: body, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: TAB_INACTIVE, fontWeight: 400 }}>Website</span>
        </a>
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
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝︎</div>
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
          <div style={{ fontSize: 40, marginBottom: 16 }}>✝︎</div>
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
      // Bottom padding clears the always-visible fixed BottomNav so the last
      // content on any tab (e.g. the Purchase cart / checkout) isn't hidden behind it.
      <div style={{ minHeight: '100vh', fontFamily: body, color: DARK, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <Nav />

        {activeTab === 'home' && (
          <>
            {transferStep === 'pending' && <PendingBanner />}
            {transferComplete && (
              <div style={{ margin: '20px 20px 0', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
                <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Band transferred</div>
                <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20 }}>Your band is now in new hands. The prayer chain continues. ✝︎</div>
                <a href="/my-band" style={{ display: 'inline-block', background: GOLD, color: INK, padding: '12px 28px', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Follow its journey</a>
              </div>
            )}
            <div style={{ padding: '14px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(regs.length ? regs[regs.length - 1].user_name : '') || 'My Prayer Band'}</div>
                {transferStep === 'idle' && !transferComplete && (
                  <button onClick={() => {
                    const accountless = !userId && localStorage.getItem(`holder_${bandId}`) === 'true'
                    setTransferStep(accountless ? 'save_prompt' : 'sheet')
                  }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: GOLD, color: INK, border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: serif, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>↗ Transfer Band</button>
                )}
              </div>
            </div>
            <VerseEngine />

            <div style={{ padding: '20px 20px 40px' }}>
              {userId ? (
                <PrayerTabs userId={userId} onExpand={() => setFocus('prayer')} />
              ) : (
                <div style={{ background: 'white', borderRadius: 14, padding: '20px', border: '1px solid rgba(44,24,16,0.1)', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🙏</div>
                  <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sign in to keep your prayer journal</div>
                  <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>Your journal, prayer partners, and circles — all in one place.</div>
                  <a href={`/signin?redirect=${encodeURIComponent(`/band/${bandId}`)}`} style={{ display: 'inline-block', background: GOLD, color: INK, padding: '12px 28px', borderRadius: 10, fontFamily: serif, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign In ✝︎</a>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'journey' && (
          <div>
            <div style={{ display: 'flex', gap: 4, background: 'white', border: '1px solid rgba(44,24,16,0.1)', borderRadius: 12, padding: 4, margin: '20px 20px 0' }}>
              {([['band', 'The Journey'], ['reach', 'The Ripple']] as const).map(([id, label]) => {
                const on = journeyView === id
                return (
                  <button key={id} onClick={() => setJourneyView(id)}
                    style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: 9, background: on ? GOLD : 'transparent', color: on ? INK : GRAY, fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: serif, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {label}
                  </button>
                )
              })}
            </div>
            {journeyView === 'band' ? <PrayerChain regs={regs} /> : <ReachMap bandId={bandId} />}
          </div>
        )}

        {activeTab === 'purchase' && <PurchaseTab bandId={bandId} />}

        {activeTab === 'account' && (
          <div style={{ padding: '24px 20px' }}>
            {userId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <AvatarBadge icon={myProfile?.avatar_icon} initials={myProfile?.avatar_initials} font={myProfile?.avatar_font} name={myProfile?.full_name || (regs.length ? regs[regs.length - 1].user_name : '')} size={48} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myProfile?.full_name || 'Account'}</div>
                  <a href="/settings" style={{ fontFamily: body, fontSize: 12, color: GOLD, textDecoration: 'none' }}>Edit avatar &amp; profile →</a>
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Account</div>
            )}
            {userId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {credit && (credit.balance_cents > 0 || credit.referrals > 0 || credit.code) && (
                  <div style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LT})`, borderRadius: 12, padding: '18px 20px', color: 'white' }}>
                    <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 6 }}>Store credit</div>
                    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                      ${(credit.balance_cents / 100).toFixed(2)}
                    </div>
                    <div style={{ fontFamily: body, fontSize: 13, opacity: 0.85, marginTop: 8, lineHeight: 1.5 }}>
                      {credit.balance_cents > 0
                        ? 'Comes off your next order automatically — from referrals and any subscription.'
                        : 'Share your code below. When someone orders with it, credit lands here.'}
                    </div>
                    {credit.expires_at && credit.balance_cents > 0 && (
                      <div style={{ fontFamily: body, fontSize: 12.5, opacity: 0.8, marginTop: 8 }}>
                        Use it by {new Date(credit.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
                      </div>
                    )}
                    {credit.code && (
                      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.14)', borderRadius: 9, padding: '11px 13px', fontFamily: 'ui-monospace, monospace', fontSize: 15, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {credit.code}
                        </div>
                        <button onClick={shareReferral} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'white', color: NAVY, border: 'none', borderRadius: 9, padding: '11px 16px', fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          {refShared ? 'Copied' : 'Share'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* My Messages — the same feed as the top mailbox, collapsed by
                    default. Expanding mounts the feed, which marks messages seen
                    (clears the tab + mailbox badge). */}
                <div style={{ background: 'white', borderRadius: 12, padding: '4px 18px', border: '1px solid rgba(44,24,16,0.1)' }}>
                  <button onClick={() => setMsgsOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', padding: '14px 0', cursor: 'pointer', textAlign: 'left' }}>
                    <Icon name="mail" size={18} color={DARK} bg="white" />
                    <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: DARK }}>My Messages</span>
                    {unread > 0 && <span style={{ background: '#E5484D', color: '#fff', borderRadius: 10, minWidth: 18, height: 18, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unread}</span>}
                    <span style={{ marginLeft: 'auto', color: GRAY, fontSize: 13, transform: msgsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  {msgsOpen && (
                    <div style={{ paddingBottom: 12 }}>
                      <NotificationsPanel inline open={false} onClose={() => {}} userId={userId} onSeen={() => setUnread(0)} />
                    </div>
                  )}
                </div>
                <a href="/dashboard" style={{ display: 'block', background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}>
                  📊 My Dashboard
                </a>
                {(myRole === 'admin' || myRole === 'fulfillment') && (
                  <a href={myRole === 'admin' ? '/admin' : '/fulfill'} style={{ display: 'block', background: 'white', borderRadius: 12, padding: '16px 20px', border: `1px solid ${GOLD}`, fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}>
                    {myRole === 'admin' ? '⚙️ Admin Control Centre' : '📦 Fulfillment'}
                  </a>
                )}
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
                <a href="/signin" style={{ display: 'block', textAlign: 'center', background: GOLD, color: INK, borderRadius: 12, padding: '16px 20px', fontFamily: serif, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>Sign In ✝︎</a>
                <a href="/store" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(44,24,16,0.1)', fontFamily: serif, fontSize: 15, fontWeight: 600, color: DARK, textDecoration: 'none' }}><Icon name="shop-bag" size={18} color={DARK} bg="white" /> Purchase Bands</a>
              </div>
            )}
          </div>
        )}

        {showSignup && (
          <div onClick={() => setShowSignup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: CREAM, borderRadius: '20px 20px 0 0', padding: '28px 24px 48px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <SuccessCard bandId={bandId} userId={userId} title="Save your place" subtitle="Create a free account to get your daily verse every time you tap, track your prayers, and follow this band's story." showCountdown={false} />
            </div>
          </div>
        )}

        {transferStep === 'save_prompt' && (
          <div onClick={() => setTransferStep('idle')} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.4)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#FDFAF5', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(44,24,16,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12, color: GOLD }}>✝︎</div>
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
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Who is this for? (optional)</label>
              <input value={transferName} onChange={e => setTransferName(e.target.value)} placeholder="Their name — e.g. Sarah" maxLength={80} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: 'white', marginBottom: 14, outline: 'none', boxSizing: 'border-box' }} />
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Your prayer for them (optional)</label>
              <textarea value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="e.g. I'm giving you this band because I've been praying for you..." rows={3} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 14, color: DARK, background: 'white', resize: 'none', marginBottom: 16, outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <button onClick={handleInitiateTransfer} disabled={submitting} style={{ display: 'block', width: '100%', padding: 15, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>{submitting ? 'Setting up...' : 'Ready to hand it off →'}</button>
              <button onClick={() => setTransferStep('idle')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ height: 100 }} />
        <BottomNav />

        {/* Full-screen focus: meditate on the verse, or the journal alone. */}
        {focus === 'verse' && (() => {
          const v = getVerseForCategory(verseCategory)
          return (
            <FocusOverlay onClose={() => setFocus(null)} closeColor="rgba(255,255,255,0.85)"
              background={`radial-gradient(120% 80% at 50% 0%, ${NAVY_LT} 0%, ${NAVY} 55%, #060D1A 100%)`}>
              <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 30px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, marginBottom: 28 }}>
                  {verseCategory === 'all' ? "Today's Verse" : CATEGORIES.find(c => c.id === verseCategory)?.label}
                </div>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 'clamp(24px, 6.2vw, 34px)', lineHeight: 1.65, maxWidth: 600 }}>&ldquo;{v.text}&rdquo;</div>
                <div style={{ fontFamily: body, fontSize: 14, letterSpacing: '0.08em', opacity: 0.7, marginTop: 26 }}>{v.ref}</div>
              </div>
            </FocusOverlay>
          )
        })()}
        {focus === 'prayer' && userId && (
          <FocusOverlay onClose={() => setFocus(null)}>
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '68px 20px 48px' }}>
              <PrayerTabs userId={userId} />
            </div>
          </FocusOverlay>
        )}
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
            {status.transfer?.recipient_name && <div style={{ display: 'inline-block', background: GOLD, color: INK, borderRadius: 20, padding: '6px 14px', fontFamily: serif, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>For {status.transfer.recipient_name} ✝︎</div>}
            {status.transfer?.note && <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.transfer.note}"</div>}
            <button onClick={() => { if (status.transfer?.recipient_name && !claimName) setClaimName(status.transfer.recipient_name); setClaimStep('form') }} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>Accept this band →</button>
            <button onClick={() => setClaimStep('view')} style={{ display: 'block', width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Just view the journey</button>
          </div>
        )}
        {claimStep === 'view' && (
          <div style={{ margin: '24px 20px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 12 }}>Take your time. When you&apos;re ready, you can accept the band.</div>
            <button onClick={() => { if (status.transfer?.recipient_name && !claimName) setClaimName(status.transfer.recipient_name); setClaimStep('form') }} style={{ display: 'inline-block', padding: '13px 28px', background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Accept this band →</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="You're joining the chain ✝︎" subtitle="Add your name and a prayer to complete the handoff." submitLabel="Accept & add my prayer ✝︎" onSubmit={handleAcceptTransfer} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard bandId={bandId} userId={userId} title="The band is yours now" subtitle="You've been added to the prayer chain. Every time you tap this band, you'll see the full journey — and when you're ready, you can pass it on too." />}
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
            <div style={{ fontSize: 32, marginBottom: 10 }}>✝︎</div>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>{status.dedicatorName ? `${status.dedicatorName} is praying for you` : 'Someone is praying for you'}</div>
            <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>This band was sent to you as an act of prayer. You are not forgotten.</div>
            {status.band?.dedication_note && <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '14px 16px', fontFamily: body, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, textAlign: 'left' }}>"{status.band.dedication_note}"</div>}
            <button onClick={() => setClaimStep('form')} style={{ display: 'block', width: '100%', padding: 16, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>This band is mine now →</button>
          </div>
        )}
        <NetworkConnectPrompt bandId={bandId} />
        {claimStep === 'form' && <ClaimForm title="Join the Journey" subtitle="Your prayer becomes part of this band's story forever." submitLabel="Add my prayer to this band ✝︎" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard bandId={bandId} userId={userId} title="You're part of this story" subtitle="Your prayer has been woven into this band's journey. When you pass it on, they'll see every prayer that came before — including yours." />}
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
          <div style={{ fontFamily: body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>✝︎ Prayer Band Journey</div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{bandId}</div>
          <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic' }}>Currently held by {status.currentHolder?.user_name ?? 'someone'} in {status.currentHolder?.city ?? 'the world'}</div>
        </div>
        {/* This band is already claimed to an account. A signed-out visitor here
            is most often its own holder returning without a session (a tag that
            opened a different browser), so lead with Sign in — not "create an
            account" they already have, and not a re-claim that would add a
            duplicate registration to their own band. */}
        {!userId && (
          <div style={{ margin: '18px 20px 0', background: 'rgba(200,169,110,0.10)', border: `1px solid ${GOLD}`, borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Is this your band?</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, marginBottom: 12, lineHeight: 1.5 }}>If you registered it, sign in to open your band, your journal, and your prayer partners.</div>
            <a href={`/signin?redirect=${encodeURIComponent(`/band/${bandId}`)}`} style={{ display: 'inline-block', padding: '11px 30px', background: GOLD, color: INK, borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Sign in ✝︎</a>
          </div>
        )}
        <NetworkConnectPrompt bandId={bandId} />
        {claimStep === 'prompt' && (
          <div style={{ margin: '20px 20px 0', background: 'white', borderRadius: 14, padding: '18px 20px', border: `1px solid ${GOLD}`, textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Do you now have this band?</div>
            <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 14 }}>If this band was passed to you, join the chain.</div>
            <button onClick={() => setClaimStep('form')} style={{ padding: '10px 24px', background: GOLD, color: INK, border: 'none', borderRadius: 8, fontFamily: serif, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>I now have this band →</button>
          </div>
        )}
        {claimStep === 'form' && <ClaimForm title="Join the Chain" subtitle="Add your name and prayer to continue this band's journey." submitLabel="Join the chain ✝︎" onSubmit={handleClaim} onBack={() => setClaimStep('prompt')} claimName={claimName} setClaimName={setClaimName} claimPrayer={claimPrayer} setClaimPrayer={setClaimPrayer} claimCity={claimCity} setClaimCity={setClaimCity} claimState={claimState} setClaimState={setClaimState} claimCountry={claimCountry} setClaimCountry={setClaimCountry} submitting={submitting} />}
        {claimStep === 'done' && <SuccessCard bandId={bandId} userId={userId} title="Welcome to the chain" subtitle="Your prayer has been added. Tap your band any time to see the full journey." />}
        <PrayerChain regs={regs} />
        <div style={{ height: 40 }} />
      </div>
    )
  }

  return (
    // This first-tap entry screen is designed for a dark ground with white text
    // + gold. Pin it to the DEFAULT palette (not the band's theme) so a light
    // colour band — e.g. Light Grey — can't wash it out to unreadable low
    // contrast. Overriding the tokens also fixes GOLD/INK used by its children.
    <div style={{
      background: '#12100B', minHeight: '100vh', fontFamily: body, color: 'white',
      ['--pb-primary' as string]: '#C8A96E',
      ['--pb-text' as string]: '#12100B',
      ['--pb-text-on-primary' as string]: '#0f0d09',
    } as React.CSSProperties}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Logo size={28} color="#fff" withName nameColor="#fff" nameSize={18} />
        <span style={{ fontFamily: body, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{bandId}</span>
      </nav>

      {claimStep === 'prompt' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px 28px 140px', textAlign: 'center' }}>

          {/* Cross — an SVG, not the ✝︎ emoji (which renders as Apple's coloured
              glyph on iOS). Inherits the gold accent. */}
          <svg width="40" height="53" viewBox="0 0 24 32" style={{ marginBottom: 24 }} aria-hidden="true">
            <path d="M10.5 2 h3 v7 h5.5 v3 h-5.5 v18 h-3 v-18 h-5.5 v-3 h5.5 z" fill={GOLD} />
          </svg>

          {/* Main message */}
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 16, lineHeight: 1.3, maxWidth: 320 }}>
            One band. A story still being written.
          </div>
          <div style={{ fontFamily: body, fontSize: 15, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 32, maxWidth: 340 }}>
            Follow its journey, share prayers, and discover Scripture each day.
          </div>

          {/* Pre-dedicated gift: the sender's blessing, shown inline on the entry
              page rather than as a takeover screen. Gold-tinted so it reads as
              personal next to the generic verse card below. `pre-line` keeps the
              sender's own line breaks (they usually sign off on a new line). */}
          {(status.dedicationRecipient || status.dedicationNote) && (
            <div style={{ background: 'rgba(200,169,110,0.10)', border: `1px solid ${GOLD}`, borderRadius: 14, padding: '20px 22px', marginBottom: 32, maxWidth: 380, width: '100%' }}>
              <div style={{ fontFamily: body, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
                A Gift of Prayer
              </div>
              {status.dedicationRecipient && (
                <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: status.dedicationNote ? 10 : 0 }}>
                  For {status.dedicationRecipient}
                </div>
              )}
              {status.dedicationNote && (
                <div style={{ fontFamily: serif, fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', whiteSpace: 'pre-line' }}>
                  &ldquo;{status.dedicationNote}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Verse */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '20px 24px', marginBottom: 40, maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily: serif, fontSize: 15, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 8, color: 'rgba(255,255,255,0.9)' }}>
              "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do."
            </div>
            <div style={{ fontFamily: body, fontSize: 12, color: GOLD, letterSpacing: '0.1em' }}>EPHESIANS 2:10</div>
          </div>

          {/* CTA — the main "what do I do now" action. Pulses gently so a
              first-time tapper's eye lands on it. */}
          <style>{`
            @keyframes pbCtaPulse { 0%,100% { box-shadow: 0 8px 30px rgba(184,134,11,0.30); transform: translateY(0); } 50% { box-shadow: 0 14px 46px rgba(184,134,11,0.60); transform: translateY(-3px); } }
            .pb-cta-pulse { animation: pbCtaPulse 1.7s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .pb-cta-pulse { animation: none; } }
          `}</style>
          <button
            className="pb-cta-pulse"
            onClick={() => setClaimStep('form')}
            style={{
              padding: '18px 46px', background: GOLD, color: INK,
              border: 'none', borderRadius: 12, fontFamily: serif,
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(184,134,11,0.30)',
            }}
          >
            Take your next step →
          </button>
          <div style={{ marginTop: 12, fontFamily: body, fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>
            Save your band and follow where it travels.
          </div>

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
            submitLabel="Begin the journey ✝︎"
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
          <SuccessCard bandId={bandId} userId={userId} title="The journey has begun" subtitle="Your prayer is the first in this band's chain. Every person who holds it next will see what you wrote today." />
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  )
}