import { createHmac, timingSafeEqual } from 'crypto'

// Signed unsubscribe links. The token is an HMAC of (email + scope) so the
// links we email can't be tampered with to opt out arbitrary addresses.
// scope is either 'all' (every prayer email) or a sender's user id.
function secret(): string {
  return process.env.INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET_KEY || ''
}

export function signUnsub(email: string, scope: string): string {
  return createHmac('sha256', secret())
    .update(`${email.toLowerCase()}|${scope}`)
    .digest('hex')
    .slice(0, 32)
}

export function verifyUnsub(email: string, scope: string, token: string): boolean {
  if (!token) return false
  const expected = signUnsub(email, scope)
  if (token.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://prayerbands.com'

function qs(email: string, scope: string): string {
  const t = signUnsub(email, scope)
  return `e=${encodeURIComponent(email)}&s=${encodeURIComponent(scope)}&t=${t}`
}

// Human-facing confirmation page link (email footer links point here).
export function unsubUrl(email: string, scope: string): string {
  return `${SITE}/unsubscribe?${qs(email, scope)}`
}

// API endpoint for the List-Unsubscribe header (RFC 8058 one-click POSTs here;
// a manual GET on it redirects to the confirmation page).
export function unsubPostUrl(email: string, scope: string): string {
  return `${SITE}/api/unsubscribe?${qs(email, scope)}`
}
