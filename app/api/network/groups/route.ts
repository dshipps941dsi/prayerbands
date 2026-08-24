import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Partner groups — a person's private labels on the partners they know
// (Youth Group, Baseball team). Owner-scoped: you only ever touch your own.
//
// GET    -> { groups: [{ id, name, member_ids: [] }] }
// POST   { name }        -> create a group
// DELETE ?id=<groupId>   -> delete a group (and its memberships, via cascade)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ groups: [] })

  const admin = createServiceClient()
  const { data: groups } = await admin
    .from('partner_groups')
    .select('id, name, sort_order, created_at')
    .eq('owner_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const ids = (groups ?? []).map(g => g.id)
  const membersByGroup = new Map<string, string[]>()
  if (ids.length) {
    const { data: members } = await admin
      .from('partner_group_members')
      .select('group_id, member_id')
      .in('group_id', ids)
    for (const m of members ?? []) {
      const arr = membersByGroup.get(m.group_id) ?? []
      arr.push(m.member_id)
      membersByGroup.set(m.group_id, arr)
    }
  }

  return NextResponse.json({
    groups: (groups ?? []).map(g => ({ id: g.id, name: g.name, member_ids: membersByGroup.get(g.id) ?? [] })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'A group name is required.' }, { status: 400 })

  const admin = createServiceClient()
  // A person doesn't need dozens of labels; cap it so the table can't be spammed.
  const { count } = await admin
    .from('partner_groups')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: 'You have reached the group limit.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('partner_groups')
    .insert({ owner_id: user.id, name })
    .select('id, name')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Could not create the group.' }, { status: 500 })

  return NextResponse.json({ group: { id: data.id, name: data.name, member_ids: [] } })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createServiceClient()
  // Scope the delete to the owner so one person can't delete another's group.
  const { error } = await admin
    .from('partner_groups')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not delete the group.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
