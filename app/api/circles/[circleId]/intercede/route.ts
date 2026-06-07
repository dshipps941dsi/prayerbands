import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST — toggle intercession on/off for a prayer request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { circleId } = await params
    const { request_id } = await req.json()

    if (!request_id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    // DB ops via service role (recursive RLS on these tables).
    const admin = createServiceClient()

    // Verify circle membership
    const { data: membership } = await admin
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    // Check if already interceding
    const { data: existing } = await admin
      .from('circle_intercessions')
      .select('id')
      .eq('request_id', request_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Remove intercession (un-pray)
      await admin
        .from('circle_intercessions')
        .delete()
        .eq('id', existing.id)

      return NextResponse.json({ praying: false })
    } else {
      // Add intercession
      await admin
        .from('circle_intercessions')
        .insert({ request_id, user_id: user.id })

      return NextResponse.json({ praying: true })
    }
  } catch (err) {
    console.error('Intercession toggle error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
