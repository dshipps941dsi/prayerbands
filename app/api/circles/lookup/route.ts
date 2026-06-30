import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.toUpperCase().trim()

    if (!code) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 })
    }

    // Throttle code guessing — this is an unauthenticated lookup over a 6-char
    // code space, so without a limit it's a brute-force oracle for enumerating
    // every private circle. 10 attempts/min/IP is plenty for a real person
    // typing one code.
    const ip = getClientIp(req)
    if (!(await checkRateLimit(`circle-lookup:${ip}`, 10, 60))) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
    }

    const supabase = createServiceClient()

    const { data: circle, error } = await supabase
      .from('prayer_circles')
      .select(`
        id,
        name,
        description,
        join_code,
        is_closed,
        created_at
      `)
      .eq('join_code', code)
      .eq('is_closed', false)
      .single()

    if (error || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    // Get member count
    const { count } = await supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id)

    return NextResponse.json({
      circle: {
        ...circle,
        member_count: count ?? 0
      }
    })
  } catch (err) {
    console.error('Circle lookup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
