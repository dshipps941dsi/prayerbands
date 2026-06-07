import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client for API route handlers / server components.
//
// Cookie-based: it reads the signed-in user's session from cookies, so
// `supabase.auth.getUser()` works and Row Level Security policies apply.
//
// Must be awaited — `cookies()` is async in Next 16:
//   const supabase = await createClient()
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a context where cookies are read-only — safe to ignore.
          }
        },
      },
    }
  )
}

// Service-role client — BYPASSES Row Level Security. Use only for trusted,
// server-side reads/writes that legitimately cross RLS boundaries (e.g. counting
// members of a circle the viewer hasn't joined, checking band ownership), and
// always after you've authenticated the user with createClient(). Never expose
// its results without your own authorization checks. Call inside the handler.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}
