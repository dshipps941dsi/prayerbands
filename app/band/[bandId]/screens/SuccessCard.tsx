'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { track } from '@/lib/analytics'

// Post-registration sign-up panel.
//
// Lives in its own module deliberately. It used to be declared *inside* the
// band page component, which meant every parent re-render produced a new
// component identity — React unmounted and remounted it, wiping ageConsent,
// authMode, email and code mid-flow. The band page re-renders on things that
// resolve seconds after load (the verse-walk fetch, the notification poll, the
// band-status fetch), so someone could tick the consent box, start typing their
// address, and have both silently reset underneath them. Hoisting it out keeps
// the state alive for as long as the panel is on screen.

// Theme tokens, matching the band page. CSS variables so an unthemed band still
// gets the original palette from the fallbacks.
const GOLD  = 'var(--pb-primary, #B8860B)'
const GREEN = 'var(--pb-accent-alt, #1a4a3a)'
const DARK  = 'var(--pb-text, #2C1810)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const GRAY  = 'var(--pb-text-muted, #7A6A5A)'
const INK   = 'var(--pb-text-on-primary, #0f0d09)'
const serif = "'Playfair Display', Georgia, serif"
const body  = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export default function SuccessCard({
  bandId,
  userId,
  title,
  subtitle,
  showCountdown,
}: {
  bandId: string
  userId: string | null
  title: string
  subtitle: string
  showCountdown?: boolean
}) {
  const [ageConsent, setAgeConsent] = useState(false)
  const [authMode, setAuthMode] = useState<'email' | 'code' | 'password' | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  // Passwordless: email a 6-digit code, then verify it on this page. No
  // password to invent, and the code IS the verification — so "create account"
  // and "confirm email" collapse into one step, and they never leave the page.
  async function handleSendCode() {
    if (!email.trim()) return
    // Was `if (!ageConsent || !email.trim()) return` — a silent no-op. The
    // button is only disabled on an empty email, so with consent unticked it
    // looked live, did nothing, and said nothing: the person waits for a code
    // that was never requested. Say so instead.
    if (!ageConsent) { setAuthError('Please confirm you are 13 or older first.'); return }
    setAuthSubmitting(true)
    setAuthError('')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    if (error) { setAuthError(error.message) } else { setCode(''); setAuthMode('code') }
    setAuthSubmitting(false)
  }

  async function handleVerifyCode() {
    const token = code.trim()
    if (token.length < 6) return
    setAuthSubmitting(true)
    setAuthError('')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (error) { setAuthError('That code didn’t match. Check it and try again.'); setAuthSubmitting(false); return }
    track('sign_up', { method: 'email_otp' })
    // Attach the band they are standing on to the account they just made.
    // Without this the common path — register as a guest, then sign up — left
    // the band with a null owner_id: invisible on their dashboard and
    // untransferable, since transfers require owner or holder.
    //
    // Wait for the session to be readable first. verifyOtp resolves before the
    // auth cookie is necessarily visible to the server, and claim-band reads
    // the session from that cookie — so firing immediately returns 401 and the
    // claim is lost. Two real signups (2026-08-19) created accounts this way
    // and left their bands unowned.
    try { await supabase.auth.getSession() } catch {}
    try {
      const res = await fetch('/api/claim-band', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bandId }) })
      // One retry: the cookie can still be a moment behind on a slow phone.
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 1200))
        await fetch('/api/claim-band', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bandId }) })
      }
    } catch {}
    // Signed in. Offer a password before leaving: the code created the account
    // and no password was ever set, so without this step the only way back in is
    // another emailed code — and nothing anywhere says so. Skippable, because a
    // code is a perfectly good way to sign in.
    setAuthMode('password')
    setAuthSubmitting(false)
  }

  async function handleSetPassword() {
    if (password.length < 8) { setPwError('Use at least 8 characters.'); return }
    setPwSaving(true)
    setPwError('')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setPwError(error.message || 'Could not save that password.'); setPwSaving(false); return }
    window.location.reload()
  }

  async function handleGoogleSignIn() {
    if (!ageConsent) return
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
  }

  if (userId) return null

  return (
    <div>
      <div style={{ margin: '24px 20px', background: `linear-gradient(135deg, ${GREEN}, #2E7D6B)`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🙏</div>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: body, fontSize: 14, opacity: 0.85, fontStyle: 'italic', lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <div style={{ margin: '0 20px 24px', background: 'white', borderRadius: 16, padding: '24px', border: '1px solid rgba(44,24,16,0.1)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>
          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Save your place in this journey</div>
          <div style={{ fontFamily: body, fontSize: 13, color: GRAY, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.5 }}>Create a free account to get your daily verse every time you tap, track your prayers, and follow this band&apos;s story.</div>
          <div onClick={() => setAgeConsent(!ageConsent)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1, border: `2px solid ${ageConsent ? GOLD : 'rgba(44,24,16,0.2)'}`, background: ageConsent ? GOLD : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ageConsent && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontFamily: body, fontSize: 13, color: DARK, lineHeight: 1.5 }}>I confirm that I am <strong>13 years of age or older</strong>, or I am a parent or guardian creating this account on behalf of a child.</div>
          </div>
          {authMode === null && (
            <div>
              <button onClick={() => { if (ageConsent) setAuthMode('email') }} disabled={!ageConsent} style={{ display: 'block', width: '100%', padding: '13px', marginBottom: 10, background: ageConsent ? GOLD : '#ccc', color: ageConsent ? INK : 'white', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                Continue with email
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
                <span style={{ fontFamily: body, fontSize: 12, color: GRAY, letterSpacing: '0.06em' }}>or continue with</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
              </div>
              <button onClick={handleGoogleSignIn} disabled={!ageConsent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', marginBottom: 10, background: ageConsent ? DARK : '#ccc', color: 'white', border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15, fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed', boxSizing: 'border-box' }}>
                <span style={{ fontSize: 18 }}>G</span> Continue with Google
              </button>
              <button onClick={async () => {
                if (!ageConsent) return
                const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
              }} disabled={!ageConsent} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '13px', marginBottom: 10,
                background: ageConsent ? '#000' : '#ccc', color: 'white',
                border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15,
                fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.74-1.517.03-2.01-.9-3.71-.9-1.717 0-2.26.87-3.71.93-1.44.05-2.53-1.51-3.6-2.84-1.877-2.35-3.32-6.64-1.39-9.53.96-1.42 2.68-2.32 4.55-2.35 1.45-.03 2.83.98 3.71.98.87 0 2.53-1.21 4.26-1.03.72.03 2.75.29 4.06 2.18-.11.07-2.42 1.42-2.39 4.24.03 3.37 2.95 4.49 2.98 4.5z"/></svg> Continue with Apple
              </button>
              <button onClick={async () => {
                if (!ageConsent) return
                const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                await supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: `${window.location.origin}/band/${bandId}` } })
              }} disabled={!ageConsent} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '13px', marginBottom: 10,
                background: ageConsent ? '#1877F2' : '#ccc', color: 'white',
                border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15,
                fontWeight: 600, cursor: ageConsent ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>f</span> Continue with Facebook
              </button>
            </div>
          )}
          {authMode === 'email' && (
            <div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e => { if (e.key === 'Enter' && email.trim()) handleSendCode() }} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 15, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
              {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
              {/* Was "Already have an account? Sign in" sitting directly under
                  the email field, which read as the next step. A first-time
                  person following it reached the sign-in page, where the code
                  button refuses unknown addresses — a dead end. Made explicit
                  that this box already creates the account. */}
              <div style={{ fontFamily: body, fontSize: 12, color: GRAY, marginBottom: 16, lineHeight: 1.5 }}>
                New here? Just enter your email above — we&apos;ll create your account.
                <br />
                Already signed up before? <a href="/signin" style={{ color: GOLD }}>Sign in instead</a>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSendCode} disabled={authSubmitting || !email.trim() || !ageConsent} style={{ flex: 1, padding: '13px', background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{authSubmitting ? 'Sending...' : 'Email me a code'}</button>
                <button onClick={() => setAuthMode(null)} style={{ padding: '13px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Back</button>
              </div>
            </div>
          )}
          {authMode === 'password' && (
            <div>
              <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 6 }}>You&apos;re in ✝︎</div>
              <div style={{ fontFamily: body, fontSize: 13, color: GRAY, lineHeight: 1.55, marginBottom: 16 }}>
                Your account is ready. Want a password so you can sign in without waiting for a code next time? You can
                always skip this &mdash; we&apos;ll email you a code whenever you need one.
              </div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>Password (optional)</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && password.length >= 8) handleSetPassword() }}
                placeholder="At least 8 characters"
                style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: body, fontSize: 16, color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
              />
              {pwError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{pwError}</div>}
              <button onClick={handleSetPassword} disabled={pwSaving || password.length < 8} style={{ display: 'block', width: '100%', padding: '13px', background: password.length >= 8 ? GOLD : '#ccc', color: password.length >= 8 ? INK : 'white', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: password.length >= 8 ? 'pointer' : 'not-allowed' }}>
                {pwSaving ? 'Saving…' : 'Save password'}
              </button>
              <button onClick={() => window.location.reload()} style={{ display: 'block', width: '100%', marginTop: 10, padding: '12px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>
                No thanks &mdash; email me a code each time
              </button>
            </div>
          )}
          {authMode === 'code' && (
            <div>
              <div style={{ fontFamily: body, fontSize: 13, color: DARK, lineHeight: 1.5, marginBottom: 16 }}>We sent a 6-digit code to <strong>{email}</strong>. Enter it below — no password needed.</div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>6-digit code</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" onKeyDown={e => { if (e.key === 'Enter' && code.trim().length >= 6) handleVerifyCode() }} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: serif, fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
              {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleVerifyCode} disabled={authSubmitting || code.trim().length < 6} style={{ flex: 1, padding: '13px', background: code.trim().length >= 6 ? GOLD : '#ccc', color: code.trim().length >= 6 ? INK : 'white', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: code.trim().length >= 6 ? 'pointer' : 'not-allowed' }}>{authSubmitting ? 'Verifying...' : 'Verify & save ✝︎'}</button>
                <button onClick={() => { setAuthMode('email'); setAuthError(''); setCode('') }} style={{ padding: '13px 16px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}>Back</button>
              </div>
              <button onClick={handleSendCode} disabled={authSubmitting} style={{ display: 'block', width: '100%', marginTop: 12, background: 'none', border: 'none', color: GOLD, fontFamily: body, fontSize: 13, cursor: 'pointer' }}>Didn&apos;t get it? Resend code</button>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 16, fontFamily: body, fontSize: 12, color: GRAY }}>No account needed to hold a band or leave a prayer.</div>
          {/* Was a countdown that reloaded the page after 8 seconds — far too
              short to enter an email, wait for a code and type it, so it threw
              people off this screen mid-signup. Leaving is now deliberate. */}
          {showCountdown !== false && (
            <button
              onClick={() => window.location.reload()}
              style={{ display: 'block', width: '100%', marginTop: 16, padding: '12px', background: 'transparent', color: GRAY, border: '1px solid rgba(44,24,16,0.15)', borderRadius: 10, fontFamily: body, fontSize: 14, cursor: 'pointer' }}
            >
              Skip for now — take me to my band →
            </button>
          )}
        </div>
    </div>
  )
}
