import { NextRequest, NextResponse } from 'next/server'
import { isTeamMember } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendShippingConfirmation } from '@/lib/shipping-email'

// POST /api/admin/ship-order { orderId, trackingNumber }
// Mark a packed order shipped (with tracking) and send the shipping email.
// Available to the Fulfillment role (isTeamMember), so packers can complete the
// whole job in the Packing Station instead of needing the admin Orders screen.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamMember(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = body.orderId
  const trackingNumber = String(body.trackingNumber || '').trim()
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  if (!trackingNumber) return NextResponse.json({ error: 'A tracking number is required.' }, { status: 400 })

  const admin = createServiceClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, customer_name, assigned_band_ids, status')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'shipped') return NextResponse.json({ error: 'This order is already marked shipped.' }, { status: 409 })
  if (!Array.isArray(order.assigned_band_ids) || order.assigned_band_ids.length === 0) {
    return NextResponse.json({ error: 'Pack the bands into this order before shipping it.' }, { status: 409 })
  }

  const { error } = await admin
    .from('orders')
    .update({ status: 'shipped', tracking_number: trackingNumber })
    .eq('id', orderId)
  if (error) return NextResponse.json({ error: 'Could not mark shipped: ' + error.message }, { status: 500 })

  // Best-effort confirmation email — the order is already shipped, so never fail
  // the whole action if the email hiccups.
  const mail = await sendShippingConfirmation({
    orderId: order.id,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
    bandIds: order.assigned_band_ids,
    trackingNumber,
  })

  return NextResponse.json({ shipped: true, email_sent: mail.ok, email_error: mail.ok ? undefined : mail.error })
}
