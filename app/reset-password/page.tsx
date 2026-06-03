'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    setLoading(true)
    setError('')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://prayerbands.com/reset-password/confirm',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>✝</div>
          <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1208', margin: 0 }}>
            Reset Password
          </h1>
          <p style={{ color: '#8a7c6a', fontSize: 14, marginTop: 8 }}>
            Enter your email and we'll send a reset link.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Check your email</h2>
            <p style={{ color: '#5a4f42', fontSize: 14, lineHeight: 1.7 }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
            </p>
            <a href="/signin" style={{
              display: 'block', marginTop: 24, color: green,
              fontSize: 14, textDecoration: 'none',
            }}>
              ← Back to Sign In
            </a>
          </div>
        ) : (
          <div>
            <input
              style={inputStyle} type="email" placeholder="Your email address"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && email) handleReset() }}
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
              onClick={handleReset}
              disabled={loading || !email}
              style={{
                width: '100%', padding: '13px', borderRadius: 8,
                background: (!loading && email) ? green : '#ccc',
                color: '#fff', border: 'none', fontSize: 15,
                fontWeight: 'bold', cursor: 'pointer',
                fontFamily: 'Georgia, serif', marginBottom: 12,
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <a href="/signin" style={{
              display: 'block', textAlign: 'center',
              color: '#8a7c6a', fontSize: 14, textDecoration: 'none',
            }}>
              ← Back to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
