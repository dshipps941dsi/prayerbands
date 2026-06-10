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
  navyBorder: 'rgba(10,22,40,0.12)',
  bodyText: '#2A3344',
  secondaryText: '#5C6573',
  mutedText: '#7A8494',
  inputBg: '#FFFDF8',
}

export default function SignInPersonal() {
  const [loading, setLoading] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
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

  async function signInWithGoogle() {
    setLoading(true)
    const supabase = getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://prayerbands.com/auth/callback' }
    })
  }

  async function signInWithFacebook() {
    setLoading(true)
    const supabase = getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: 'https://prayerbands.com/auth/callback' }
    })
  }

  async function signInWithEmail() {
    setLoading(true)
    setError('')
    setStatus('Signing in...')
    const supabase = getSupabase()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      setStatus('')
      return
    }
    setStatus('Redirecting...')
    window.location.replace('/dashboard')
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4', fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 48, color: BRAND.gold, marginBottom: 16 }}>✝</div>
          <div style={{ fontSize: 16, color: BRAND.secondaryText }}>{status}</div>
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
        .pb-social-btn:hover { background: #F0F1F4 !important; }
      `}</style>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4', backgroundImage: 'radial-gradient(ellipse at 70% 20%, rgba(200,169,110,0.10) 0%, transparent 60%)', fontFamily: "'Inter', sans-serif", padding: '24px 16px' }}>
        <div style={{ background: BRAND.cardBg, borderRadius: 16, padding: '40px 32px', maxWidth: 400, width: '100%', border: `1px solid ${BRAND.goldBorder}`, boxShadow: '0 4px 32px rgba(10,22,40,0.09)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Logo size={40} /></div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: BRAND.goldText, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 8 }}>Personal Sign In</div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: BRAND.navyMid, margin: '0 0 6px', fontFamily: "'Cormorant Garamond', serif" }}>Sign in to PrayerBands</h1>
            <p style={{ fontSize: 13, color: BRAND.secondaryText, margin: 0 }}>Track your band's journey and leave prayers</p>
          </div>

          {!showEmail ? (
            <div>
              <button className="pb-social-btn" onClick={signInWithGoogle} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 8, background: BRAND.cardBg, color: BRAND.bodyText, border: `1px solid ${BRAND.silverBorder}`, fontSize: 15, cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10, transition: 'background 0.15s' }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </button>
              <button onClick={signInWithFacebook} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#1877F2', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                {loading ? 'Signing in...' : 'Continue with Facebook'}
              </button>
              <div style={{ textAlign: 'center', color: BRAND.mutedText, fontSize: 12, margin: '14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, height: 1, background: BRAND.silverBorder, display: 'inline-block' }} />
                <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', fontSize: 11 }}>OR</span>
                <span style={{ flex: 1, height: 1, background: BRAND.silverBorder, display: 'inline-block' }} />
              </div>
              <button onClick={() => setShowEmail(true)} style={{ width: '100%', padding: '13px', borderRadius: 8, background: BRAND.gold, color: BRAND.navy, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: "'Cinzel', serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Sign In with Email
              </button>
            </div>
          ) : (
            <div>
              <input className="pb-input" style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="pb-input" style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && email && password) signInWithEmail() }} />
              {error && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <button onClick={signInWithEmail} disabled={loading || !email || !password} style={{ width: '100%', padding: '13px', borderRadius: 8, background: (!loading && email && password) ? BRAND.gold : BRAND.silver, color: (!loading && email && password) ? BRAND.navy : '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button onClick={() => { setShowEmail(false); setError('') }} style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', color: BRAND.secondaryText, border: `1px solid ${BRAND.silverBorder}`, fontSize: 14, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                ← Back
              </button>
              <a href="/reset-password" style={{ display: 'block', textAlign: 'center', color: BRAND.secondaryText, fontSize: 13, textDecoration: 'none', marginTop: 10 }}>Forgot your password?</a>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BRAND.silverBorder}`, textAlign: 'center', fontSize: 13, color: BRAND.mutedText }}>
            Representing a church?{' '}
            <a href="/signin/org" style={{ color: BRAND.goldText, textDecoration: 'none', fontWeight: 600 }}>Ministry sign in →</a>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <a href="/signin" style={{ fontSize: 12, color: BRAND.mutedText, textDecoration: 'none' }}>← Back to sign in options</a>
          </div>
        </div>
      </div>
    </>
  )
}
