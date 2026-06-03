import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Extract subdomain
  const hostParts = host.split('.')
  
  // Check if it's a church subdomain (e.g. grace.prayerbands.com)
  // Not www, not prayerbands.com directly
  if (
    hostParts.length === 3 &&
    hostParts[1] === 'prayerbands' &&
    hostParts[0] !== 'www'
  ) {
    const subdomain = hostParts[0]
    
    // Rewrite to /church/[subdomain] route
    url.pathname = `/church/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
