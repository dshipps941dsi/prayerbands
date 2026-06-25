import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// The transactional email routes (send-shipped, send-band-passed-on, etc.) are
// only ever triggered by the admin (browser, cookie session) or server-to-server
// from another route (shared secret header) — never by anonymous public callers.
// Fail closed: with no secret configured and no admin session, access is denied.
export async function isInternalOrAdmin(req: NextRequest): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET_KEY
  if (secret && req.headers.get('x-internal-secret') === secret) return true

  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email === ADMIN_EMAIL
}
