// Shared helpers for the Prayer Network routes. These take a service-role
// Supabase client (created via createServiceClient) because they read across
// users / tables that the cookie client's RLS would otherwise restrict.

// Resolve the account that "holds" a band: the most recent registration's
// user_id, falling back to the band's owner. Returns null if no account holds it
// (e.g. an anonymous registration on a band that was never linked to a buyer).
export async function resolveBandRecipient(admin: any, bandId: string): Promise<string | null> {
  // Who holds this band *right now* — the person a connection should link to.
  // It's the most recent registration, full stop. We deliberately do NOT skip
  // past a guest registration to an earlier account-holder: once a band moves
  // on, it must never resolve back to whoever used to hold it. So if the current
  // holder registered without an account, there is no UID to connect to and we
  // return null ("no account yet") rather than the previous owner.
  const { data: regs } = await admin
    .from('registrations')
    .select('user_id, registered_at')
    .eq('band_id', bandId)
    .order('registered_at', { ascending: false })
    .limit(1)
  if (regs && regs.length) return (regs[0].user_id as string) ?? null

  // No registrations at all — the band is still with its buyer.
  const { data: band } = await admin
    .from('bands')
    .select('owner_id')
    .eq('band_id', bandId)
    .single()
  return (band?.owner_id as string) ?? null
}

// A "band holder" owns at least one band or has registered one.
export async function isBandHolder(admin: any, userId: string): Promise<boolean> {
  const { data: owned } = await admin.from('bands').select('id').eq('owner_id', userId).limit(1)
  if (owned && owned.length) return true
  const { data: reg } = await admin.from('registrations').select('id').eq('user_id', userId).limit(1)
  return !!(reg && reg.length)
}

// Build a friendly display name from a profiles row.
export function nameFromProfile(profile: { full_name?: string | null; email?: string | null } | null | undefined): string {
  return profile?.full_name || profile?.email?.split('@')[0] || 'A fellow believer'
}

// Can this viewer see a shared prayer request (so they may reply to it)? Mirrors
// the my-network feed's audience rules. Under-permits rather than over-permits:
// lineage-only partners without a formal connection are treated as unable to
// reply, which is the safe direction.
export async function requestReachesUser(
  admin: any,
  viewerId: string,
  requesterId: string,
  audience: string | null,
): Promise<boolean> {
  if (viewerId === requesterId) return true
  const a = audience || 'network'
  if (a === 'private') return false
  if (a === 'wall' || a === 'public') return true
  if (a.startsWith('group:')) {
    const gid = a.slice(6)
    const { data: mem } = await admin.from('partner_group_members')
      .select('group_id').eq('group_id', gid).eq('member_id', viewerId).maybeSingle()
    if (!mem) return false
    const { data: g } = await admin.from('partner_groups').select('owner_id').eq('id', gid).maybeSingle()
    return (g as { owner_id?: string } | null)?.owner_id === requesterId
  }
  // direct / lineage / network — an accepted connection between the two.
  const { data: conn } = await admin.from('prayer_network_connections')
    .select('id').eq('status', 'accepted')
    .or(`and(requester_id.eq.${viewerId},recipient_id.eq.${requesterId}),and(requester_id.eq.${requesterId},recipient_id.eq.${viewerId})`)
    .maybeSingle()
  return !!conn
}
