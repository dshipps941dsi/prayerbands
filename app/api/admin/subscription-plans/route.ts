import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const { data } = await svc()
    .from('subscription_plans')
    .select('id, name, total_price, interval_months, bands_per_cycle, discount_percent, is_active')
    .order('total_price', { ascending: true })
  return NextResponse.json({ plans: data || [] })
}

// Update a plan's price (and optional discount % shown on the page). total_price
// is what Stripe charges new subscribers immediately.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { id, total_price, discount_percent } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })

  const updates: Record<string, number> = {}
  if (total_price !== undefined) {
    const t = Number(total_price)
    if (!Number.isFinite(t) || t < 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    updates.total_price = t
  }
  if (discount_percent !== undefined) {
    const d = Number(discount_percent)
    if (!Number.isFinite(d) || d < 0 || d > 100) return NextResponse.json({ error: 'Invalid discount' }, { status: 400 })
    updates.discount_percent = Math.round(d)
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await svc()
    .from('subscription_plans')
    .update(updates)
    .eq('id', id)
    .select('id, name, total_price, interval_months, bands_per_cycle, discount_percent, is_active')
    .single()
  if (error) {
    console.error('[admin/subscription-plans]', error)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ plan: data })
}
