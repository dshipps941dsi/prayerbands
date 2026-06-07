import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/network/intercede  { request_id }
// Toggle the current user's intercession (pray / un-pray) on a network request.
// You may only intercede on your own request or one shared by an accepted connection.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_id } = await req.json()
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 })
    }

    // Resolve the request's owner (service role — the row may belong to a connection).
    const admin = createServiceClient()
    const { data: request } = await admin
      .from('prayer_network_requests')
      .select('id, user_id')
      .eq('id', request_id)
      .single()

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Must be the owner, or accepted-connected to the owner.
    if (request.user_id !== user.id) {
      const { data: conn } = await supabase
        .from('prayer_network_connections')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${request.user_id}),and(requester_id.eq.${request.user_id},recipient_id.eq.${user.id})`)
        .maybeSingle()
      if (!conn) {
        return NextResponse.json({ error: 'Not connected to this person' }, { status: 403 })
      }
    }

    // Toggle.
    const { data: existing } = await supabase
      .from('prayer_network_intercessions')
      .select('id')
      .eq('request_id', request_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('prayer_network_intercessions').delete().eq('id', existing.id)
      return NextResponse.json({ praying: false })
    }

    await supabase.from('prayer_network_intercessions').insert({ request_id, user_id: user.id })
    return NextResponse.json({ praying: true })
  } catch (err) {
    console.error('Network intercede error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
