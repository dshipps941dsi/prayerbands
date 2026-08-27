import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { variantForSlug, parseOrderItems, matchesDesign } from '@/lib/fulfillment'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// POST /api/admin/assign-order-bands { orderId }
// Assign bands to an order that MATCH what was ordered — the design (theme/color)
// per line, and the size where that design's inventory is sized (falls back to
// any size otherwise). Reports shortfalls per line so the admin knows what to
// re-stock. Also links the bands to the buyer's account (by order email).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await req.json().catch(() => ({}))
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

  const admin = createServiceClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, order_metadata, assigned_band_ids')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (Array.isArray(order.assigned_band_ids) && order.assigned_band_ids.length) {
    return NextResponse.json({ error: 'Bands are already assigned to this order.', assigned: order.assigned_band_ids }, { status: 409 })
  }

  // Order lines. If no per-line breakdown exists (older metadata), fall back to
  // N assorted bands from the quantity.
  let items = parseOrderItems(order.order_metadata)
  if (items.length === 0) {
    const qty = Math.max(1, parseInt(order.order_metadata?.quantity || '1', 10) || 1)
    items = [{ id: 'assorted', qty }]
  }

  // Load the whole shippable pool once; match each line against it in memory.
  // sellable_bands is the same shelf the storefront counts, so the picker can
  // never allocate a band the store has already written off as gone.
  const { data: pool } = await admin
    .from('sellable_bands')
    .select('band_id, theme, color, size')
    .order('band_id')
  const available = (pool ?? []) as { band_id: string; theme: string | null; color: string | null; size: string | null }[]

  const used = new Set<string>()
  const assigned: string[] = []
  const shortfalls: { design: string; size?: string; ordered: number; matched: number }[] = []

  for (const it of items) {
    const v = variantForSlug(it.id)
    // Only constrain by size if this design actually has bands in that size.
    const sizedExist = !!it.size && available.some(b => !used.has(b.band_id) && matchesDesign(b, v) && b.size === it.size)
    let picked = 0
    for (const b of available) {
      if (picked >= it.qty) break
      if (used.has(b.band_id) || !matchesDesign(b, v)) continue
      if (it.size && sizedExist && b.size !== it.size) continue
      used.add(b.band_id); assigned.push(b.band_id); picked++
    }
    if (picked < it.qty) shortfalls.push({ design: v.name, size: it.size, ordered: it.qty, matched: picked })
  }

  if (assigned.length === 0) {
    return NextResponse.json({ error: 'No matching bands are in stock for this order.', shortfalls }, { status: 409 })
  }

  // Allocate the matched bands, link the buyer (by order email), stamp the order.
  await admin.from('bands').update({ status: 'assigned' }).in('band_id', assigned)

  let ownerLinked = false
  if (order.customer_email) {
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', order.customer_email).maybeSingle()
    if (prof?.id) {
      // The buyer becomes both owner and upline: bands they hand out are
      // credited to them, so whoever receives one hangs below them in the tree.
      // This is what makes reach compound — without it the network stops at
      // whoever gave out the first band and a downline's purchases go nowhere.
      await admin.from('bands')
        .update({ owner_id: prof.id, upline_user_id: prof.id, upline_email: order.customer_email ?? null })
        .in('band_id', assigned)
      ownerLinked = true
    }
  }

  await admin.from('orders').update({ assigned_band_ids: assigned, status: 'processing' }).eq('id', orderId)

  return NextResponse.json({ assigned, count: assigned.length, shortfalls, owner_linked: ownerLinked })
}
