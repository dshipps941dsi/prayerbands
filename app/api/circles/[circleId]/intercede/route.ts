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

    // The request must belong to THIS circle. Without this check a member of
    // one circle could toggle intercessions on requests in circles they can't
    // access (the service client bypasses the RLS WITH CHECK that would bind
    // request_id -> membership). Also closes a request-UUID existence oracle.
    const { data: reqRow } = await admin
      .from('circle_prayer_requests')
      .select('circle_id')
      .eq('id', request_id)
      .maybeSingle()

    if (!reqRow || reqRow.circle_id !== circleId) {
      return NextResponse.json({ error: 'Request not found in this circle' }, { status: 404 })
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
    } else {
      // Add intercession. Ignore a unique-constraint conflict (a concurrent
      // double-tap) — the row already exists, which is the desired end state.
      const { error: insErr } = await admin
        .from('circle_intercessions')
        .insert({ request_id, user_id: user.id })
      if (insErr && insErr.code !== '23505') {
        return NextResponse.json({ error: 'Could not record your prayer' }, { status: 500 })
      }
    }

    // Return the authoritative count + this user's state so the client doesn't
    // drift from optimistic updates.
    const { count } = await admin
      .from('circle_intercessions')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', request_id)

    return NextResponse.json({ praying: !existing, count: count ?? 0 })
  } catch (err) {
    console.error('Intercession toggle error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
