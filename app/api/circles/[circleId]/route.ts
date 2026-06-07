import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET /api/circles/[circleId] — full circle data for members
export async function GET(
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

    // DB ops via service role (these tables have recursive RLS policies).
    const admin = createServiceClient()

    // Verify membership
    const { data: membership } = await admin
      .from('circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    // Get circle details
    const { data: circle, error } = await admin
      .from('prayer_circles')
      .select('*')
      .eq('id', circleId)
      .single()

    if (error || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    // Get members
    const { data: members } = await admin
      .from('circle_members')
      .select(`
        id,
        role,
        joined_at,
        user_id
      `)
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true })

    // Get prayer requests
    const { data: requests } = await admin
      .from('circle_prayer_requests')
      .select(`
        id,
        user_id,
        request_text,
        is_answered,
        answered_at,
        created_at
      `)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })

    // Get intercessions for this circle's requests
    const requestIds = (requests ?? []).map(r => r.id)
    let intercessions: { request_id: string; user_id: string }[] = []
    if (requestIds.length > 0) {
      const { data: intercessionData } = await admin
        .from('circle_intercessions')
        .select('request_id, user_id')
        .in('request_id', requestIds)
      intercessions = intercessionData ?? []
    }

    // Attach intercession count + whether current user has prayed
    const requestsWithCounts = (requests ?? []).map(r => ({
      ...r,
      intercession_count: intercessions.filter(i => i.request_id === r.id).length,
      i_prayed: intercessions.some(i => i.request_id === r.id && i.user_id === user.id)
    }))

    return NextResponse.json({
      circle,
      members: members ?? [],
      requests: requestsWithCounts,
      my_role: membership.role,
      my_user_id: user.id
    })
  } catch (err) {
    console.error('Circle GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/circles/[circleId] — leader can update name, description, regenerate code, close circle
export async function PATCH(
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
    const admin = createServiceClient()

    // Verify leader
    const { data: circle } = await admin
      .from('prayer_circles')
      .select('id, created_by')
      .eq('id', circleId)
      .single()

    if (!circle || circle.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the circle leader can make changes' }, { status: 403 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.is_closed !== undefined) updates.is_closed = body.is_closed

    if (body.regenerate_code) {
      let join_code = ''
      let attempts = 0
      while (attempts < 10) {
        const candidate = generateJoinCode()
        const { data: existing } = await admin
          .from('prayer_circles')
          .select('id')
          .eq('join_code', candidate)
          .maybeSingle()
        if (!existing) {
          join_code = candidate
          break
        }
        attempts++
      }
      if (join_code) updates.join_code = join_code
    }

    const { data: updated, error } = await admin
      .from('prayer_circles')
      .update(updates)
      .eq('id', circleId)
      .select()
      .single()

    if (error) {
      console.error('Circle update error:', error)
      return NextResponse.json({ error: 'Failed to update circle' }, { status: 500 })
    }

    return NextResponse.json({ circle: updated })
  } catch (err) {
    console.error('Circle PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
