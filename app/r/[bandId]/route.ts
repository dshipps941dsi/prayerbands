import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { issueTapProof, secretMatches } from '@/lib/tap-proof'

// The address programmed into every chip: /r/PB-XXXXX (bands made before
// September 2026) or /r/PB-XXXXX?k=<secret> (bands made from then on).
//
// Forwards to the band page. When the URL carries the band's secret and it
// matches, the phone gets a signed, time-limited cookie first — proof that
// this was a real tap — and the secret is dropped from the address on the
// way, so nothing shared from the band page ever contains it.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ bandId: string }> }) {
  const { bandId: raw } = await ctx.params
  const bandId = String(raw || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
  const origin = new URL(req.url).origin
  if (!bandId) return NextResponse.redirect(new URL('/', origin), 302)

  const res = NextResponse.redirect(new URL(`/band/${bandId}`, origin), 302)
  res.headers.set('Cache-Control', 'no-store')
  const k = req.nextUrl.searchParams.get('k')
  if (k) {
    try {
      const svc = createServiceClient()
      const { data: band } = await svc.from('bands').select('tap_secret_hash').eq('band_id', bandId).maybeSingle()
      if (band && secretMatches(k, band.tap_secret_hash)) {
        const c = issueTapProof(bandId)
        res.cookies.set(c.name, c.value, { maxAge: c.maxAge, httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
      }
    } catch { /* a lookup hiccup must never stop the band from opening */ }
  }
  return res
}
