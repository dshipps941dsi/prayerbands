import type { SupabaseClient } from '@supabase/supabase-js'

// Supabase admin has no direct getUserByEmail, so page through listUsers.
// Bounded to keep it cheap. Returns the matching auth user or null.
export async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(u => (u.email || '').toLowerCase() === target)
    if (match) return match
    if (data.users.length < 200) break
  }
  return null
}
