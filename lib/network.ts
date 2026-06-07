// Shared helpers for the Prayer Network routes. These take a service-role
// Supabase client (created via createServiceClient) because they read across
// users / tables that the cookie client's RLS would otherwise restrict.

// Resolve the account that "holds" a band: the most recent registration's
// user_id, falling back to the band's owner. Returns null if no account holds it
// (e.g. an anonymous registration on a band that was never linked to a buyer).
export async function resolveBandRecipient(admin: any, bandId: string): Promise<string | null> {
  const { data: regs } = await admin
    .from('registrations')
    .select('user_id, registered_at')
    .eq('band_id', bandId)
    .not('user_id', 'is', null)
    .order('registered_at', { ascending: false })
    .limit(1)
  if (regs && regs.length) return regs[0].user_id as string

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
