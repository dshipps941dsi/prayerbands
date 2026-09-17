import type { SupabaseClient } from '@supabase/supabase-js'

// Who someone is in a circle. The creator is the leader; the leader can name
// co-leaders. Leaders and co-leaders run the wall — they post the topics,
// mark them answered, and tidy up. Members write prayers under topics and
// tap Pray. Only the leader can add or remove co-leaders, change the join
// code, or close the circle.
export type CircleStanding = {
  isMember: boolean
  isLeader: boolean      // the creator
  isCoLeader: boolean
  canLead: boolean       // leader or co-leader
  createdBy: string | null
}

export async function circleStanding(admin: SupabaseClient, circleId: string, userId: string): Promise<CircleStanding> {
  const [{ data: circle }, { data: m }] = await Promise.all([
    admin.from('prayer_circles').select('created_by').eq('id', circleId).maybeSingle(),
    admin.from('circle_members').select('role').eq('circle_id', circleId).eq('user_id', userId).maybeSingle(),
  ])
  const createdBy = circle?.created_by ?? null
  const isLeader = !!createdBy && createdBy === userId
  const isCoLeader = !isLeader && m?.role === 'co_leader'
  return { isMember: !!m, isLeader, isCoLeader, canLead: isLeader || isCoLeader, createdBy }
}
