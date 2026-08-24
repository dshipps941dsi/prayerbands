import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Mute (or unmute) a person so their shared prayers stop appearing in your
// "Their Requests" feed. Private to you — the muted person is never told.
// POST { muted_id, op: 'mute' | 'unmute' }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const muted_id = String(body.muted_id || '')
  const op = body.op === 'unmute' ? 'unmute' : 'mute'
  if (!muted_id) return NextResponse.json({ error: 'muted_id is required' }, { status: 400 })
  if (muted_id === user.id) return NextResponse.json({ error: 'You cannot mute yourself' }, { status: 400 })

  const admin = createServiceClient()
  if (op === 'unmute') {
    await admin.from('prayer_mutes').delete().eq('muter_id', user.id).eq('muted_id', muted_id)
  } else {
    await admin.from('prayer_mutes').upsert({ muter_id: user.id, muted_id }, { onConflict: 'muter_id,muted_id' })
  }
  return NextResponse.json({ success: true })
}
