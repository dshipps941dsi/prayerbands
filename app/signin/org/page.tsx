'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/components/Logo'

// Brand palette
const BRAND = {
  pageBg: '#F6F1E4',
  cardBg: '#FFFDF8',
  navy: '#0A1628',
  navyMid: '#15223B',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  silver: '#C9CFD6',
  silverBorder: 'rgba(92,101,115,0.20)',
  goldBorder: 'rgba(200,169,110,0.34)',
  bodyText: '#2A3344',
  secondaryText: '#5C6573',
  mutedText: '#7A8494',
  inputBg: '#FFFDF8',
  // Bold navy + gold page backdrop (the gold/cream card sits on top of this)
  splash: 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%), linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%)',
  splashText: 'rgba(245,237,216,0.85)',
}

export default function SignInOrg() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async function signInWithEmail() {
    setLoading(true)
    setError('')
    setStatus('Signing in...')
    const supabase = getSupabase()

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      setStatus('')
      return
    }

    setStatus('Loading your dashboard...')
    const userId = data.session?.user?.id || data.user?.id
    if (!userId) { setError('No user ID returned'); setLoading(false); setStatus(''); return }

    window.location.replace('/org/dashboard')
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: `1px solid ${BRAND.silverBorder}`, fontSize: 15,
    fontFamily: "'Inter', sans-serif", background: BRAND.inputBg,
    color: BRAND.bodyText, boxSizing: 'border-box' as const, outline: 'none',
    marginBottom: 12,
  }

  if (status) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.splash, fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48, color: BRAND.gold, marginBottom: 16 }}>✝︎</div>
          <div style={{ fontSize: 16, color: BRAND.splashText }}>{status}</div>
          {error && <div style={{ color: '#c0392b', marginTop: 12, fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .pb-input:focus { border-color: ${BRAND.gold} !important; box-shadow: 0 0 0 3px rgba(200,169,110,0.18) !important; }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND.splash, fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
        <div style={{ background: BRAND.cardBg, borderRadius: 16, padding: '40px 32px', maxWidth: 400, width: '100%', border: `1px solid ${BRAND.goldBorder}`, boxShadow: '0 4px 32px rgba(10,22,40,0.09)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><a href="/" aria-label="Prayer Bands home" style={{ display: 'inline-flex' }}><Logo size={40} /></a></div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: BRAND.goldText, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 8 }}>Ministry Portal</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: BRAND.navyMid, margin: '0 0 6px', fontFamily: "'Cormorant Garamond', serif" }}>Ministry Sign In</h1>
            <p style={{ fontSize: 13, color: BRAND.secondaryText, margin: 0 }}>Access your church or ministry dashboard</p>
          </div>

          <input className="pb-input" style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="pb-input" style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && email && password) signInWithEmail() }} />

          {error && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button onClick={signInWithEmail} disabled={loading || !email || !password} style={{ width: '100%', padding: '13px', borderRadius: 8, background: (!loading && email && password) ? BRAND.gold : BRAND.silver, color: (!loading && email && password) ? BRAND.navy : '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            {loading ? 'Signing in...' : 'Sign In to Ministry Dashboard'}
          </button>

          <a href="/reset-password" style={{ display: 'block', textAlign: 'center', color: BRAND.secondaryText, fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>Forgot your password?</a>

          <div style={{ borderTop: `1px solid ${BRAND.silverBorder}`, paddingTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: BRAND.secondaryText, marginBottom: 10 }}>New church or ministry?</div>
            <a href="/onboard" style={{ display: 'inline-block', background: 'transparent', color: BRAND.goldText, border: `1px solid ${BRAND.goldBorder}`, borderRadius: 8, padding: '10px 20px', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Set Up Your Church Account →
            </a>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <a href="/signin" style={{ fontSize: 12, color: BRAND.mutedText, textDecoration: 'none' }}>← Back to sign in options</a>
          </div>
        </div>
      </div>
    </>
  )
}
