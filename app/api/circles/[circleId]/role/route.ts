import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { circleStanding } from '@/lib/circle-role'
import { sendPush } from '@/lib/push'

// Name a member co-leader, or step them back down. Leader only.
// POST { user_id, role: 'co_leader' | 'member' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ circleId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { circleId } = await params
    const body = await req.json().catch(() => ({}))
    const targetId = String(body.user_id || '')
    const role = body.role === 'co_leader' ? 'co_leader' : body.role === 'member' ? 'member' : null
    if (!targetId || !role) return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 })

    const admin = createServiceClient()
    const me = await circleStanding(admin, circleId, user.id)
    if (!me.isLeader) return NextResponse.json({ error: 'Only the circle leader can name co-leaders' }, { status: 403 })
    if (targetId === user.id) return NextResponse.json({ error: 'You are already the leader' }, { status: 400 })

    const { data: target } = await admin.from('circle_members').select('id, role').eq('circle_id', circleId).eq('user_id', targetId).maybeSingle()
    if (!target) return NextResponse.json({ error: 'They are not in this circle' }, { status: 404 })

    const { error } = await admin.from('circle_members').update({ role }).eq('id', target.id)
    if (error) {
      // 23514: the role check has not been widened yet (migration pending).
      if (error.code === '23514') return NextResponse.json({ error: 'Co-leaders are still being set up. Please try again shortly.' }, { status: 503 })
      return NextResponse.json({ error: 'Could not change their role' }, { status: 500 })
    }

    if (role === 'co_leader') {
      const { data: circle } = await admin.from('prayer_circles').select('name').eq('id', circleId).maybeSingle()
      await sendPush(targetId, {
        title: `You’re now a co-leader of ${circle?.name || 'a circle'}`,
        body: 'You can post topics and updates on the wall.',
        url: `/my-band?open=circles&circle=${circleId}`,
        tag: `circle-role-${circleId}`,
      })
    }
    return NextResponse.json({ success: true, user_id: targetId, role })
  } catch (err) {
    console.error('Circle role error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
