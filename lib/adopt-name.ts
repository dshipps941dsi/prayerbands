import type { SupabaseClient } from '@supabase/supabase-js'

// People type their name on a band's first screen, then create an account —
// and the account came out nameless. profiles.full_name is only ever filled
// from the sign-up provider's metadata, which Google supplies and the emailed
// code does not. Six of the accounts on record have no name because of it, so
// they appear blank in a prayer chain despite having typed a name minutes
// earlier.
//
// The name they gave the band is the name they meant, so use it — but only to
// fill a blank. Someone who has set their name in settings must never have it
// overwritten by an old registration.
export async function adoptNameFromRegistration(
  admin: SupabaseClient,
  userId: string,
  name?: string | null
): Promise<boolean> {
  const clean = (name || '').trim().slice(0, 80)
  if (!clean) return false

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
    if (!profile || (profile as { full_name: string | null }).full_name) return false

    const { error } = await admin
      .from('profiles')
      .update({ full_name: clean })
      .eq('id', userId)
      .is('full_name', null)
    if (error) {
      console.error('[adopt-name] update error:', error)
      return false
    }
    return true
  } catch (err) {
    // Naming is never worth failing a claim or a registration over.
    console.error('[adopt-name] unexpected error:', err)
    return false
  }
}
