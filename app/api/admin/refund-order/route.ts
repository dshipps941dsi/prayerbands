import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/admin/refund-order { orderId, amountCents?, reason? }
// Refund an order in whole or in part via Stripe. Omit amountCents for a full
// refund of whatever is still refundable. Admin-only (money movement). Records
// each refund on the order so the remaining refundable amount is always known,
// and can't refund more than was paid.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamAdmin(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = body.orderId
  const reason: string | undefined = body.reason
  const amountCents: number | null = (body.amountCents === undefined || body.amountCents === null || body.amountCents === '')
    ? null
    : Math.round(Number(body.amountCents))
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  if (amountCents !== null && (!Number.isFinite(amountCents) || amountCents <= 0)) {
    return NextResponse.json({ error: 'Refund amount must be a positive number.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, stripe_session_id, amount_total, order_metadata, status')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!order.stripe_session_id) {
    return NextResponse.json({ error: 'This order has no Stripe payment to refund.' }, { status: 409 })
  }

  const paidCents = order.amount_total || 0
  const priorRefunds: { amount: number }[] = Array.isArray(order.order_metadata?.refunds) ? order.order_metadata.refunds : []
  const alreadyRefunded = priorRefunds.reduce((s, r) => s + (r.amount || 0), 0)
  const refundable = Math.max(0, paidCents - alreadyRefunded)
  if (refundable <= 0) return NextResponse.json({ error: 'This order is already fully refunded.' }, { status: 409 })

  const toRefund = amountCents === null ? refundable : amountCents
  if (toRefund > refundable) {
    return NextResponse.json({ error: `Only $${(refundable / 100).toFixed(2)} is left to refund on this order.` }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Find the payment behind the checkout session.
  let paymentIntentId: string | null = null
  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
    paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not load the Stripe payment: ' + (e?.message || 'unknown error') }, { status: 502 })
  }
  if (!paymentIntentId) return NextResponse.json({ error: 'No completed payment found for this order.' }, { status: 409 })

  let refund
  try {
    refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: toRefund,
      reason: 'requested_by_customer',
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Stripe refused the refund: ' + (e?.message || 'unknown error') }, { status: 502 })
  }

  const nextRefunds = [...priorRefunds, { id: refund.id, amount: toRefund, note: reason || null, at: new Date().toISOString() }]
  const totalRefunded = alreadyRefunded + toRefund
  const fullyRefunded = totalRefunded >= paidCents

  await admin.from('orders').update({
    order_metadata: { ...(order.order_metadata || {}), refunds: nextRefunds },
    ...(fullyRefunded ? { status: 'cancelled' } : {}),
  }).eq('id', orderId)

  return NextResponse.json({
    refunded_cents: toRefund,
    total_refunded_cents: totalRefunded,
    remaining_cents: Math.max(0, paidCents - totalRefunded),
    fully_refunded: fullyRefunded,
  })
}
