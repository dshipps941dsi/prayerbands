import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nameFromProfile } from '@/lib/network'

// GET /api/network/my-network
// Returns the viewer's accepted connections and any pending incoming requests.
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: conns } = await supabase
      .from('prayer_network_connections')
      .select('id, requester_id, recipient_id, band_id, status, created_at, updated_at')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    const all = conns ?? []
    const accepted = all.filter((c: any) => c.status === 'accepted')
    const pendingIncoming = all.filter((c: any) => c.status === 'pending' && c.recipient_id === user.id)

    // Resolve display names for the "other" person in each row.
    const otherIds = new Set<string>()
    accepted.forEach((c: any) => otherIds.add(c.requester_id === user.id ? c.recipient_id : c.requester_id))
    pendingIncoming.forEach((c: any) => otherIds.add(c.requester_id))

    const profilesById: Record<string, any> = {}
    if (otherIds.size > 0) {
      const admin = createServiceClient()
      const { data: profs } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(otherIds))
      ;(profs ?? []).forEach((p: any) => { profilesById[p.id] = p })
    }
    const nameOf = (id: string) => nameFromProfile(profilesById[id])

    const connections = accepted.map((c: any) => {
      const otherId = c.requester_id === user.id ? c.recipient_id : c.requester_id
      return {
        connection_id: c.id,
        user_id: otherId,
        name: nameOf(otherId),
        band_id: c.band_id,
        since: c.updated_at,
      }
    })

    const pending = pendingIncoming.map((c: any) => ({
      connection_id: c.id,
      requester_id: c.requester_id,
      name: nameOf(c.requester_id),
      band_id: c.band_id,
      created_at: c.created_at,
    }))

    return NextResponse.json({ connections, pending })
  } catch (err) {
    console.error('My network error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
