import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { nameFromProfile } from '@/lib/network'

// GET /api/connect/info?code=XXXX
// Resolve a connect code to a display name only — never email, phone, or any
// other identifier. Used to render "Connect with <name>" on the connect page.
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{8,16}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }
  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('connect_code', code)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ name: nameFromProfile(profile) })
}
