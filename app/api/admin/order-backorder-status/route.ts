import { NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { shelfCount, reservedFor, isAwaitingPick, type OpenOrder, type StockBand } from '@/lib/inventory'
import { parseOrderItems } from '@/lib/fulfillment'

// GET /api/admin/order-backorder-status
// The "⚑ Backorder" badge used to read order_metadata.backordered — a snapshot
// the Stripe webhook writes at checkout from product_variants.stock (the legacy
// hand-kept mirror that drifts). Two problems: it never clears when stock is
// freed (a cancelled order, a restock), and it can be wrong on the day if the
// mirror was stale. This computes the truth live from the real shelf:
//   still short = need − (on shelf − reserved by OTHER unpicked paid orders)
// for every order that was flagged and hasn't been picked yet.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamAdmin(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const [{ data: shelfRows }, { data: orderRows }] = await Promise.all([
    admin.from('sellable_bands').select('theme, color, size, status, owner_id, org_id'),
    admin.from('orders').select('id, order_metadata, assigned_band_ids, status, payment_status').eq('payment_status', 'paid').neq('status', 'cancelled'),
  ])
  const shelf = (shelfRows ?? []) as StockBand[]
  const open = (orderRows ?? []) as (OpenOrder & { id: number; order_metadata: any })[]

  const out: Record<number, { stillShort: boolean; short: { slug: string; size: string; need: number; available: number }[] }> = {}
  for (const o of open) {
    if (!o.order_metadata?.backordered) continue
    if (!isAwaitingPick(o)) { out[o.id] = { stillShort: false, short: [] }; continue }
    const others = open.filter(x => x.id !== o.id)
    const short: { slug: string; size: string; need: number; available: number }[] = []
    for (const it of parseOrderItems(o.order_metadata)) {
      const size = it.size ? String(it.size).toUpperCase().slice(0, 2) : undefined
      const available = Math.max(0, shelfCount(shelf, it.id, size) - reservedFor(others, it.id, size))
      if (available < it.qty) short.push({ slug: it.id, size: size || '', need: it.qty, available })
    }
    out[o.id] = { stillShort: short.length > 0, short }
  }
  return NextResponse.json({ status: out })
}
