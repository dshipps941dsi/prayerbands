import { createServerClient } from '@supabase/ssr'
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
