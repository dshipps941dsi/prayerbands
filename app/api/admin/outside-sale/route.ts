import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { findAuthUserByEmail } from '@/lib/find-auth-user'

// A sale that happened away from the website: cash at church, Venmo, a check.
// Records it as an order so Sales counts it, takes the bands out of stock, and
// credits the buyer as the giver, the same as a web order. No Stripe, so no
// refund from the admin; money moved outside and comes back outside.
//
// POST /api/admin/outside-sale
// { customerName, customerEmail?, amountCents, method, bandIds[], note? }

const METHODS = new Set(['cash', 'venmo', 'zelle', 'check', 'card', 'other'])
const normalizeBandId = (raw: unknown) => typeof raw === 'string' ? raw.trim().toUpperCase() : ''

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamAdmin(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const customerName = String(body.customerName || '').trim().slice(0, 120)
  const customerEmail = String(body.customerEmail || '').trim().toLowerCase().slice(0, 200) || null
  const amountCents = Math.round(Number(body.amountCents))
  const method = String(body.method || '').toLowerCase()
  const note = String(body.note || '').trim().slice(0, 300) || null
  const bandIds = [...new Set((Array.isArray(body.bandIds) ? body.bandIds : []).map(normalizeBandId).filter(Boolean))] as string[]

  if (!customerName) return NextResponse.json({ error: 'Who bought them? A name is needed.' }, { status: 400 })
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) return NextResponse.json({ error: `"${customerEmail}" does not look like an email address.` }, { status: 400 })
  if (!Number.isFinite(amountCents) || amountCents < 0) return NextResponse.json({ error: 'Enter what was paid, in dollars. Zero is fine for a freebie you still want counted.' }, { status: 400 })
  if (!METHODS.has(method)) return NextResponse.json({ error: 'Pick how they paid.' }, { status: 400 })
  if (!bandIds.length) return NextResponse.json({ error: 'Enter at least one band ID.' }, { status: 400 })

  const admin = createServiceClient()

  // Bands still on the shelf, or scanned out earlier (a hand-out that was
  // really this sale). Anything owned, sold, or in another order is refused.
  const { data: rows } = await admin
    .from('bands')
    .select('band_id, status, owner_id, org_id')
    .in('band_id', bandIds)
  const byId = new Map((rows ?? []).map((b: any) => [b.band_id as string, b]))
  const refused: string[] = []
  for (const id of bandIds) {
    const b = byId.get(id)
    if (!b || b.owner_id || b.org_id || !['unregistered', 'handed_out'].includes(b.status)) refused.push(id)
  }
  if (refused.length) {
    return NextResponse.json({ error: 'Not available: ' + refused.join(', ') + '. A band already owned, sold, or in another order cannot be recorded as this sale.' }, { status: 409 })
  }

  // The buyer is the giver: credit by email now, by account if they have one.
  let buyerId: string | null = null
  if (customerEmail) {
    const authUser = await findAuthUserByEmail(admin, customerEmail)
    buyerId = authUser?.id ?? null
  }

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      stripe_session_id: null,
      customer_name: customerName,
      customer_email: customerEmail,
      amount_total: amountCents,
      payment_status: 'paid',
      status: 'shipped', // handed over in person; nothing to ship
      assigned_band_ids: bandIds,
      order_metadata: { source: 'outside', method, note, quantity: bandIds.length, recorded_by: user!.id, recorded_at: new Date().toISOString() },
    })
    .select('id')
    .single()
  if (orderErr || !order) return NextResponse.json({ error: 'Could not save the sale: ' + (orderErr?.message || 'unknown error') }, { status: 500 })

  const { error: bandErr } = await admin
    .from('bands')
    .update({ status: 'assigned', owner_id: null, upline_user_id: buyerId, upline_email: customerEmail })
    .in('band_id', bandIds)
  if (bandErr) return NextResponse.json({ error: `The sale saved as order #${order.id} but the bands could not be updated: ${bandErr.message}` }, { status: 500 })

  // A band that was scanned out before this sale was recorded: its hand-out
  // record now says what it really was.
  await admin.from('band_handouts')
    .update({ reason: 'sale', note: note || `Order #${order.id}`, upline_email: customerEmail, upline_user_id: buyerId })
    .in('band_id', bandIds).eq('direction', 'out')

  return NextResponse.json({ orderId: order.id, count: bandIds.length, linked: !!buyerId, credited: !!customerEmail })
}
