import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Service-key client. Created inside the request (never at module scope) so the
// Vercel build doesn't try to read env vars that only exist at runtime.
export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}

export type SessionOrg = {
  // The signed-in auth user id, or null if there is no valid session.
  userId: string | null
  // The org this user belongs to (via profiles.org_id), or null if none.
  orgId: string | null
}

// Resolve the signed-in user and the org they belong to. Every member of an org
// (not just the original admin) counts — orgs can have multiple users, and they
// all share the same dashboard permissions.
export async function getSessionOrg(): Promise<SessionOrg> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await authed.auth.getUser()
  if (!user) return { userId: null, orgId: null }

  const admin = serviceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  return { userId: user.id, orgId: profile?.org_id ?? null }
}
