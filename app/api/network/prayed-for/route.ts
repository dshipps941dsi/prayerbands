import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/network/prayed-for
//   { toUserId }   — tell a prayer partner you prayed for them
//   { requestId }  — tell the author of a request you just prayed for
// Drops an "‹you› prayed for you 🙏" note into the recipient's inbox. Reach is
// limited to people you're connected to: accepted prayer partners, or the
// author of a request you've actually interceded on. No cold-messaging.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const note = (typeof body.note === 'string' ? body.note : '').trim().slice(0, 600) || null
  const svc = createServiceClient()

  // Resolve the recipient + confirm the sender is allowed to reach them.
  let toUserId: string | null = null

  if (body.requestId) {
    // Reach via "I prayed for it": an intercession by this user must exist.
    const { data: inter } = await svc
      .from('prayer_intercessions')
      .select('request_id')
      .eq('request_id', body.requestId)
      .eq('intercessor_id', user.id)
      .maybeSingle()
    if (!inter) return NextResponse.json({ error: 'Pray for this request first.' }, { status: 403 })
    const { data: pr } = await svc.from('prayer_requests').select('user_id').eq('id', body.requestId).maybeSingle()
    toUserId = pr?.user_id || null
  } else if (body.toUserId) {
    toUserId = String(body.toUserId)
    // Reach via partnership: an accepted connection either direction.
    const { data: conns } = await svc
      .from('prayer_network_connections')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${toUserId}),and(requester_id.eq.${toUserId},recipient_id.eq.${user.id})`)
      .limit(1)
    if (!conns || !conns.length) return NextResponse.json({ error: 'You can only send this to a prayer partner.' }, { status: 403 })
  }

  if (!toUserId) return NextResponse.json({ error: 'No recipient.' }, { status: 400 })
  if (toUserId === user.id) return NextResponse.json({ error: "That's you." }, { status: 400 })

  // Soft dedupe: don't stack repeats at the same person within 12 hours.
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  const { data: recent } = await svc
    .from('prayer_encouragements')
    .select('id')
    .eq('from_user_id', user.id)
    .eq('to_user_id', toUserId)
    .gte('created_at', since)
    .limit(1)
  if (recent && recent.length && !note) return NextResponse.json({ ok: true, deduped: true })

  const { error } = await svc.from('prayer_encouragements').insert({ from_user_id: user.id, to_user_id: toUserId, note })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
