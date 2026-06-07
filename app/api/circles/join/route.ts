import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { circle_id } = await req.json()

    if (!circle_id) {
      return NextResponse.json({ error: 'Circle ID is required' }, { status: 400 })
    }

    // DB ops via service role (avoids the recursive RLS policies on these tables).
    const admin = createServiceClient()

    // Verify circle exists and is open
    const { data: circle } = await admin
      .from('prayer_circles')
      .select('id, name, is_closed')
      .eq('id', circle_id)
      .single()

    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    if (circle.is_closed) {
      return NextResponse.json({ error: 'This circle is no longer active' }, { status: 403 })
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You are already a member of this circle' }, { status: 409 })
    }

    // Join as member
    const { error: joinError } = await admin
      .from('circle_members')
      .insert({
        circle_id,
        user_id: user.id,
        role: 'member'
      })

    if (joinError) {
      console.error('Join error:', joinError)
      return NextResponse.json({ error: 'Failed to join circle' }, { status: 500 })
    }

    return NextResponse.json({ success: true, circle_id })
  } catch (err) {
    console.error('Circle join error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
