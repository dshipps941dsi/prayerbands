import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendPush } from '@/lib/push'

// POST — add a topic to a circle's Prayer Wall: a prayer request, or an
// update on how things are going. { title?, kind?, request_text? } — a title
// on its own is enough; details are optional.
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
    const admin = createServiceClient()

    // Verify membership
    const { data: membership } = await admin
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }

    const payload = await req.json().catch(() => ({}))
    const title = String(payload.title || '').trim().slice(0, 120) || null
    const kind = payload.kind === 'update' ? 'update' : 'request'
    const details = String(payload.request_text || '').trim().slice(0, 2000)

    if (!title && !details) {
      return NextResponse.json({ error: 'Give the topic a title or some details.' }, { status: 400 })
    }

    // request_text stays the body every older reader (inbox, partner feed)
    // shows; a title-only topic puts the title there so nothing reads blank.
    let { data: request, error } = await admin
      .from('circle_prayer_requests')
      .insert({ circle_id: circleId, user_id: user.id, request_text: details || title!, title, kind })
      .select()
      .single()

    // 42703: the wall columns are not there yet (migration pending) — keep
    // the post by folding the title into the text.
    if (error?.code === '42703') {
      ;({ data: request, error } = await admin
        .from('circle_prayer_requests')
        .insert({ circle_id: circleId, user_id: user.id, request_text: title && details ? `${title}

${details}` : (details || title!) })
        .select()
        .single())
    }

    if (error) {
      console.error('Request insert error:', error)
      return NextResponse.json({ error: 'Failed to add prayer request' }, { status: 500 })
    }

    // Nudge the other members: a new topic is the moment a circle gathers.
    const [{ data: circle }, { data: others }, { data: prof }] = await Promise.all([
      admin.from('prayer_circles').select('name').eq('id', circleId).maybeSingle(),
      admin.from('circle_members').select('user_id').eq('circle_id', circleId).neq('user_id', user.id),
      admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ])
    const to = (others ?? []).map((m: any) => m.user_id).filter(Boolean)
    if (to.length) {
      const who = prof?.full_name || 'Someone'
      const what = title || details.slice(0, 80)
      await sendPush(to, {
        title: kind === 'update' ? `${who} posted an update in ${circle?.name || 'your circle'}` : `${who} asked ${circle?.name || 'your circle'} to pray`,
        body: what,
        url: `/my-band?open=circles&circle=${circleId}`,
        tag: `circle-topic-${circleId}`,
      })
    }

    return NextResponse.json({ request: { ...request, title: request?.title ?? null, kind: request?.kind ?? kind } })
  } catch (err) {
    console.error('Prayer request POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — mark request as answered (owner or leader)
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
    const { request_id, is_answered } = await req.json()

    if (!request_id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify the request belongs to this circle, and the user is its author or the circle leader
    const { data: existingReq } = await admin
      .from('circle_prayer_requests')
      .select('id, user_id, circle_id')
      .eq('id', request_id)
      .eq('circle_id', circleId)
      .maybeSingle()

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const { data: circle } = await admin
      .from('prayer_circles')
      .select('created_by')
      .eq('id', circleId)
      .maybeSingle()

    const { data: actorMembership } = await admin
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAuthor = existingReq.user_id === user.id
    const isLeader = circle?.created_by === user.id
    // Author rights require still being in the circle — a removed/departed member
    // can't keep editing content in a circle they're no longer part of.
    if (!((isAuthor && actorMembership) || isLeader)) {
      return NextResponse.json({ error: 'Not allowed to update this request' }, { status: 403 })
    }

    const { data: updated, error } = await admin
      .from('circle_prayer_requests')
      .update({
        is_answered,
        answered_at: is_answered ? new Date().toISOString() : null
      })
      .eq('id', request_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('Prayer request PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a prayer request (owner or leader)
export async function DELETE(
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
    const { searchParams } = new URL(req.url)
    const request_id = searchParams.get('request_id')

    if (!request_id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify the request belongs to this circle, and the user is its author or the circle leader
    const { data: existingReq } = await admin
      .from('circle_prayer_requests')
      .select('id, user_id')
      .eq('id', request_id)
      .eq('circle_id', circleId)
      .maybeSingle()

    if (!existingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const { data: circle } = await admin
      .from('prayer_circles')
      .select('created_by')
      .eq('id', circleId)
      .maybeSingle()

    const { data: actorMembership } = await admin
      .from('circle_members')
      .select('id')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .maybeSingle()

    const isAuthor = existingReq.user_id === user.id
    const isLeader = circle?.created_by === user.id
    if (!((isAuthor && actorMembership) || isLeader)) {
      return NextResponse.json({ error: 'Not allowed to delete this request' }, { status: 403 })
    }

    const { error } = await admin
      .from('circle_prayer_requests')
      .delete()
      .eq('id', request_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Prayer request DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
