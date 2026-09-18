import type { SupabaseClient } from '@supabase/supabase-js'
import { bandStanding, type Standing, type StandingBand, type StandingStop } from './band-standing'
import { likeLiteral } from './like'

// Gathers the facts bandStanding() needs for one band and one viewer, from
// the database, and returns the standing. Routes call this so the rule and
// the data behind it are the same everywhere.
export async function loadStanding(
  admin: SupabaseClient,
  band: StandingBand,
  viewerId: string | null,
  opts: { onThisDevice?: boolean } = {},
): Promise<Standing> {
  const [{ data: stops }, viewer] = await Promise.all([
    admin.from('registrations').select('user_id, registered_by, user_name, registered_at, source').eq('band_id', band.band_id),
    viewerId
      ? admin.from('profiles').select('full_name, email').eq('id', viewerId).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string | null; email: string | null } | null }),
  ])
  // Bands assigned before buyers were credited as upline: the order itself
  // names the buyer, so an unowned band on an order they placed is theirs.
  let orderedByViewer = false
  const email = viewer?.data?.email
  if (viewerId && !band.owner_id && email) {
    const { data: o } = await admin.from('orders').select('id')
      .ilike('customer_email', likeLiteral(email)).contains('assigned_band_ids', [band.band_id]).limit(1).maybeSingle()
    orderedByViewer = !!o
  }
  return bandStanding({
    band,
    stops: (stops ?? []) as StandingStop[],
    viewerId,
    viewerName: viewer?.data?.full_name ?? null,
    orderedByViewer,
    onThisDevice: !!opts.onThisDevice,
  })
}
