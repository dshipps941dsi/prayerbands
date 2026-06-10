'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

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
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
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
            <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={40} color={BRAND.gold} /></div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: BRAND.goldText, fontFamily: "'Cinzel', serif", textTransform: 'uppercase', marginBottom: 8 }}>Account Recovery</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, color: BRAND.navyMid, margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>
              Set New Password
            </h1>
            <div style={{ width: 40, height: 2, background: BRAND.gold, margin: '12px auto 0', borderRadius: 2 }} />
          </div>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: BRAND.navyMid, fontFamily: "'Cormorant Garamond', serif" }}>Password updated!</h2>
              <p style={{ color: BRAND.secondaryText, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <a href="/signin" style={{
                display: 'inline-block', background: BRAND.gold, color: BRAND.navy,
                padding: '12px 28px', borderRadius: 8, textDecoration: 'none',
                fontSize: 12, fontWeight: 700, fontFamily: "'Cinzel', serif",
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Sign In →
              </a>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', color: BRAND.secondaryText, fontSize: 14 }}>
              Verifying reset link...{' '}
              <span style={{ color: BRAND.gold }}>✝</span>
            </div>
          ) : (
            <div>
              <input
                className="pb-input"
                style={inputStyle} type="password" placeholder="New password"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <input
                className="pb-input"
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
                  background: (!loading && password && confirm) ? BRAND.gold : BRAND.silver,
                  color: (!loading && password && confirm) ? BRAND.navy : '#fff',
                  border: 'none', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Cinzel', serif", letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
