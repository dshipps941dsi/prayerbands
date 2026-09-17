import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendPush } from '@/lib/push'
import { hasHeldBand } from '@/lib/band-holder'

// A prayer written underneath a topic on a circle's Prayer Wall.
//
// POST   { request_id, body }  — add one; also counts the writer as praying.
// DELETE ?reply_id=…           — remove one (its author, or the circle leader).

const SETTING_UP = 'The prayer wall is still being set up. Please try again shortly.'

async function memberOf(admin: ReturnType<typeof createServiceClient>, circleId: string, userId: string) {
  const { data } = await admin.from('circle_members').select('id').eq('circle_id', circleId).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ circleId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { circleId } = await params
    const payload = await req.json().catch(() => ({}))
    const requestId = String(payload.request_id || '')
    const body = String(payload.body || '').trim().slice(0, 1000)
    if (!requestId) return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    if (!body) return NextResponse.json({ error: 'Write a prayer first.' }, { status: 400 })

    const admin = createServiceClient()
    if (!(await memberOf(admin, circleId, user.id))) {
      return NextResponse.json({ error: 'Not a member of this circle' }, { status: 403 })
    }
    if (!(await hasHeldBand(admin, user.id))) {
      return NextResponse.json({ error: 'Writing a prayer takes a Prayer Band.', needsBand: true }, { status: 403 })
    }

    // The topic must belong to THIS circle (service role bypasses RLS).
    const { data: topic } = await admin.from('circle_prayer_requests')
      .select('id, circle_id, user_id, title, request_text').eq('id', requestId).maybeSingle()
    if (!topic || topic.circle_id !== circleId) {
      return NextResponse.json({ error: 'Topic not found in this circle' }, { status: 404 })
    }

    const { data: reply, error } = await admin.from('circle_prayer_replies')
      .insert({ request_id: requestId, user_id: user.id, body }).select().single()
    if (error) {
      // 42P01: the table is not there yet (migration pending).
      if (error.code === '42P01') return NextResponse.json({ error: SETTING_UP }, { status: 503 })
      console.error('Circle reply insert error:', error)
      return NextResponse.json({ error: 'Could not post your prayer' }, { status: 500 })
    }

    // Writing a prayer is praying: record the intercession too (ignore a
    // duplicate — they had already tapped Pray).
    const { error: iErr } = await admin.from('circle_intercessions').insert({ request_id: requestId, user_id: user.id })
    if (iErr && iErr.code !== '23505') console.error('Circle reply intercession error:', iErr)
    const { count } = await admin.from('circle_intercessions').select('id', { count: 'exact', head: true }).eq('request_id', requestId)

    const { data: prof } = await admin.from('profiles')
      .select('full_name, avatar_icon, avatar_initials, avatar_font').eq('id', user.id).maybeSingle()

    // A nudge to the person who posted the topic (never to yourself).
    if (topic.user_id && topic.user_id !== user.id) {
      const who = prof?.full_name || 'Someone'
      const what = topic.title || String(topic.request_text || '').slice(0, 60)
      await sendPush(topic.user_id, {
        title: `${who} prayed over “${what}”`,
        body: body.length > 120 ? body.slice(0, 117) + '…' : body,
        url: `/my-band?open=circles&circle=${circleId}`,
        tag: `circle-reply-${requestId}`,
      })
    }

    return NextResponse.json({
      reply: {
        ...reply,
        name: prof?.full_name ?? null,
        avatar: { icon: prof?.avatar_icon ?? null, initials: prof?.avatar_initials ?? null, font: prof?.avatar_font ?? null },
      },
      praying: true,
      count: count ?? 0,
    })
  } catch (err) {
    console.error('Circle reply POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ circleId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { circleId } = await params
    const replyId = new URL(req.url).searchParams.get('reply_id') || ''
    if (!replyId) return NextResponse.json({ error: 'reply_id is required' }, { status: 400 })

    const admin = createServiceClient()
    const { data: reply, error: rErr } = await admin.from('circle_prayer_replies')
      .select('id, user_id, request_id').eq('id', replyId).maybeSingle()
    if (rErr?.code === '42P01') return NextResponse.json({ error: SETTING_UP }, { status: 503 })
    if (!reply) return NextResponse.json({ error: 'Reply not found' }, { status: 404 })

    const { data: topic } = await admin.from('circle_prayer_requests').select('circle_id').eq('id', reply.request_id).maybeSingle()
    if (!topic || topic.circle_id !== circleId) return NextResponse.json({ error: 'Reply not found in this circle' }, { status: 404 })

    const { data: circle } = await admin.from('prayer_circles').select('created_by').eq('id', circleId).maybeSingle()
    const isAuthor = reply.user_id === user.id
    const isLeader = circle?.created_by === user.id
    if (!isAuthor && !isLeader) return NextResponse.json({ error: 'Not allowed to remove this prayer' }, { status: 403 })

    const { error } = await admin.from('circle_prayer_replies').delete().eq('id', replyId)
    if (error) return NextResponse.json({ error: 'Could not remove the prayer' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Circle reply DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
