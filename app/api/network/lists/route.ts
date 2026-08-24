import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Journal lists — named buckets a person files their own prayers into
// (Family, Health, Church). Owner-scoped.
//
// GET    -> { lists: [{ id, name }] }
// POST   { name }        -> create a list
// DELETE ?id=<listId>    -> delete a list (entries keep, their list_id nulls)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ lists: [] })

  const admin = createServiceClient()
  const { data: lists } = await admin
    .from('journal_lists')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return NextResponse.json({ lists: lists ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'A list name is required.' }, { status: 400 })

  const admin = createServiceClient()
  const { count } = await admin
    .from('journal_lists')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
  if ((count ?? 0) >= 30) {
    return NextResponse.json({ error: 'You have reached the list limit.' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('journal_lists')
    .insert({ owner_id: user.id, name })
    .select('id, name')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Could not create the list.' }, { status: 500 })

  return NextResponse.json({ list: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createServiceClient()
  const { error } = await admin
    .from('journal_lists')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not delete the list.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
