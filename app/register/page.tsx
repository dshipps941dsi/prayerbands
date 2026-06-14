'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

const NAVY = '#0A1628'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const PAGE = '#F6F1E4'
const CARD = '#FFFDF8'
const BODY = '#2A3344'
const GRAY = '#5C6573'

function RegisterInner() {
  const searchParams = useSearchParams()
  const [bandId, setBandId] = useState('')
  const [redirecting, setRedirecting] = useState(false)

  // If a band ID came in on the URL (e.g. from an NFC tap or printed link),
  // skip the form and open the band straight away — preserves the old behavior.
  useEffect(() => {
    const id = searchParams?.get('id')
    if (id) {
      setRedirecting(true)
      window.location.href = `/band/${id.trim().toUpperCase()}`
    }
  }, [searchParams])

  function go() {
    const clean = bandId.trim().toUpperCase()
    if (!clean) return
    window.location.href = `/band/${encodeURIComponent(clean)}`
  }

  if (redirecting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE }}>
        <div style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", color: GRAY }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={42} color={GOLD} /></div>
          <div style={{ fontStyle: 'italic', fontSize: 14 }}>Opening your band…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: CARD, border: '1px solid rgba(10,22,40,0.12)', borderRadius: 16, padding: '36px 32px', textAlign: 'center', boxShadow: '0 8px 30px rgba(10,22,40,0.08)' }}>
        <a href="/" aria-label="Prayer Bands home" style={{ display: 'inline-flex', marginBottom: 16 }}><PrayerBandsLogo size={44} color={GOLD} /></a>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', color: GOLD_TEXT, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 8 }}>Register a Band</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: NAVY, margin: '0 0 8px', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Open your band&rsquo;s journey</h1>
        <p style={{ fontSize: 14, color: GRAY, margin: '0 0 22px', lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
          Enter the ID printed on your band — it looks like <strong style={{ color: BODY }}>PB-XXXXX</strong> — to open it and make it yours.
        </p>
        <input
          value={bandId}
          onChange={e => setBandId(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') go() }}
          placeholder="PB-XXXXX"
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 8, border: '1px solid rgba(10,22,40,0.2)', background: PAGE, color: NAVY, fontSize: 16, fontFamily: 'monospace', letterSpacing: '0.08em', textAlign: 'center', textTransform: 'uppercase', outline: 'none', marginBottom: 14 }}
        />
        <button
          onClick={go}
          disabled={!bandId.trim()}
          style={{ width: '100%', padding: '13px', borderRadius: 8, background: bandId.trim() ? GOLD : '#C9CFD6', color: bandId.trim() ? NAVY : '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: bandId.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          Continue
        </button>
        <p style={{ fontSize: 12, color: GRAY, margin: '18px 0 0', fontFamily: "'Inter', sans-serif" }}>
          Tip: tapping your band with your phone opens it automatically.
        </p>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE }}><div style={{ fontSize: 40, color: GOLD }}>✝</div></div>}>
      <RegisterInner />
    </Suspense>
  )
}
