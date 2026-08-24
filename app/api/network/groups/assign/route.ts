import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Add or remove a partner from one of your groups.
// POST { group_id, member_id, op: 'add' | 'remove' }
//
// Both the group and the person must genuinely be yours: you must own the group,
// and member_id must be someone you're actually connected to — so a group can't
// be used to quietly probe or attach arbitrary accounts.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const group_id = String(body.group_id || '')
  const member_id = String(body.member_id || '')
  const op = body.op === 'remove' ? 'remove' : 'add'
  if (!group_id || !member_id) {
    return NextResponse.json({ error: 'group_id and member_id are required' }, { status: 400 })
  }

  const admin = createServiceClient()

  // You must own the group.
  const { data: group } = await admin
    .from('partner_groups')
    .select('id')
    .eq('id', group_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  if (op === 'remove') {
    const { error } = await admin
      .from('partner_group_members')
      .delete()
      .eq('group_id', group_id)
      .eq('member_id', member_id)
    if (error) return NextResponse.json({ error: 'Could not update the group.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Adding: confirm member_id is an accepted connection of the owner, so groups
  // can only ever contain people you've actually connected with.
  const { data: conn } = await admin
    .from('prayer_network_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${user.id},recipient_id.eq.${member_id}),and(requester_id.eq.${member_id},recipient_id.eq.${user.id})`)
    .maybeSingle()
  if (!conn) {
    return NextResponse.json({ error: 'You can only add people you are connected with.' }, { status: 400 })
  }

  const { error } = await admin
    .from('partner_group_members')
    .upsert({ group_id, member_id }, { onConflict: 'group_id,member_id' })
  if (error) return NextResponse.json({ error: 'Could not update the group.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
