import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

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

    const { circleId } = await params

    // DB ops via service role (these tables have recursive RLS policies).
    const admin = createServiceClient()

    // Get circle details
    const { data: circle, error } = await admin
      .from('prayer_circles')
      .select('*')
      .eq('id', circleId)
      .single()

    if (error || !circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 })
    }

    // Access: a signed-in member, OR anyone presenting the correct join code
    // (read-only — they can view but must sign in to post or pray).
    let membership: { role: string } | null = null
    if (user) {
      const { data } = await admin
        .from('circle_members')
        .select('role')
        .eq('circle_id', circleId)
        .eq('user_id', user.id)
        .maybeSingle()
      membership = data
    }
    const code = (req.nextUrl.searchParams.get('code') || '').trim().toUpperCase()
    const codeValid = !!code && !!circle.join_code && code === String(circle.join_code).toUpperCase()

    // Throttle code-based (non-member) reads — this path treats the join code as
    // a view credential, so without a limit it's a brute-force oracle for the
    // whole circle (members + request text). Members reading their own circle
    // skip the limit entirely.
    if (!membership) {
      const ip = getClientIp(req)
      if (!(await checkRateLimit(`circle-read:${ip}`, 15, 60))) {
        return NextResponse.json({ error: 'Too many attempts. Please wait a moment.' }, { status: 429 })
      }
    }

    if (!membership && !codeValid) {
      return NextResponse.json(
        { error: user ? 'Not a member of this circle' : 'Sign in or use a join code to view this circle' },
        { status: user ? 403 : 401 }
      )
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
      i_prayed: !!user && intercessions.some(i => i.request_id === r.id && i.user_id === user.id)
    }))

    // Resolve member identity (name + avatar) so the circle can show who's
    // praying together. Request authors stay unattributed — a circle prayer is
    // shown to everyone but not tied to a face.
    const memberIds = (members ?? []).map((m: any) => m.user_id).filter(Boolean)
    const profById: Record<string, any> = {}
    if (memberIds.length > 0) {
      const { data: profs } = await admin.from('profiles').select('id, full_name, avatar_icon, avatar_initials, avatar_font').in('id', memberIds)
      ;(profs ?? []).forEach((p: any) => { profById[p.id] = p })
    }
    const membersEnriched = (members ?? []).map((m: any) => ({
      ...m,
      name: profById[m.user_id]?.full_name ?? null,
      avatar: { icon: profById[m.user_id]?.avatar_icon ?? null, initials: profById[m.user_id]?.avatar_initials ?? null, font: profById[m.user_id]?.avatar_font ?? null },
    }))

    return NextResponse.json({
      circle,
      members: membersEnriched,
      requests: requestsWithCounts,
      my_role: membership?.role ?? null,
      my_user_id: user?.id ?? null,
      is_member: !!membership
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
