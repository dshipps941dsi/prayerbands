'use client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Sign in with Apple as a sheet over the page instead of a three-hop redirect.
//
// Apple's own JS opens the sign-in in a popup; on an iPhone that is signed
// into iCloud, Safari turns that popup into the native Face ID sheet, so the
// site never leaves the screen. The identity token Apple hands back goes
// straight to Supabase (signInWithIdToken), which creates or finds the same
// account the redirect flow would — same Services ID, same Supabase provider.
//
// It cannot work everywhere: the installed Home Screen app has no popup, and a
// browser can block one. Every failure throws so the caller falls back to the
// redirect flow, which still works the way it always has.

const SERVICES_ID = 'com.prayerbands.web'
const APPLE_JS = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (cfg: { clientId: string; scope: string; redirectURI: string; state?: string; nonce?: string; usePopup?: boolean }) => void
        signIn: () => Promise<{ authorization: { id_token: string; code: string; state?: string }; user?: { name?: { firstName?: string; lastName?: string }; email?: string } }>
      }
    }
  }
}

export function canUseAppleSheet(): boolean {
  if (typeof window === 'undefined') return false
  // Standalone (Home Screen) apps can't open the popup; use the redirect there.
  const standalone = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return !standalone
}

function loadScript(): Promise<void> {
  if (window.AppleID) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = APPLE_JS
    s.async = true
    s.onload = () => (window.AppleID ? resolve() : reject(new Error('AppleID not available')))
    s.onerror = () => reject(new Error('Could not load Apple sign-in'))
    document.head.appendChild(s)
  })
}

function randomNonce(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')
}

// Resolves once Supabase has a session. Throws on any failure so the caller
// can fall back to signInWithOAuth.
export async function signInWithAppleSheet(supabase: SupabaseClient): Promise<void> {
  if (!canUseAppleSheet()) throw new Error('sheet unavailable')
  await loadScript()
  const nonce = randomNonce()
  const hashed = await sha256Hex(nonce)
  // Apple gets the hash; Supabase gets the raw value and checks that the
  // token's nonce is its hash. The redirectURI must be one of the Services
  // ID's registered return URLs — the Supabase callback already is.
  window.AppleID!.auth.init({
    clientId: SERVICES_ID,
    scope: 'name email',
    redirectURI: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
    nonce: hashed,
    usePopup: true,
  })
  const res = await window.AppleID!.auth.signIn()
  const idToken = res?.authorization?.id_token
  if (!idToken) throw new Error('No identity token')

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken, nonce })
  if (error) throw error

  // Apple sends the name exactly once — on the first authorization — and
  // never again. Keep it now or lose it.
  const first = res.user?.name?.firstName?.trim()
  const last = res.user?.name?.lastName?.trim()
  const fullName = [first, last].filter(Boolean).join(' ')
  if (fullName) {
    try {
      await supabase.auth.updateUser({ data: { full_name: fullName, name: fullName } })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id).is('full_name', null)
    } catch { /* the account exists; a missing name is fixable in Settings */ }
  }
}
