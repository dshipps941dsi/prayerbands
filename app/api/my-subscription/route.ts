import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

export async function GET(req: NextRequest) {
  // Identify the requester from their session cookie.
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await authed.auth.getUser()
  if (!user) {
    return NextResponse.json({ subscription: null }, { status: 401 })
  }

  // Admins may inspect another user's subscription via ?viewAs=<id>.
  const viewAs = req.nextUrl.searchParams.get('viewAs')
  const effectiveId = viewAs && user.email === ADMIN_EMAIL ? viewAs : user.id

  // Service key read: bypasses the owner-only RLS so admin view-as works, and
  // is safe because effectiveId is constrained to self (or admin-chosen).
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', effectiveId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ subscription: subscription || null })
}
