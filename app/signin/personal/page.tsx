'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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

  const green = '#1a6b4a'
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 7,
    border: '1px solid #ddd6ca', fontSize: 15,
    fontFamily: 'Georgia, serif', background: '#fdfaf7',
    color: '#2c2416', boxSizing: 'border-box' as const, outline: 'none',
    marginBottom: 12,
  }

  if (status) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, color: green, marginBottom: 16 }}>✝</div>
        <div style={{ fontSize: 16, color: '#5a4f42' }}>{status}</div>
        {error && <div style={{ color: '#c0392b', marginTop: 12, fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', fontFamily: 'Georgia, serif', padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '40px 32px', maxWidth: 400, width: '100%', border: '1px solid #e8e1d6', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🙏</div>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: '0 0 6px' }}>Sign in to PrayerBands</h1>
          <p style={{ fontSize: 13, color: '#8a7c6a', margin: 0 }}>Track your band's journey and leave prayers</p>
        </div>

        {!showEmail ? (
          <div>
            <button onClick={signInWithGoogle} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 8, background: '#fff', color: '#2c2416', border: '1px solid #ddd6ca', fontSize: 15, cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
            <button onClick={signInWithFacebook} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 8, background: '#1877F2', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              {loading ? 'Signing in...' : 'Continue with Facebook'}
            </button>
            <div style={{ textAlign: 'center', color: '#8a7c6a', fontSize: 13, margin: '14px 0' }}>or</div>
            <button onClick={() => setShowEmail(true)} style={{ width: '100%', padding: '13px', borderRadius: 8, background: green, color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer', fontFamily: 'Georgia, serif', fontWeight: 'bold' }}>
              Sign in with Email
            </button>
          </div>
        ) : (
          <div>
            <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && email && password) signInWithEmail() }} />
            {error && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={signInWithEmail} disabled={loading || !email || !password} style={{ width: '100%', padding: '13px', borderRadius: 8, background: (!loading && email && password) ? green : '#ccc', color: '#fff', border: 'none', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif', marginBottom: 12 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button onClick={() => { setShowEmail(false); setError('') }} style={{ width: '100%', padding: '10px', borderRadius: 8, background: '#fff', color: '#5a4f42', border: '1px solid #ddd6ca', fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              ← Back
            </button>
            <a href="/reset-password" style={{ display: 'block', textAlign: 'center', color: '#8a7c6a', fontSize: 13, textDecoration: 'none', marginTop: 10 }}>Forgot your password?</a>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#b0a090' }}>
          Representing a church?{' '}
          <a href="/signin/org" style={{ color: '#1a6b4a', textDecoration: 'none', fontWeight: 'bold' }}>Ministry sign in →</a>
        </div>
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <a href="/signin" style={{ fontSize: 12, color: '#b0a090', textDecoration: 'none' }}>← Back to sign in options</a>
        </div>
      </div>
    </div>
  )
}