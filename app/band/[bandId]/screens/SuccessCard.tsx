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
  // Google is a redirect: for a second or two after the tap nothing visibly
  // happens, and people tapped again. Say what is happening and lock the button.
  const [opening, setOpening] = useState<'google' | null>(null)
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
    setAuthSubmitting(true)
    setAuthError('')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    if (error) { setAuthError(error.message) } else { setCode(''); setAuthMode('code') }
    setAuthSubmitting(false)
  }

  async function handleVerifyCode(typed?: string) {
    const token = (typed ?? code).trim()
    if (token.length < 6 || authSubmitting) return
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
      const res = await fetch('/api/claim-band', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bandId, explicit: true }) })
      // One retry: the cookie can still be a moment behind on a slow phone.
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 1200))
        await fetch('/api/claim-band', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bandId, explicit: true }) })
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
    if (opening) return
    setOpening('google')
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/band/${bandId}`)}` } })
    // On success the browser is already leaving; only a failure comes back here.
    if (error) { setOpening(null); setAuthError(error.message || 'Google did not open. Try again, or use email.') }
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
          {authMode === null && (
            <div>
              <button onClick={handleGoogleSignIn} disabled={!!opening} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '13px', marginBottom: 10, background: DARK, color: 'white', border: 'none', borderRadius: 10, fontFamily: body, fontSize: 15, fontWeight: 600, cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.75 : 1, boxSizing: 'border-box' }}>
                <span style={{ fontSize: 18 }}>G</span> {opening === 'google' ? 'Opening Google…' : 'Continue with Google'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
                <span style={{ fontFamily: body, fontSize: 12, color: GRAY, letterSpacing: '0.06em' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(44,24,16,0.12)' }} />
              </div>
              <button onClick={() => setAuthMode('email')} disabled={!!opening} style={{ display: 'block', width: '100%', padding: '13px', marginBottom: 10, background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxSizing: 'border-box' }}>
                Continue with email
              </button>
              {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
              <div style={{ fontFamily: body, fontSize: 12, color: GRAY, lineHeight: 1.5, marginTop: 4 }}>
                By continuing you confirm you&apos;re 13 or older, or a parent or guardian creating this account for your child. <a href="/privacy" style={{ color: GRAY }}>Privacy</a>
              </div>
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
                <button onClick={handleSendCode} disabled={authSubmitting || !email.trim()} style={{ flex: 1, padding: '13px', background: GOLD, color: INK, border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{authSubmitting ? 'Sending...' : 'Email me a code'}</button>
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
              <div style={{ fontFamily: body, fontSize: 13, color: DARK, lineHeight: 1.5, marginBottom: 6 }}>We sent a 6-digit code to <strong>{email}</strong>. Enter it below — no password needed.</div>
              {/* Codes land in spam/Promotions often enough that saying so up
                  front saves the resend. */}
              <div style={{ fontFamily: body, fontSize: 12, color: GRAY, lineHeight: 1.5, marginBottom: 14 }}>Not in your inbox after a minute? Check <strong>Spam</strong> or <strong>Promotions</strong> — then mark it &ldquo;Not spam&rdquo; so the next one lands.</div>
              <label style={{ display: 'block', fontFamily: body, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: GRAY, marginBottom: 6 }}>6-digit code</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) handleVerifyCode(v) }} placeholder="123456" onKeyDown={e => { if (e.key === 'Enter' && code.trim().length >= 6) handleVerifyCode() }} style={{ display: 'block', width: '100%', padding: '12px 14px', border: '1px solid rgba(44,24,16,0.15)', borderRadius: 8, fontFamily: serif, fontSize: 22, letterSpacing: '0.3em', textAlign: 'center', color: DARK, background: CREAM, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
              {authError && <div style={{ fontFamily: body, fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{authError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleVerifyCode()} disabled={authSubmitting || code.trim().length < 6} style={{ flex: 1, padding: '13px', background: code.trim().length >= 6 ? GOLD : '#ccc', color: code.trim().length >= 6 ? INK : 'white', border: 'none', borderRadius: 10, fontFamily: serif, fontSize: 15, fontWeight: 700, cursor: code.trim().length >= 6 ? 'pointer' : 'not-allowed' }}>{authSubmitting ? 'Verifying...' : 'Verify & save ✝︎'}</button>
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
