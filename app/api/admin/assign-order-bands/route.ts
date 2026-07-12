import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { variantForSlug, parseOrderItems, type Variant } from '@/lib/fulfillment'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
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
  const { data: pool } = await admin
    .from('bands')
    .select('band_id, theme, color, size')
    .eq('status', 'unregistered').is('owner_id', null).is('org_id', null)
    .order('band_id')
  const available = (pool ?? []) as { band_id: string; theme: string | null; color: string | null; size: string | null }[]

  const matchesDesign = (b: typeof available[number], v: Variant) =>
    v.assorted || (b.theme === v.theme && (!v.color || b.color === v.color))

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
      await admin.from('bands').update({ owner_id: prof.id }).in('band_id', assigned)
      ownerLinked = true
    }
  }

  await admin.from('orders').update({ assigned_band_ids: assigned, status: 'processing' }).eq('id', orderId)

  return NextResponse.json({ assigned, count: assigned.length, shortfalls, owner_linked: ownerLinked })
}
