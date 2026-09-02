import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/network/respond  { connection_id, action: 'accept' | 'decline' }
// Only the recipient of a pending request may respond. Decline deletes the row
// (quietly — no notification to the requester), so a pair can reconnect later.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connection_id, action } = await req.json()
    // Accept both present- and past-tense forms — the Partners UI sends
    // 'accepted'/'declined', older callers send 'accept'/'decline'.
    const norm = String(action || '').toLowerCase()
    const isAccept = norm === 'accept' || norm === 'accepted'
    const isDecline = norm === 'decline' || norm === 'declined'
    if (!connection_id || (!isAccept && !isDecline)) {
      return NextResponse.json({ error: 'connection_id and a valid action are required' }, { status: 400 })
    }

    // RLS only returns connections the viewer is part of.
    const { data: conn } = await supabase
      .from('prayer_network_connections')
      .select('id, recipient_id, status')
      .eq('id', connection_id)
      .maybeSingle()

    if (!conn) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (conn.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Only the recipient can respond to this request' }, { status: 403 })
    }

    if (isAccept) {
      const { error } = await supabase
        .from('prayer_network_connections')
        .update({ status: 'accepted' })
        .eq('id', connection_id)
      if (error) {
        return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'accepted' })
    }

    // Decline → remove quietly.
    const { error } = await supabase
      .from('prayer_network_connections')
      .delete()
      .eq('id', connection_id)
    if (error) {
      return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 })
    }
    return NextResponse.json({ success: true, status: 'declined' })
  } catch (err) {
    console.error('Network respond error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
