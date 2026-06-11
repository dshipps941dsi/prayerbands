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

  // Also return the effective user's profile so admin view-as can show the
  // viewed user's name/email (their profile row is hidden by owner-only RLS).
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', effectiveId)
    .maybeSingle()

  return NextResponse.json({ subscription: subscription || null, profile: profile || null })
}

// Update the signed-in user's shipment preferences (band color + size). Applies
// to their next shipment.
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, string> = {}
  if (typeof body.band_color === 'string' && body.band_color.trim()) {
    updates.band_color = body.band_color.trim()
  }
  if (typeof body.band_size === 'string' && ['S', 'M', 'L'].includes(body.band_size.toUpperCase())) {
    updates.band_size = body.band_size.toUpperCase()
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // The user's active (non-cancelled) subscription.
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'No active subscription.' }, { status: 404 })

  const { data: updated, error } = await admin
    .from('subscriptions')
    .update(updates)
    .eq('id', sub.id)
    .select('*, subscription_plans(*)')
    .single()
  if (error) {
    console.error('[my-subscription PATCH] update error:', error)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }

  return NextResponse.json({ subscription: updated })
}
