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

// List active subscription shipments, enriched with the subscriber's email/name
// (their profile row is hidden from a normal client by owner-only RLS).
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = svc()

  const { data: shipments } = await admin
    .from('subscription_shipments')
    .select('*')
    .in('status', ['pending', 'processing', 'shipped'])
    .order('created_at', { ascending: false })
    .limit(200)

  const list = shipments || []
  const userIds = [...new Set(list.map((s: any) => s.user_id))]
  const profiles: Record<string, any> = {}
  if (userIds.length) {
    const { data: profs } = await admin.from('profiles').select('id, email, full_name').in('id', userIds)
    for (const p of profs || []) profiles[p.id] = p
  }

  const enriched = list.map((s: any) => ({
    ...s,
    customer_email: profiles[s.user_id]?.email || null,
    customer_name: profiles[s.user_id]?.full_name || s.shipping_name || null,
  }))

  return NextResponse.json({ shipments: enriched })
}

// Fulfillment actions: assign bands (applying the per-cycle dedication), mark
// shipped, or edit the dedication on the subscriber's behalf.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, shipmentId, tracking, dedication_recipient, dedication_note } = body
  if (!shipmentId) return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 })

  const admin = svc()
  const { data: ship } = await admin.from('subscription_shipments').select('*').eq('id', shipmentId).single()
  if (!ship) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  if (action === 'assign') {
    const qty = ship.bands_quantity || 1
    const { data: bands } = await admin.from('bands').select('band_id').eq('status', 'available').limit(qty)
    if (!bands || bands.length < qty) {
      return NextResponse.json({ error: 'Not enough available bands in inventory.' }, { status: 400 })
    }
    const bandIds = bands.map((b: any) => b.band_id)

    await admin.from('bands').update({ status: 'assigned' }).in('band_id', bandIds)

    // Stamp the subscriber's per-cycle dedication onto the assigned bands so the
    // recipient sees the "sent especially for you" screen on first tap.
    if (ship.dedication_note || ship.dedication_recipient) {
      await admin.from('bands').update({
        dedication_recipient: ship.dedication_recipient || null,
        dedication_note: ship.dedication_note || null,
        dedication_viewed: false,
      }).in('band_id', bandIds)
    }

    const { data: updated } = await admin
      .from('subscription_shipments')
      .update({ band_ids: bandIds, status: 'processing' })
      .eq('id', shipmentId)
      .select('*')
      .single()
    return NextResponse.json({ shipment: updated, bandIds })
  }

  if (action === 'ship') {
    const { data: updated } = await admin
      .from('subscription_shipments')
      .update({ status: 'shipped', tracking_number: (tracking || '').trim() || null, shipped_at: new Date().toISOString() })
      .eq('id', shipmentId)
      .select('*')
      .single()
    return NextResponse.json({ shipment: updated })
  }

  if (action === 'note') {
    const { data: updated } = await admin
      .from('subscription_shipments')
      .update({
        dedication_recipient: (dedication_recipient || '').trim() || null,
        dedication_note: (dedication_note || '').trim() || null,
      })
      .eq('id', shipmentId)
      .select('*')
      .single()
    return NextResponse.json({ shipment: updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
