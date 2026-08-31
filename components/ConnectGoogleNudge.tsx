'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// A gentle, dismissible nudge shown only to people whose only sign-in is Apple
// and who have not linked Google. Apple's "Hide My Email" leaves us with a
// fragile relay address (and no Gmail we prefer for reach/referral), so we
// invite them to connect Google — which links onto the SAME account (no
// duplicate) and lets us capture their real email.
const DISMISS_KEY = 'pb-connect-google-dismissed'

export default function ConnectGoogleNudge() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  useEffect(() => {
    (async () => {
      const supabase = sb()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ids } = await supabase.auth.getUserIdentities()
      const provs = (ids?.identities || []).map(i => i.provider)
      const hasGoogle = provs.includes('google')
      const hasApple = provs.includes('apple')
      // Returning from a successful link: capture the Gmail, show nothing.
      if (hasGoogle) {
        fetch('/api/link/capture-google-email', { method: 'POST' }).catch(() => {})
        return
      }
      let dismissed = false
      try { dismissed = localStorage.getItem(DISMISS_KEY) === '1' } catch {}
      if (hasApple && !dismissed) setShow(true)
    })()
  }, [])

  async function connect() {
    setBusy(true)
    const { data, error } = await sb().auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { setBusy(false); return }
    if (data?.url) window.location.href = data.url
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#FFFDF8', border: '1px solid rgba(200,169,110,0.34)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, boxShadow: '0 2px 10px rgba(10,22,40,0.05)' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#15223B', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Add your Google account</div>
        <div style={{ fontSize: 13, color: '#5C6573', lineHeight: 1.5, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
          You signed in with Apple. Connect Google too so you never lose access and we can reach you about your prayers — it links to this same account.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={connect} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFDF8', color: '#2A3344', border: '1px solid rgba(92,101,115,0.28)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {busy ? 'Connecting…' : 'Connect Google'}
        </button>
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#9AA3AE', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '6px 8px' }}>×</button>
      </div>
    </div>
  )
}
