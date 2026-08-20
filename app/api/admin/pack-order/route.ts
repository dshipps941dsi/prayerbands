import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { variantForSlug, parseOrderItems, reconcilePack, type OrderItem, type PackBand } from '@/lib/fulfillment'

// TODO(stage 2): replace with a profiles.role check so packers can reach this
// without being the owner's Google account.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

function normalizeBandId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

type Problem = { band_id?: string; design?: string; size?: string; reason: string }

// POST /api/admin/pack-order { orderId, bandIds[], allowMismatch? }
//
// The packer's counterpart to assign-order-bands. There, the server picks which
// bands to send and a human then has to find those exact ones in a bin. Here the
// human grabs any band of the right design, taps it, and the server records what
// was actually picked up — so the ids on the order and the ids in the envelope
// cannot drift apart. That matters because the shipping email tells the customer
// their band ids: a mismatch means they are told about a band they do not have,
// and the one they do have belongs to nobody.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const orderId = body?.orderId
  const allowMismatch = body?.allowMismatch === true
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const scanned = [...new Set((Array.isArray(body?.bandIds) ? body.bandIds : []).map(normalizeBandId).filter(Boolean))] as string[]
  if (scanned.length === 0) return NextResponse.json({ error: 'Scan at least one band first.' }, { status: 400 })

  const admin = createServiceClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, order_metadata, assigned_band_ids')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (Array.isArray(order.assigned_band_ids) && order.assigned_band_ids.length) {
    return NextResponse.json({ error: 'Bands are already packed for this order.', assigned: order.assigned_band_ids }, { status: 409 })
  }

  // Only bands that are genuinely shippable. Anything owned, held by an org, or
  // already allocated is invisible here, so a band that has been packed into
  // another order cannot be packed into this one too.
  const { data: rows } = await admin
    .from('bands')
    .select('band_id, theme, color, size')
    .in('band_id', scanned)
    .eq('status', 'unregistered').is('owner_id', null).is('org_id', null)
  const found = (rows ?? []) as PackBand[]

  const foundIds = new Set(found.map(b => b.band_id))
  const unavailable: Problem[] = scanned
    .filter(id => !foundIds.has(id))
    .map(id => ({ band_id: id, reason: 'Unknown band, or it is already claimed, sold, or packed into another order' }))

  let items = parseOrderItems(order.order_metadata)
  if (items.length === 0) {
    const qty = Math.max(1, parseInt(order.order_metadata?.quantity || '1', 10) || 1)
    items = [{ id: 'assorted', qty }]
  }

  // Keep the scan order so the packer sees problems in the order they arose.
  const ordered = scanned.map(id => found.find(b => b.band_id === id)).filter(Boolean) as PackBand[]
  const rec = reconcilePack(ordered, items)

  const mismatches: Problem[] = rec.unmatched.map(b => {
    const design = [b.theme, b.color].filter(Boolean).join(' ') || 'unknown design'
    return {
      band_id: b.band_id,
      reason: `${design}${b.size ? ` · ${b.size}` : ''} is not on this order (or its lines are already filled)`,
    }
  })

  const shortfalls: Problem[] = rec.need
    .filter(n => n.left > 0)
    .map(n => {
      const v = variantForSlug(n.id)
      return { design: v.name, size: n.size, reason: `${n.left} more ${v.name}${n.size ? ` · ${n.size}` : ''} still to pack` }
    })

  // A shortfall is a half-packed order and an unavailable band is a band we
  // cannot ship, so neither is overridable — the envelope would go out wrong
  // either way. A mismatch can be overridden deliberately: substituting a
  // design by hand is a real thing a packer does.
  if (unavailable.length > 0 || shortfalls.length > 0 || (mismatches.length > 0 && !allowMismatch)) {
    return NextResponse.json(
      { error: 'This pack does not match the order.', unavailable, mismatches, shortfalls, packed: false },
      { status: 409 }
    )
  }

  const bandIds = ordered.map(b => b.band_id)
  await admin.from('bands').update({ status: 'assigned' }).in('band_id', bandIds)

  let ownerLinked = false
  if (order.customer_email) {
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', order.customer_email).maybeSingle()
    if (prof?.id) {
      // Same rule as the picker: the buyer is owner AND upline, so bands they
      // hand on are credited to them and the downline tree keeps compounding.
      await admin.from('bands')
        .update({ owner_id: prof.id, upline_user_id: prof.id, upline_email: order.customer_email ?? null })
        .in('band_id', bandIds)
      ownerLinked = true
    }
  }

  await admin.from('orders').update({ assigned_band_ids: bandIds, status: 'processing' }).eq('id', orderId)

  return NextResponse.json({ packed: true, assigned: bandIds, count: bandIds.length, mismatches, owner_linked: ownerLinked })
}
