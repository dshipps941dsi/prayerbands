'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

export default function ResetPasswordConfirm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  async function handleUpdate() {
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  const green = '#1a6b4a'
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 7,
    border: '1px solid #ddd6ca', fontSize: 15,
    fontFamily: 'Georgia, serif', background: '#fdfaf7',
    color: '#2c2416', boxSizing: 'border-box' as const, outline: 'none',
    marginBottom: 12,
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f7f4ef',
      fontFamily: 'Georgia, serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '48px 40px',
        maxWidth: 400, width: '100%', border: '1px solid #e8e1d6',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={40} color="#1a6b4a" /></div>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: 0 }}>
            Set New Password
          </h1>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Password updated!</h2>
            <p style={{ color: '#5a4f42', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Your password has been changed. You can now sign in with your new password.
            </p>
            <a href="/signin" style={{
              display: 'inline-block', background: green, color: '#fff',
              padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
              fontSize: 15, fontWeight: 'bold',
            }}>
              Sign In →
            </a>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center', color: '#8a7c6a', fontSize: 14 }}>
            Verifying reset link... ✝
          </div>
        ) : (
          <div>
            <input
              style={inputStyle} type="password" placeholder="New password"
              value={password} onChange={e => setPassword(e.target.value)}
            />
            <input
              style={inputStyle} type="password" placeholder="Confirm new password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && password && confirm) handleUpdate() }}
            />

            {error && (
              <div style={{
                background: '#fef0f0', border: '1px solid #f5c6c6',
                borderRadius: 7, padding: '10px 14px',
                color: '#c0392b', fontSize: 13, marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleUpdate}
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '13px', borderRadius: 8,
                background: (!loading && password && confirm) ? green : '#ccc',
                color: '#fff', border: 'none', fontSize: 15,
                fontWeight: 'bold', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
