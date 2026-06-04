'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
          <div style={{ fontSize: 28, marginBottom: 8 }}>⛪</div>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: '0 0 6px' }}>Ministry Sign In</h1>
          <p style={{ fontSize: 13, color: '#8a7c6a', margin: 0 }}>Access your church or ministry dashboard</p>
        </div>

        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && email && password) signInWithEmail() }} />

        {error && <div style={{ background: '#fef0f0', border: '1px solid #f5c6c6', borderRadius: 7, padding: '10px 14px', color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button onClick={signInWithEmail} disabled={loading || !email || !password} style={{ width: '100%', padding: '13px', borderRadius: 8, background: (!loading && email && password) ? green : '#ccc', color: '#fff', border: 'none', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif', marginBottom: 12 }}>
          {loading ? 'Signing in...' : 'Sign In to Ministry Dashboard'}
        </button>

        <a href="/reset-password" style={{ display: 'block', textAlign: 'center', color: '#8a7c6a', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>Forgot your password?</a>

        <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#8a7c6a', marginBottom: 10 }}>New church or ministry?</div>
          <a href="/onboard" style={{ display: 'inline-block', background: '#e6f4ee', color: green, borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 'bold', textDecoration: 'none' }}>
            Set up your church account →
          </a>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/signin" style={{ fontSize: 12, color: '#b0a090', textDecoration: 'none' }}>← Back to sign in options</a>
        </div>
      </div>
    </div>
  )
}