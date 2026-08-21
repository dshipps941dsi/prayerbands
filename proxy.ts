import { NextRequest, NextResponse } from 'next/server'

// Renamed from middleware.ts: the middleware convention is deprecated in
// Next 16 and the dev server warns on every boot.

// While the product is small, browsing is limited to the United States — not
// for shipping reasons but to keep the idea from being lifted wholesale before
// there is anything defensible about it.
//
// Band pages are the deliberate exception. The entire product is a band that
// gets passed from person to person, and bands travel: handed to a visitor,
// carried on a trip, posted to family. Blocking a tap would make the object
// itself dead outside the country, which is a far bigger loss than a stranger
// reading the marketing pages.
const ALWAYS_OPEN = [
  '/r/',          // the NFC tap
  '/band/',       // the journey it opens
  '/blessing/',   // a band's shared blessing page
  '/dedicate/',   // dedication link from the shipping email
  '/unavailable', // the message itself, or it would block its own page
]

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Never rewrite API routes, static files, or Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Vercel resolves the country at the edge. `request.geo` no longer exists in
  // Next 16, so the header is the supported route.
  //
  // Fail open, always: no header means local development or an address Vercel
  // could not place, and a visitor it cannot identify is not a reason to shut
  // the door. GEO_LOCK=off lifts the restriction without a code change.
  const country = request.headers.get('x-vercel-ip-country')
  const locked = process.env.GEO_LOCK !== 'off'

  if (locked && country && country !== 'US' && !ALWAYS_OPEN.some(p => pathname.startsWith(p))) {
    url.pathname = '/unavailable'
    return NextResponse.rewrite(url)
  }

  const hostParts = host.split('.')

  if (
    hostParts.length === 3 &&
    hostParts[1] === 'prayerbands' &&
    hostParts[0] !== 'www'
  ) {
    const subdomain = hostParts[0]
    url.pathname = `/church/${subdomain}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
