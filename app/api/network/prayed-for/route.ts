import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// "People you gave a band to" (and who gave you one): immediate neighbors in a
// band's registration chain — the same rule my-network uses to list lineage
// partners, so the recipients the UI offers match what the server authorizes.
async function isBandLineageNeighbor(svc: ReturnType<typeof createServiceClient>, userId: string, otherId: string): Promise<boolean> {
  const { data: myRegs } = await svc.from('registrations').select('band_id').eq('user_id', userId).not('band_id', 'is', null)
  const myBandIds = [...new Set((myRegs || []).map((r: any) => r.band_id))]
  if (!myBandIds.length) return false
  const { data: chainRegs } = await svc
    .from('registrations')
    .select('band_id, user_id, registered_at')
    .in('band_id', myBandIds)
    .not('user_id', 'is', null)
    .order('registered_at', { ascending: true })
  const byBand: Record<string, string[]> = {}
  for (const r of chainRegs || []) {
    const chain = (byBand[(r as any).band_id] ??= [])
    if (chain[chain.length - 1] !== (r as any).user_id) chain.push((r as any).user_id)
  }
  for (const chain of Object.values(byBand)) {
    for (let i = 0; i < chain.length; i++) {
      if (chain[i] !== userId) continue
      if (chain[i - 1] === otherId || chain[i + 1] === otherId) return true
    }
  }
  return false
}

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
    // Allowed if: an accepted prayer partner; OR your downline / your upline
    // (the profile upline link — "you gave them a band" or they gave you one);
    // OR an immediate band-registration-chain neighbor (hand-off).
    let allowed = !!(conns && conns.length > 0)
    if (!allowed) {
      const { data: pair } = await svc
        .from('profiles')
        .select('id, upline_user_id')
        .in('id', [user.id, toUserId])
      const me = (pair || []).find((p: any) => p.id === user.id)
      const them = (pair || []).find((p: any) => p.id === toUserId)
      if (them?.upline_user_id === user.id || me?.upline_user_id === toUserId) allowed = true
    }
    if (!allowed) allowed = await isBandLineageNeighbor(svc, user.id, toUserId)
    if (!allowed) return NextResponse.json({ error: 'You can only send this to a prayer partner or someone you gave a band to.' }, { status: 403 })
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
