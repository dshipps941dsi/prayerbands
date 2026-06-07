import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    if (!isSelf) {
      // Must be leader to remove others
      const { data: circle } = await supabase
        .from('prayer_circles')
        .select('created_by')
        .eq('id', circleId)
        .single()

      if (!circle || circle.created_by !== user.id) {
        return NextResponse.json({ error: 'Only the leader can remove members' }, { status: 403 })
      }

      // Leader cannot remove themselves via this endpoint
      if (target_user_id === circle.created_by) {
        return NextResponse.json({ error: 'Leader cannot be removed — close the circle instead' }, { status: 400 })
      }
    }

    const { error } = await supabase
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
