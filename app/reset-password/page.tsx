'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import SiteHeader from '../components/SiteHeader'

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
}

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

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    border: `1px solid ${BRAND.silverBorder}`, fontSize: 15,
    fontFamily: "'Inter', sans-serif", background: BRAND.inputBg,
    color: BRAND.bodyText, boxSizing: 'border-box' as const, outline: 'none',
    marginBottom: 12,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .pb-input:focus { border-color: ${BRAND.gold} !important; box-shadow: 0 0 0 3px rgba(200,169,110,0.18) !important; }
      `}</style>
      <SiteHeader />
      <div style={{
        minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F6F1E4',
        backgroundImage: 'radial-gradient(ellipse at 60% 30%, rgba(200,169,110,0.09) 0%, transparent 55%)',
        fontFamily: "'Inter', sans-serif",
      }}>
      <div style={{
        background: BRAND.cardBg, borderRadius: 16, padding: '48px 40px',
        maxWidth: 400, width: '100%', border: `1px solid ${BRAND.goldBorder}`,
        boxShadow: '0 4px 32px rgba(10,22,40,0.09)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: BRAND.goldText, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 10 }}>Account Recovery</div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: BRAND.navyMid, margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
            Reset Password
          </h1>
          <div style={{ width: 40, height: 2, background: BRAND.gold, margin: '12px auto 0', borderRadius: 2 }} />
          <p style={{ color: BRAND.secondaryText, fontSize: 14, marginTop: 12 }}>
            Enter your email and we'll send a reset link.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: BRAND.navyMid, fontFamily: "'Cormorant Garamond', serif" }}>Check your email</h2>
            <p style={{ color: BRAND.secondaryText, fontSize: 14, lineHeight: 1.7 }}>
              We sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
            </p>
            <a href="/signin" style={{
              display: 'block', marginTop: 24, color: BRAND.goldText,
              fontSize: 14, textDecoration: 'none', fontWeight: 600,
            }}>
              ← Back to Sign In
            </a>
          </div>
        ) : (
          <div>
            <input
              className="pb-input"
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
                background: (!loading && email) ? BRAND.gold : BRAND.silver,
                color: (!loading && email) ? BRAND.navy : '#fff',
                border: 'none', fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Cinzel', serif", letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 12,
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <a href="/signin" style={{
              display: 'block', textAlign: 'center',
              color: BRAND.secondaryText, fontSize: 14, textDecoration: 'none',
            }}>
              ← Back to Sign In
            </a>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
