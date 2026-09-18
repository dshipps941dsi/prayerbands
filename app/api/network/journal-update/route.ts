import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Follow-ups under a journal entry: "saw the doctor today", "she's home".
// Only the entry's owner writes or removes them; RLS enforces it, and the
// entry lookup below makes the failure a clear 404 rather than a silent no-op.

// POST /api/network/journal-update  { entry_id, body, kind? }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await req.json()
    const entry_id = String(payload.entry_id || '')
    const body = String(payload.body || '').trim()
    const kind = payload.kind === 'answered' ? 'answered' : 'update'
    if (!/^[0-9a-fA-F-]{36}$/.test(entry_id)) return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })
    if (!body) return NextResponse.json({ error: 'Write something first' }, { status: 400 })
    if (body.length > 1000) return NextResponse.json({ error: 'Keep an update under 1000 characters' }, { status: 400 })

    const { data: entry } = await supabase
      .from('prayer_network_requests')
      .select('id')
      .eq('id', entry_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    const { data: update, error } = await supabase
      .from('journal_updates')
      .insert({ entry_id, user_id: user.id, body, kind })
      .select('id, entry_id, body, kind, created_at')
      .single()
    if (error || !update) {
      console.error('Journal update insert error:', error)
      return NextResponse.json({ error: 'Failed to save the update' }, { status: 500 })
    }
    return NextResponse.json({ update })
  } catch (err) {
    console.error('Journal update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/network/journal-update?id=XXX
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id') || ''
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase.from('journal_updates').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: 'Failed to remove the update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Journal update DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
