import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { circleStanding } from '@/lib/circle-role'

// DELETE — remove a member (leader action) or leave a circle (self)
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
    const target_user_id = searchParams.get('user_id')

    if (!target_user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const isSelf = target_user_id === user.id
    const admin = createServiceClient()

    if (!isSelf) {
      const me = await circleStanding(admin, circleId, user.id)
      if (!me.canLead) {
        return NextResponse.json({ error: 'Only the circle’s leaders can remove members' }, { status: 403 })
      }
      if (target_user_id === me.createdBy) {
        return NextResponse.json({ error: 'The leader cannot be removed — close the circle instead' }, { status: 400 })
      }
      // A co-leader can only be removed by the leader.
      const { data: target } = await admin.from('circle_members').select('role').eq('circle_id', circleId).eq('user_id', target_user_id).maybeSingle()
      if (target?.role === 'co_leader' && !me.isLeader) {
        return NextResponse.json({ error: 'Only the leader can remove a co-leader' }, { status: 403 })
      }
    }

    const { error } = await admin
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', target_user_id)

    if (error) {
      console.error('Remove member error:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove member error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
