import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBandHolder, nameFromProfile } from '@/lib/network'

// GET /api/network/my-network
// Accepted connections (with their open shared requests), the viewer's own
// shared requests, pending incoming requests, and whether the viewer is a holder.
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createServiceClient()

    const { data: conns } = await supabase
      .from('prayer_network_connections')
      .select('id, requester_id, recipient_id, band_id, status, created_at, updated_at')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    const all = conns ?? []
    const accepted = all.filter((c: any) => c.status === 'accepted')
    const pendingIncoming = all.filter((c: any) => c.status === 'pending' && c.recipient_id === user.id)

    // Names for the "other" person in each row.
    const otherIds = new Set<string>()
    accepted.forEach((c: any) => otherIds.add(c.requester_id === user.id ? c.recipient_id : c.requester_id))
    pendingIncoming.forEach((c: any) => otherIds.add(c.requester_id))

    const profilesById: Record<string, any> = {}
    if (otherIds.size > 0) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(otherIds))
      ;(profs ?? []).forEach((p: any) => { profilesById[p.id] = p })
    }
    const nameOf = (id: string) => nameFromProfile(profilesById[id])

    // Open requests shared by accepted connections, plus the viewer's own requests.
    const connectionUserIds = accepted.map((c: any) => (c.requester_id === user.id ? c.recipient_id : c.requester_id))

    const { data: theirRequests } = connectionUserIds.length
      ? await admin
          .from('prayer_network_requests')
          .select('id, user_id, request_text, is_answered, created_at')
          .in('user_id', connectionUserIds)
          .eq('is_answered', false)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const { data: myRequests } = await admin
      .from('prayer_network_requests')
      .select('id, user_id, request_text, is_answered, answered_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Intercession counts + whether the viewer has prayed, for all relevant requests.
    const reqIds = [
      ...((theirRequests ?? []) as any[]).map(r => r.id),
      ...((myRequests ?? []) as any[]).map(r => r.id),
    ]
    const interByReq: Record<string, { count: number; mine: boolean }> = {}
    if (reqIds.length) {
      const { data: inters } = await admin
        .from('prayer_network_intercessions')
        .select('request_id, user_id')
        .in('request_id', reqIds)
      ;(inters ?? []).forEach((i: any) => {
        const entry = interByReq[i.request_id] ?? { count: 0, mine: false }
        entry.count += 1
        if (i.user_id === user.id) entry.mine = true
        interByReq[i.request_id] = entry
      })
    }
    const decorate = (r: any) => ({
      id: r.id,
      request_text: r.request_text,
      is_answered: r.is_answered,
      answered_at: r.answered_at ?? null,
      created_at: r.created_at,
      intercession_count: interByReq[r.id]?.count ?? 0,
      i_prayed: interByReq[r.id]?.mine ?? false,
    })

    const requestsByUser: Record<string, any[]> = {}
    ;((theirRequests ?? []) as any[]).forEach(r => {
      ;(requestsByUser[r.user_id] ??= []).push(decorate(r))
    })

    const connections = accepted.map((c: any) => {
      const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
      return {
        connection_id: c.id,
        user_id: otherId,
        name: nameOf(otherId),
        band_id: c.band_id,
        since: c.updated_at,
        requests: requestsByUser[otherId] ?? [],
      }
    })

    const pending_requests = pendingIncoming.map((c: any) => ({
      connection_id: c.id,
      requester_id: c.requester_id,
      name: nameOf(c.requester_id),
      band_id: c.band_id,
      created_at: c.created_at,
    }))

    const my_requests = ((myRequests ?? []) as any[]).map(decorate)

    return NextResponse.json({
      connections,
      pending_requests,
      my_requests,
      is_band_holder: await isBandHolder(admin, user.id),
    })
  } catch (err) {
    console.error('My network error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
