import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a band holder (service-role: works regardless of bands RLS)
    const admin = createServiceClient()
    const { data: band } = await admin
      .from('bands')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    const isBandHolder = !!band

    // Get all circles this user belongs to
    const { data: memberships } = await supabase
      .from('circle_members')
      .select('circle_id, role')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ circles: [], is_band_holder: isBandHolder })
    }

    const circleIds = memberships.map(m => m.circle_id)

    // Get circle details
    const { data: circles } = await supabase
      .from('prayer_circles')
      .select('id, name, join_code, is_closed')
      .in('id', circleIds)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })

    if (!circles || circles.length === 0) {
      return NextResponse.json({ circles: [], is_band_holder: isBandHolder })
    }

    // Get member counts per circle
    const { data: memberCounts } = await supabase
      .from('circle_members')
      .select('circle_id')
      .in('circle_id', circleIds)

    // Get open request counts per circle
    const { data: requestCounts } = await supabase
      .from('circle_prayer_requests')
      .select('circle_id')
      .in('circle_id', circleIds)
      .eq('is_answered', false)

    // Build summary objects
    const roleMap = Object.fromEntries(memberships.map(m => [m.circle_id, m.role]))

    const summary = circles.map(circle => ({
      id: circle.id,
      name: circle.name,
      join_code: circle.join_code,
      is_closed: circle.is_closed,
      my_role: roleMap[circle.id] ?? 'member',
      member_count: (memberCounts ?? []).filter(m => m.circle_id === circle.id).length,
      open_request_count: (requestCounts ?? []).filter(r => r.circle_id === circle.id).length
    }))

    return NextResponse.json({ circles: summary, is_band_holder: isBandHolder })
  } catch (err) {
    console.error('My circles error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}