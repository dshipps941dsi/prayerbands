import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Validates a referral code. POST { code } → { valid: true, referrerUserId } or
// { valid: false }. Uses the service-role client to look up the owning profile.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const code = String(body?.code || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ valid: false })

    const admin = createServiceClient()
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ valid: false })
    return NextResponse.json({ valid: true, referrerUserId: data.id })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
