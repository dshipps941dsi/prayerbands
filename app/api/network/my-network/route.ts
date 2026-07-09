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

    // Lineage: the people a band actually passed between you and — i.e. whoever
    // held one of your bands immediately before you (gave it to you) or right
    // after you (you gave it to them), read off each band's holder chain. These
    // are "lineage" partners; everyone else you've connected with is "direct".
    const lineageIds = new Set<string>()
    const lineageBandByUser: Record<string, string> = {}
    const { data: myRegs } = await admin
      .from('registrations')
      .select('band_id')
      .eq('user_id', user.id)
      .not('band_id', 'is', null)
    const myBandIds = Array.from(new Set((myRegs ?? []).map((r: any) => r.band_id)))
    if (myBandIds.length) {
      const { data: chainRegs } = await admin
        .from('registrations')
        .select('band_id, user_id, registered_at')
        .in('band_id', myBandIds)
        .not('user_id', 'is', null)
        .order('registered_at', { ascending: true })
      const byBand: Record<string, string[]> = {}
      ;(chainRegs ?? []).forEach((r: any) => {
        const chain = (byBand[r.band_id] ??= [])
        // Collapse consecutive same-user rows (re-registrations) so neighbors are
        // genuinely different people.
        if (chain[chain.length - 1] !== r.user_id) chain.push(r.user_id)
      })
      for (const [bandId, chain] of Object.entries(byBand)) {
        for (let i = 0; i < chain.length; i++) {
          if (chain[i] !== user.id) continue
          for (const nb of [chain[i - 1], chain[i + 1]]) {
            if (nb && nb !== user.id) {
              lineageIds.add(nb)
              if (!lineageBandByUser[nb]) lineageBandByUser[nb] = bandId
            }
          }
        }
      }
    }

    // Names for the "other" person in each row, plus every lineage person.
    const otherIds = new Set<string>()
    accepted.forEach((c: any) => otherIds.add(c.requester_id === user.id ? c.recipient_id : c.requester_id))
    pendingIncoming.forEach((c: any) => otherIds.add(c.requester_id))
    lineageIds.forEach(id => otherIds.add(id))

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

    const connectedIds = new Set<string>()
    const connections = accepted.map((c: any) => {
      const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
      connectedIds.add(otherId)
      return {
        connection_id: c.id,
        user_id: otherId,
        name: nameOf(otherId),
        band_id: c.band_id,
        since: c.updated_at,
        relation: lineageIds.has(otherId) ? 'lineage' : 'direct',
        requests: requestsByUser[otherId] ?? [],
      }
    })

    // Lineage people you haven't formally connected with still belong on your
    // Partners list (the band tied you together). They carry no shared requests
    // here — sharing to lineage comes with request targeting later.
    const lineage_partners = Array.from(lineageIds)
      .filter(id => !connectedIds.has(id))
      .map(id => ({
        connection_id: null,
        user_id: id,
        name: nameOf(id),
        band_id: lineageBandByUser[id] ?? null,
        since: null,
        relation: 'lineage' as const,
        requests: [] as any[],
      }))

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
      lineage_partners,
      pending_requests,
      my_requests,
      is_band_holder: await isBandHolder(admin, user.id),
    })
  } catch (err) {
    console.error('My network error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
