import { NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { availableFor, reservedFor, type OpenOrder, type StockBand } from '@/lib/inventory'
import { parseOrderItems, variantForSlug, PRODUCT_VARIANTS } from '@/lib/fulfillment'

// Reorder suggestions: for every style and size, how fast it sells, how long
// the shelf lasts at that pace, and how many to order so a shipment placed
// today still lands before the shelf runs dry.
//
// This is the plain reorder-point formula, not a learned model. It is
// transparent on purpose: every number on the admin card can be traced back to
// "sold N in the last W days" and "there are S on the shelf". A forecasting
// model only earns its keep once there are a couple of seasons of history to
// learn from; until then a clear rule beats a clever one.
//
//   rate           = units sold in window / days observed
//   days of cover  = available / rate
//   reorder point  = rate × (lead + buffer)         ← order when available ≤ this
//   order-up-to    = rate × (lead + buffer + target) ← what the shelf should
//                    hold once the shipment lands; suggested qty = that − available
//
// Style is theme-or-color (the two are exclusive), which is already how the
// store matches bands to products, so the same slug map is used here.

const DEFAULTS = { lead: 45, buffer: 14, target: 90, window: 56, floor: 5 }
const LIMITS = { lead: [1, 365], buffer: [0, 180], target: [7, 365], window: [14, 365], floor: [0, 500] } as const

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

function num(sp: URLSearchParams, key: keyof typeof DEFAULTS): number {
  const raw = Number(sp.get(key))
  const [lo, hi] = LIMITS[key]
  if (!Number.isFinite(raw)) return DEFAULTS[key]
  return Math.min(hi, Math.max(lo, Math.round(raw)))
}

export type ReorderRow = {
  slug: string
  name: string
  size: string
  shelf: number
  reserved: number
  available: number
  soldInWindow: number
  ordersInWindow: number
  ratePerWeek: number
  daysOfCover: number | null   // null = no sales yet, cover is effectively infinite
  stockoutOn: string | null    // ISO date the shelf hits zero at the current pace
  reorderPoint: number
  suggested: number
  urgency: 'now' | 'soon' | 'ok' | 'low' | 'none'
  confidence: 'ok' | 'thin'
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const p = {
    lead: num(sp, 'lead'), buffer: num(sp, 'buffer'), target: num(sp, 'target'),
    window: num(sp, 'window'), floor: num(sp, 'floor'),
  }

  try {
    const admin = createServiceClient()

    const { data: products, error: pErr } = await admin
      .from('products')
      .select('id, slug, name, active, has_sizes, bands_per_unit')
    if (pErr) throw new Error(`products: ${pErr.message}`)

    const ids = (products ?? []).map((x: any) => x.id)
    let variants: any[] = []
    if (ids.length) {
      const { data: v, error: vErr } = await admin
        .from('product_variants').select('product_id, size').in('product_id', ids)
      if (vErr) throw new Error(`variants: ${vErr.message}`)
      variants = v ?? []
    }

    const { data: bandRows, error: bErr } = await admin
      .from('sellable_bands')
      .select('theme, color, size, status, owner_id, org_id')
    if (bErr) throw new Error(`bands: ${bErr.message}`)

    const { data: orderRows, error: oErr } = await admin
      .from('orders')
      .select('created_at, order_metadata, assigned_band_ids')
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })
    if (oErr) throw new Error(`orders: ${oErr.message}`)

    const shelf = (bandRows ?? []) as StockBand[]
    const orders = (orderRows ?? []) as (OpenOrder & { created_at: string })[]

    // Sales in the window, per slug+size. If the store is younger than the
    // window, divide by the days it has actually been selling (min 14) so a
    // brand-new shop isn't read as selling almost nothing.
    const now = Date.now()
    const windowStart = now - p.window * 86400000
    const firstSale = orders.length ? new Date(orders[0].created_at).getTime() : now
    const daysObserved = Math.max(14, Math.min(p.window, (now - firstSale) / 86400000))

    const sold = new Map<string, { units: number; orders: number }>()
    let assortedUnits = 0
    let ordersInWindow = 0
    for (const o of orders) {
      if (new Date(o.created_at).getTime() < windowStart) continue
      ordersInWindow++
      const seen = new Set<string>()
      for (const it of parseOrderItems(o.order_metadata)) {
        const v = variantForSlug(it.id)
        if (v.assorted || v.unmapped) { assortedUnits += it.qty; continue }
        const key = `${it.id}|${it.size || ''}`
        const cur = sold.get(key) || { units: 0, orders: 0 }
        cur.units += it.qty
        if (!seen.has(key)) { cur.orders++; seen.add(key) }
        sold.set(key, cur)
      }
    }

    const rows: ReorderRow[] = []
    for (const prod of (products ?? []) as any[]) {
      if (!prod.active) continue
      const v = variantForSlug(prod.slug)
      if (v.assorted || v.unmapped) continue
      const sizes = prod.has_sizes
        ? variants.filter(x => x.product_id === prod.id && x.size).map(x => String(x.size))
        : ['']
      for (const size of sizes) {
        const a = availableFor(shelf, orders, prod.slug, size || undefined, prod.bands_per_unit ?? 1)
        const s = sold.get(`${prod.slug}|${size}`) || { units: 0, orders: 0 }
        const ratePerDay = s.units / daysObserved
        const daysOfCover = ratePerDay > 0 ? a.available / ratePerDay : null
        const reorderPoint = Math.ceil(ratePerDay * (p.lead + p.buffer))
        const orderUpTo = Math.ceil(ratePerDay * (p.lead + p.buffer + p.target))

        let urgency: ReorderRow['urgency'] = 'ok'
        if (ratePerDay > 0 && daysOfCover !== null) {
          if (daysOfCover < p.lead) urgency = 'now'
          else if (daysOfCover < p.lead + p.buffer) urgency = 'soon'
        } else {
          urgency = 'none'
        }
        // The floor catches the case the rate can't: something with no
        // recent sales that is nonetheless nearly gone.
        if (urgency !== 'now' && a.available <= p.floor) urgency = 'low'

        let suggested = 0
        if (urgency === 'now' || urgency === 'soon') suggested = Math.max(0, orderUpTo - a.available)
        else if (urgency === 'low') suggested = Math.max(0, Math.max(orderUpTo, p.floor * 4) - a.available)

        rows.push({
          slug: prod.slug, name: v.name || prod.name, size: size || '—',
          shelf: a.shelf, reserved: a.reserved, available: a.available,
          soldInWindow: s.units, ordersInWindow: s.orders,
          ratePerWeek: Math.round(ratePerDay * 7 * 10) / 10,
          daysOfCover: daysOfCover === null ? null : Math.round(daysOfCover),
          stockoutOn: daysOfCover === null ? null : new Date(now + daysOfCover * 86400000).toISOString().slice(0, 10),
          reorderPoint, suggested, urgency,
          confidence: s.orders >= 3 ? 'ok' : 'thin',
        })
      }
    }

    // The whole shelf grouped by design (theme, or color for plain bands),
    // including designs no active product sells — those still exist and still
    // need to be seen when deciding what to make next.
    const nameOf = new Map<string, string>()
    const slugOf = new Map<string, string>()
    for (const [slug, v] of Object.entries(PRODUCT_VARIANTS)) {
      if (v.assorted || v.unmapped) continue
      const key = v.color ? `color:${v.color}` : `theme:${v.theme}`
      nameOf.set(key, v.name); slugOf.set(key, slug)
    }
    const shelfBy = new Map<string, { key: string; name: string; total: number; sizes: Record<string, number>; held: number }>()
    for (const b of shelf) {
      const isTheme = b.theme && b.theme !== 'default'
      const key = isTheme ? `theme:${b.theme}` : `color:${b.color || '—'}`
      const cur = shelfBy.get(key) || { key, name: nameOf.get(key) || (isTheme ? String(b.theme) : String(b.color || 'Unmarked')), total: 0, sizes: {}, held: 0 }
      const sz = b.size || '—'
      cur.sizes[sz] = (cur.sizes[sz] || 0) + 1
      cur.total++
      shelfBy.set(key, cur)
    }
    for (const g of shelfBy.values()) {
      const slug = slugOf.get(g.key)
      if (slug) g.held = reservedFor(orders, slug)
    }
    const shelfSummary = [...shelfBy.values()].sort((a, b) => a.total - b.total || a.name.localeCompare(b.name))

    const rank: Record<ReorderRow['urgency'], number> = { now: 0, low: 1, soon: 2, ok: 3, none: 4 }
    rows.sort((x, y) =>
      rank[x.urgency] - rank[y.urgency]
      || (x.daysOfCover ?? 1e9) - (y.daysOfCover ?? 1e9)
      || x.name.localeCompare(y.name) || x.size.localeCompare(y.size))

    return NextResponse.json({
      params: p,
      daysObserved: Math.round(daysObserved),
      ordersInWindow,
      assortedUnits,
      historyThin: ordersInWindow < 10,
      rows,
      shelf: shelfSummary,
      shelfTotal: shelf.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
