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

    // Everyone whose requests could reach the viewer: accepted connections and
    // lineage people (band handoff). Track each author's relation + whether
    // they're a formal connection, so we can honor the audience they targeted.
    // Lineage is mutual, so the viewer's relation to an author equals theirs.
    const connectionUserIds = accepted.map((c: any) => (c.requester_id === user.id ? c.recipient_id : c.requester_id))
    const connectedIds = new Set<string>(connectionUserIds)

    type AuthorInfo = { connected: boolean; relation: 'direct' | 'lineage' }
    const authorInfo: Record<string, AuthorInfo> = {}
    connectionUserIds.forEach((id: string) => { authorInfo[id] = { connected: true, relation: lineageIds.has(id) ? 'lineage' : 'direct' } })
    lineageIds.forEach(id => { if (!authorInfo[id]) authorInfo[id] = { connected: false, relation: 'lineage' } })
    const authorIds = Object.keys(authorInfo)

    const { data: theirRequests } = authorIds.length
      ? await admin
          .from('prayer_network_requests')
          .select('id, user_id, request_text, is_answered, created_at, visibility, audience')
          .in('user_id', authorIds)
          .eq('is_answered', false)
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    const { data: myRequests } = await admin
      .from('prayer_network_requests')
      .select('id, user_id, request_text, is_answered, answered_at, created_at, visibility, audience')
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

    // Group-targeted requests ('group:<gid>') reach the viewer only if the
    // viewer is a member of that group AND the group belongs to the author.
    // Membership already implies an accepted connection (see the assign API),
    // so the author is a known connection here.
    const groupIds = Array.from(new Set(
      ((theirRequests ?? []) as any[])
        .map(r => (typeof r.audience === 'string' && r.audience.startsWith('group:')) ? r.audience.slice(6) : null)
        .filter(Boolean) as string[]
    ))
    const viewerGroups = new Set<string>()
    const groupOwner: Record<string, string> = {}
    if (groupIds.length) {
      const [{ data: mem }, { data: grps }] = await Promise.all([
        admin.from('partner_group_members').select('group_id').eq('member_id', user.id).in('group_id', groupIds),
        admin.from('partner_groups').select('id, owner_id').in('id', groupIds),
      ])
      ;(mem ?? []).forEach((m: any) => viewerGroups.add(m.group_id))
      ;(grps ?? []).forEach((g: any) => { groupOwner[g.id] = g.owner_id })
    }

    // Does a request with this audience, from this author, reach the viewer?
    // Legacy rows (null audience) behave like 'network'.
    const reaches = (audience: string | null, info: AuthorInfo, authorId: string) => {
      const a = audience || 'network'
      if (a === 'private') return false                     // a journal entry kept to yourself — reaches no one
      if (a === 'wall' || a === 'public') return false      // lives on the prayer wall, not here
      if (a.startsWith('group:')) {
        const gid = a.slice(6)
        return viewerGroups.has(gid) && groupOwner[gid] === authorId
      }
      if (a === 'direct') return info.connected && info.relation === 'direct'
      if (a === 'lineage') return info.relation === 'lineage'
      return info.connected                                  // 'network' → must be a connection
    }

    // Others' Requests feed: requests the viewer is allowed to see, each tagged
    // with the author's relation for the Direct/Lineage badge.
    const others_requests = ((theirRequests ?? []) as any[])
      .filter(r => { const info = authorInfo[r.user_id]; return info && reaches(r.audience, info, r.user_id) })
      .map(r => ({ ...decorate(r), author: nameOf(r.user_id), relation: authorInfo[r.user_id].relation }))

    // Partners (people only; requests live in the Others' Requests feed).
    const connections = accepted.map((c: any) => {
      const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
      return {
        connection_id: c.id,
        user_id: otherId,
        name: nameOf(otherId),
        band_id: c.band_id,
        since: c.updated_at,
        relation: lineageIds.has(otherId) ? 'lineage' : 'direct',
      }
    })

    // Lineage people you haven't formally connected with still belong on your
    // Partners list (the band tied you together).
    const lineage_partners = Array.from(lineageIds)
      .filter(id => !connectedIds.has(id))
      .map(id => ({
        connection_id: null,
        user_id: id,
        name: nameOf(id),
        band_id: lineageBandByUser[id] ?? null,
        since: null,
        relation: 'lineage' as const,
      }))

    const pending_requests = pendingIncoming.map((c: any) => ({
      connection_id: c.id,
      requester_id: c.requester_id,
      name: nameOf(c.requester_id),
      band_id: c.band_id,
      created_at: c.created_at,
    }))

    const my_requests = ((myRequests ?? []) as any[]).map(r => ({ ...decorate(r), audience: r.audience ?? 'network' }))

    return NextResponse.json({
      connections,
      lineage_partners,
      others_requests,
      pending_requests,
      my_requests,
      is_band_holder: await isBandHolder(admin, user.id),
    })
  } catch (err) {
    console.error('My network error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
