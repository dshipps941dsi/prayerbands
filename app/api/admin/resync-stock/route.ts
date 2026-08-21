import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { availableFor, orphanStock, type OpenOrder, type StockBand } from '@/lib/inventory'
import { isMapped } from '@/lib/fulfillment'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

// The storefront counts bands live, so product_variants.stock no longer decides
// what can be sold. It stays as a written-through mirror because the admin
// product editor and the Stripe webhook's backorder check still read it, and a
// number sitting in a table that disagrees with reality is exactly how this got
// out of hand the first time.
//
// GET  — what the numbers would become, and what is wrong with the catalog.
// POST — write them.
async function survey() {
  const admin = createServiceClient()

  const { data: products, error: pErr } = await admin
    .from('products')
    .select('id, slug, name, active, bands_per_unit')
  if (pErr) throw new Error(`products: ${pErr.message}`)

  const ids = (products ?? []).map((p: any) => p.id)
  let variants: any[] = []
  if (ids.length) {
    const { data: v, error: vErr } = await admin
      .from('product_variants')
      .select('id, product_id, size, stock, backorder')
      .in('product_id', ids)
    if (vErr) throw new Error(`variants: ${vErr.message}`)
    variants = v ?? []
  }

  const { data: bandRows, error: bErr } = await admin
    .from('sellable_bands')
    .select('theme, color, size, status, owner_id, org_id')
  if (bErr) throw new Error(`bands: ${bErr.message}`)

  const { data: orderRows } = await admin
    .from('orders')
    .select('order_metadata, assigned_band_ids')
    .eq('payment_status', 'paid')
    .neq('status', 'cancelled')

  const shelf = (bandRows ?? []) as StockBand[]
  const openOrders = (orderRows ?? []) as OpenOrder[]
  const productById = new Map((products ?? []).map((p: any) => [p.id, p]))

  const rows = variants
    // Ignore variant rows a product's sizing mode never reads — the seed left
    // sized rows on the unsized packs.
    .filter((v: any) => {
      const p = productById.get(v.product_id)
      return p ? (p.has_sizes ? !!v.size : !v.size) : false
    })
    .map((v: any) => {
    const p = productById.get(v.product_id)
    const a = availableFor(shelf, openOrders, p?.slug ?? '', v.size || undefined, p?.bands_per_unit ?? 1)
    return {
      id: v.id,
      slug: p?.slug ?? '(unknown)',
      name: p?.name ?? '(unknown)',
      active: !!p?.active,
      size: v.size || '—',
      stored: v.stock,
      actual: a.available,
      shelf: a.shelf,
      reserved: a.reserved,
      delta: a.available - v.stock,
    }
  }).sort((x, y) => x.slug.localeCompare(y.slug) || x.size.localeCompare(y.size))

  // Designs sitting in the box that no *active* product can sell.
  const sellableSlugs = (products ?? []).filter((p: any) => p.active).map((p: any) => p.slug)

  // Active products with no entry in PRODUCT_VARIANTS. They match no band, so
  // they read as out of stock and can never be filled — which is the safe way
  // to be wrong, but only if somebody is told. Adding a product in the admin
  // does not create the mapping; that still lives in lib/fulfillment.ts.
  const unmapped = (products ?? [])
    .filter((p: any) => p.active && !isMapped(p.slug))
    .map((p: any) => ({ slug: p.slug, name: p.name }))

  return { rows, orphans: orphanStock(shelf, sellableSlugs), shelfTotal: shelf.length, unmapped }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await survey())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let s
  try {
    s = await survey()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const admin = createServiceClient()
  const changed = s.rows.filter(r => r.delta !== 0)
  const failed: string[] = []

  for (const r of changed) {
    // Check the row count: an update that matches nothing returns no error, and
    // silently reporting a write that never landed is the failure mode this
    // whole exercise exists to stop.
    const { data, error } = await admin
      .from('product_variants')
      .update({ stock: r.actual })
      .eq('id', r.id)
      .select('id')
    if (error || !data || data.length === 0) failed.push(`${r.slug} ${r.size}${error ? `: ${error.message}` : ''}`)
  }

  if (failed.length) {
    return NextResponse.json(
      { error: `Updated ${changed.length - failed.length} of ${changed.length}. Failed: ${failed.join(', ')}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ updated: changed.length, rows: s.rows, orphans: s.orphans, unmapped: s.unmapped })
}
