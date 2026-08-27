import { NextRequest, NextResponse } from 'next/server'
import { isTeamMember } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { variantForSlug, parseOrderItems, matchesDesign, type Variant } from '@/lib/fulfillment'

// POST /api/admin/assign-order-band { orderId, bandId }
// Assign ONE specific band (scanned/typed by the fulfiller) to an order, after
// validating it's real, in sellable stock, not already assigned, and matches a
// line of the order that still needs bands. This is the hand-picked counterpart
// to assign-order-bands (which auto-picks): here the human controls exactly
// which physical band goes in the envelope.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamMember(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = body.orderId
  const bandId = String(body.bandId || '').trim().toUpperCase()
  if (!orderId || !bandId) return NextResponse.json({ error: 'orderId and bandId are required' }, { status: 400 })

  const admin = createServiceClient()

  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, order_metadata, assigned_band_ids')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const already: string[] = Array.isArray(order.assigned_band_ids) ? order.assigned_band_ids : []
  if (already.includes(bandId)) {
    return NextResponse.json({ error: `${bandId} is already assigned to this order.` }, { status: 409 })
  }

  // The band must exist and be genuinely available — the sellable shelf is the
  // single source of truth for "not registered, not claimed, not church stock."
  const { data: band } = await admin
    .from('bands')
    .select('band_id, theme, color, size, status')
    .eq('band_id', bandId)
    .maybeSingle()
  if (!band) return NextResponse.json({ error: `No band with ID ${bandId}.` }, { status: 404 })

  const { data: sellable } = await admin
    .from('sellable_bands')
    .select('band_id')
    .eq('band_id', bandId)
    .maybeSingle()
  if (!sellable) {
    return NextResponse.json({ error: `${bandId} isn't available — it may already be registered, claimed, or assigned to another order.` }, { status: 409 })
  }

  // Order lines, and how many of each are still unfilled given what's already
  // assigned. Match the already-assigned bands back to lines so re-scanning
  // can't over-fill one line while another goes short.
  let items = parseOrderItems(order.order_metadata)
  if (items.length === 0) {
    const qty = Math.max(1, parseInt(order.order_metadata?.quantity || '1', 10) || 1)
    items = [{ id: 'assorted', qty }]
  }

  // Designs of the bands already on this order, to subtract from each line's need.
  let assignedBands: { theme: string | null; color: string | null; size: string | null }[] = []
  if (already.length) {
    const { data: ab } = await admin.from('bands').select('theme, color, size').in('band_id', already)
    assignedBands = (ab ?? []) as any[]
  }

  const bandMatchesLine = (b: { theme: string | null; color: string | null; size: string | null }, it: typeof items[number], v: Variant) =>
    matchesDesign(b, v) && (!it.size || !b.size || b.size === it.size)

  // Find a line this scanned band fits that still has room.
  let targetLine: typeof items[number] | null = null
  for (const it of items) {
    const v = variantForSlug(it.id)
    if (!bandMatchesLine(band, it, v)) continue
    const filled = assignedBands.filter(b => bandMatchesLine(b, it, v)).length
    if (filled < it.qty) { targetLine = it; break }
  }

  if (!targetLine) {
    const label = [band.color || band.theme || 'band', band.size].filter(Boolean).join(' ')
    return NextResponse.json({ error: `${bandId} (${label}) doesn't match any item still needed on this order.` }, { status: 409 })
  }

  // Assign it: allocate the band, link the buyer as owner+upline (so bands they
  // later hand out credit to them), and record it on the order.
  await admin.from('bands').update({ status: 'assigned' }).eq('band_id', bandId)
  if (order.customer_email) {
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', order.customer_email).maybeSingle()
    if (prof?.id) {
      await admin.from('bands')
        .update({ owner_id: prof.id, upline_user_id: prof.id, upline_email: order.customer_email })
        .eq('band_id', bandId)
    }
  }

  const nextAssigned = [...already, bandId]

  // Per-line remaining after this assignment, for the UI progress.
  const withNew = [...assignedBands, { theme: band.theme, color: band.color, size: band.size }]
  const remaining = items.map(it => {
    const v = variantForSlug(it.id)
    const filled = withNew.filter(b => bandMatchesLine(b, it, v)).length
    return { design: v.name, size: it.size, ordered: it.qty, assigned: Math.min(filled, it.qty), remaining: Math.max(0, it.qty - filled) }
  })
  const complete = remaining.every(r => r.remaining === 0)

  await admin.from('orders')
    .update({ assigned_band_ids: nextAssigned, ...(complete ? { status: 'processing' } : {}) })
    .eq('id', orderId)

  return NextResponse.json({ assigned: bandId, assigned_band_ids: nextAssigned, remaining, complete })
}
