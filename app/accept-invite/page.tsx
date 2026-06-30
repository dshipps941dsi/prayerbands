'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'

// Brand palette: navy + gold + silver/gray, gold/cream card on a navy splash.
const BRAND = {
  cardBg: '#FFFDF8',
  navy: '#0A1628',
  navyMid: '#15223B',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  silverBorder: 'rgba(92,101,115,0.20)',
  goldBorder: 'rgba(200,169,110,0.34)',
  bodyText: '#2A3344',
  secondaryText: '#5C6573',
  mutedText: '#7A8494',
  inputBg: '#FFFDF8',
  fieldBg: '#F6F1E4',
  splash: 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%)',
  splashText: 'rgba(245,237,216,0.85)',
}

const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');"

function AcceptInviteInner() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [fatal, setFatal] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setFatal('This invite link is missing its token.'); setLoading(false); return }
    fetch('/api/invite-info?token=' + encodeURIComponent(token))
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          const map: Record<string, string> = {
            expired: 'This invite has expired. Ask your team to send a new one.',
            accepted: 'This invite has already been used. Try signing in instead.',
            revoked: 'This invite was cancelled.',
            invalid: 'This invite link is not valid.',
          }
          setFatal(map[d.error] || 'This invite link is not valid.')
        } else {
          setInvite(d)
          setName(d.display_name || '')
        }
      })
      .catch(() => setFatal('Could not load this invite. Please try again.'))
      .finally(() => setLoading(false))
  }, [token])

  async function submit() {
    setSubmitting(true); setError('')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    try {
      if (invite?.account_exists) {
        // Existing account: sign in FIRST (proves they own the email), then the
        // invite only attaches the org — we never reset their password.
        setStatus('Signing you in...')
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password })
        if (signInError) {
          setError('That password didn’t match. Try again, or reset it below.')
          setSubmitting(false); setStatus(''); return
        }
        setStatus('Joining the team...')
        const res = await fetch('/api/accept-invite', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, display_name: name }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data.message || data.error || 'Could not join the team.'); setSubmitting(false); setStatus(''); return }
        window.location.replace('/org/dashboard')
        return
      }

      // Brand-new account: create it with the chosen password, then sign in.
      setStatus('Creating your account...')
      const res = await fetch('/api/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, display_name: name, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error === 'account_exists') {
          // Raced with an account creation — flip to the sign-in path.
          setInvite((p: any) => ({ ...p, account_exists: true }))
          setError('You already have an account — enter your password to sign in.')
          setSubmitting(false); setStatus(''); return
        }
        setError(data.error || 'Could not accept the invite.'); setSubmitting(false); setStatus(''); return
      }

      setStatus('Signing you in...')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password })
      if (signInError) { window.location.replace('/signin/org'); return }
      window.location.replace('/org/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false); setStatus('')
    }
  }

  // Existing accounts enter their real password (any length); new accounts must
  // create one of at least 8 characters.
  const minPwLen = invite?.account_exists ? 1 : 8

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: `1px solid ${BRAND.silverBorder}`, fontSize: 15,
    fontFamily: "'Inter', sans-serif", background: BRAND.fieldBg,
    color: BRAND.bodyText, boxSizing: 'border-box' as const, outline: 'none',
    marginBottom: 12,
  }
  const labelStyle = {
    fontSize: 11, fontWeight: 600 as const, color: BRAND.goldText, display: 'block' as const,
    marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    fontFamily: "'Cinzel', serif",
  }

  const shell = (inner: React.ReactNode) => (
    <>
      <style>{`${FONTS} .pb-input:focus { border-color: ${BRAND.gold} !important; box-shadow: 0 0 0 3px rgba(200,169,110,0.18) !important; }`}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.splash, fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
        <div style={{ background: BRAND.cardBg, borderRadius: 16, padding: '40px 32px', maxWidth: 400, width: '100%', border: `1px solid ${BRAND.goldBorder}`, boxShadow: '0 4px 32px rgba(10,22,40,0.18)' }}>
          {inner}
        </div>
      </div>
    </>
  )

  const splashScreen = (text: string) => (
    <>
      <style>{FONTS}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.splash, fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48, color: BRAND.gold, marginBottom: 16 }}>✝</div>
          <div style={{ fontSize: 16, color: BRAND.splashText }}>{text}</div>
          {error && <div style={{ color: '#e88', marginTop: 12, fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    </>
  )

  if (loading) return splashScreen('Loading your invite...')
  if (status) return splashScreen(status)

  if (fatal) return shell(
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Logo size={40} /></div>
      <h1 style={{ fontSize: 21, fontWeight: 600, color: BRAND.navyMid, margin: '0 0 10px', fontFamily: "'Cormorant Garamond', serif" }}>Invite unavailable</h1>
      <p style={{ fontSize: 14, color: BRAND.secondaryText, margin: '0 0 20px', lineHeight: 1.6 }}>{fatal}</p>
      <a href="/signin/org" style={{ color: BRAND.goldText, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Go to Ministry sign in →</a>
    </div>
  )

  return shell(
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {invite?.org?.logo_url
          ? <img src={invite.org.logo_url} alt={invite.org.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', border: `1px solid ${BRAND.silverBorder}`, background: '#fff', padding: 4, marginBottom: 10 }} />
          : <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Logo size={40} /></div>}
        <div style={{ fontSize: 11, letterSpacing: '0.14em', color: BRAND.goldText, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 8 }}>Ministry Invitation</div>
        <h1 style={{ fontSize: 23, fontWeight: 600, color: BRAND.navyMid, margin: '0 0 6px', fontFamily: "'Cormorant Garamond', serif" }}>Join {invite?.org?.name}</h1>
        <p style={{ fontSize: 13, color: BRAND.secondaryText, margin: 0 }}>{invite?.account_exists ? 'Sign in to join the ministry dashboard' : 'Set a password to access the ministry dashboard'}</p>
      </div>

      <label style={labelStyle}>Email</label>
      <div style={{ ...inputStyle, color: BRAND.secondaryText, background: '#ECEEF1' }}>{invite?.email}</div>

      {!invite?.account_exists && (
        <>
          <label style={labelStyle}>Your name</label>
          <input className="pb-input" style={inputStyle} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </>
      )}

      <label style={labelStyle}>{invite?.account_exists ? 'Your password' : 'Create a password'}</label>
      <input className="pb-input" style={inputStyle} type="password" placeholder={invite?.account_exists ? 'Your account password' : 'At least 8 characters'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && password.length >= minPwLen) submit() }} />

      {error && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button onClick={submit} disabled={submitting || password.length < minPwLen} style={{ width: '100%', padding: '13px', borderRadius: 8, background: (!submitting && password.length >= minPwLen) ? BRAND.gold : '#C9CFD6', color: (!submitting && password.length >= minPwLen) ? BRAND.navy : '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: (!submitting && password.length >= minPwLen) ? 'pointer' : 'default', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {submitting ? (invite?.account_exists ? 'Signing in...' : 'Joining...') : (invite?.account_exists ? 'Sign in & Join ✝' : 'Join the Team ✝')}
      </button>

      {invite?.account_exists && (
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: BRAND.mutedText }}>
          Forgot your password? <a href="/reset-password" style={{ color: BRAND.goldText, textDecoration: 'none', fontWeight: 600 }}>Reset it</a>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: BRAND.mutedText }}>
        {invite?.account_exists ? 'Not you?' : 'Already have an account?'} <a href="/signin/org" style={{ color: BRAND.goldText, textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: "'Cinzel', serif", color: '#5C6573' }}>Loading... ✝</div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}
