import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { hasHeldBand } from '@/lib/band-holder'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

type Person = { name: string | null; avatar: { icon: string | null; initials: string | null; font: string | null } }

// GET /api/circles/[circleId] — the whole circle for its members: who is in
// it, the Prayer Wall (topics, each with its prayers underneath and its pray
// count), and the viewer's standing in it.
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

    // Access: an account, always. A member sees their circle; someone signed
    // in with the correct join code can look before joining. The code alone,
    // with no account, shows nothing — a wall is personal.
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view this circle' }, { status: 401 })
    }
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
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    // Members and topics. `*` on the topics so the wall columns (title, kind)
    // ride along once the migration has run and are simply absent before it.
    const [{ data: members }, { data: requests }, hasBand] = await Promise.all([
      admin.from('circle_members').select('id, role, joined_at, user_id').eq('circle_id', circleId).order('joined_at', { ascending: true }),
      admin.from('circle_prayer_requests').select('*').eq('circle_id', circleId).order('created_at', { ascending: false }),
      hasHeldBand(admin, user.id),
    ])

    const requestIds = (requests ?? []).map(r => r.id)
    let intercessions: { request_id: string; user_id: string }[] = []
    let replies: { id: string; request_id: string; user_id: string; body: string; created_at: string }[] = []
    if (requestIds.length > 0) {
      const [{ data: intercessionData }, repliesRes] = await Promise.all([
        admin.from('circle_intercessions').select('request_id, user_id').in('request_id', requestIds),
        admin.from('circle_prayer_replies').select('id, request_id, user_id, body, created_at').in('request_id', requestIds).order('created_at', { ascending: true }),
      ])
      intercessions = intercessionData ?? []
      // No replies table yet (migration pending): the wall simply has no prayers under its topics.
      if (!repliesRes.error) replies = (repliesRes.data ?? []) as typeof replies
    }

    // One identity lookup for everyone on the page: members, topic authors,
    // and the people who wrote prayers. The wall reads like a conversation,
    // so a topic and each prayer under it carry a name and a face.
    const ids = new Set<string>()
    for (const m of members ?? []) if (m.user_id) ids.add(m.user_id)
    for (const r of requests ?? []) if (r.user_id) ids.add(r.user_id)
    for (const r of replies) if (r.user_id) ids.add(r.user_id)
    const profById: Record<string, Person> = {}
    if (ids.size > 0) {
      const { data: profs } = await admin.from('profiles').select('id, full_name, avatar_icon, avatar_initials, avatar_font').in('id', [...ids])
      for (const p of (profs ?? []) as any[]) {
        profById[p.id] = { name: p.full_name ?? null, avatar: { icon: p.avatar_icon ?? null, initials: p.avatar_initials ?? null, font: p.avatar_font ?? null } }
      }
    }
    const person = (id: string | null | undefined): Person => (id && profById[id]) || { name: null, avatar: { icon: null, initials: null, font: null } }

    const repliesByReq = new Map<string, any[]>()
    for (const r of replies) {
      if (!repliesByReq.has(r.request_id)) repliesByReq.set(r.request_id, [])
      repliesByReq.get(r.request_id)!.push({ ...r, ...person(r.user_id) })
    }

    const topics = (requests ?? []).map((r: any) => ({
      ...r,
      title: r.title ?? null,
      kind: r.kind === 'update' ? 'update' : 'request',
      intercession_count: intercessions.filter(i => i.request_id === r.id).length,
      i_prayed: !!user && intercessions.some(i => i.request_id === r.id && i.user_id === user.id),
      is_mine: !!user && r.user_id === user.id,
      replies: repliesByReq.get(r.id) ?? [],
      ...person(r.user_id),
    }))

    const membersEnriched = (members ?? []).map((m: any) => ({ ...m, ...person(m.user_id) }))

    return NextResponse.json({
      circle,
      members: membersEnriched,
      requests: topics,
      my_role: membership?.role ?? null,
      my_user_id: user.id,
      is_member: !!membership,
      // Posting a topic or writing a prayer takes a band; following and
      // tapping Pray only take an account.
      has_band: hasBand,
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

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 80)
      if (!name) return NextResponse.json({ error: 'The circle needs a name.' }, { status: 400 })
      updates.name = name
    }
    if (body.description !== undefined) updates.description = String(body.description ?? '').trim().slice(0, 300) || null
    if (body.is_closed !== undefined) updates.is_closed = !!body.is_closed

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
