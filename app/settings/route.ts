import { NextResponse } from 'next/server'

// Settings live on the band app's Account tab now (Profile & Settings). The
// old address forwards there; /my-band resolves the band and keeps the query.
export function GET(req: Request) {
  return NextResponse.redirect(new URL('/my-band?tab=account&settings=1', new URL(req.url).origin), 307)
}
