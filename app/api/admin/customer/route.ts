import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

// GET /api/admin/customer?id=<userId>
// One consolidated "CRM" view for a customer: profile, bands they own, all their
// orders (matched by email) with status + assigned bands + address, and any
// subscription. Service role: reads across users/tables.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at, org_id')
    .eq('id', id)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [bandsRes, ordersRes, subRes] = await Promise.all([
    admin.from('bands')
      .select('band_id, theme, color, size, status, created_at')
      .eq('owner_id', id)
      .order('created_at', { ascending: false }),
    profile.email
      ? admin.from('orders')
          .select('id, created_at, status, amount_total, payment_status, assigned_band_ids, shipping_address, tracking_number, order_metadata')
          .ilike('customer_email', profile.email)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    admin.from('subscriptions')
      .select('id, status, band_color, band_design, current_period_end, next_ship_date, plan_id, cancel_at_period_end')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return NextResponse.json({
    profile,
    bands: bandsRes.data ?? [],
    orders: ordersRes.data ?? [],
    subscription: subRes.data ?? null,
  })
}
