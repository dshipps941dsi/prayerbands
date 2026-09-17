import type { SupabaseClient } from '@supabase/supabase-js'

// Has this person ever held a Prayer Band? Owning one (a purchase, or a band
// credited to them) or having registered one — even a band since passed on —
// both count. This is what unlocks the parts of a circle that take a band:
// creating one, posting a topic, writing a prayer. Following a circle and
// tapping Pray only take an account.
export async function hasHeldBand(admin: SupabaseClient, userId: string): Promise<boolean> {
  const [{ data: owned }, { data: registered }] = await Promise.all([
    admin.from('bands').select('id').eq('owner_id', userId).limit(1),
    admin.from('registrations').select('id').eq('user_id', userId).limit(1),
  ])
  return !!(owned?.length || registered?.length)
}
