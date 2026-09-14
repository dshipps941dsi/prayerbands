import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Where Google / Apple / Facebook hand the person back after they authorise.
//
// This used to be a client page that waited for the browser to notice the
// new session and gave up after five seconds, sending people to the sign-in
// page even though Supabase had already signed them in. On a slow phone the
// exchange plus script load plus profile lookup routinely took longer than
// that, so a successful sign-in looked like a failure. Now the exchange
// happens here, on the server, and the redirect carries the session cookies
// with it. Nothing to wait for, nothing to time out.

const SIGNIN = '/signin'

function safeNext(raw: string | null): string | null {
  if (!raw) return null
  // Same-origin paths only. "//evil.com" is a protocol-relative URL, not a path.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  return raw
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const next = safeNext(url.searchParams.get('next'))
  const providerError = url.searchParams.get('error_description') || url.searchParams.get('error')

  // The provider refused or the person backed out. Say so on the sign-in
  // page instead of looping them through it silently.
  if (providerError && !code) {
    const to = new URL(SIGNIN, origin)
    to.searchParams.set('error', providerError)
    if (next) to.searchParams.set('redirect', next)
    return NextResponse.redirect(to)
  }
  if (!code) {
    const to = new URL(SIGNIN, origin)
    if (next) to.searchParams.set('redirect', next)
    return NextResponse.redirect(to)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.session) {
    const to = new URL(SIGNIN, origin)
    to.searchParams.set('error', error?.message || 'Sign-in did not complete. Please try again.')
    if (next) to.searchParams.set('redirect', next)
    return NextResponse.redirect(to)
  }

  if (next) return NextResponse.redirect(new URL(next, origin))

  // No explicit destination: ministry accounts go to their dashboard,
  // everyone else to their band.
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', data.session.user.id)
    .maybeSingle()
  return NextResponse.redirect(new URL(profile?.org_id ? '/org/dashboard' : '/my-band', origin))
}
