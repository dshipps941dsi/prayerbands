import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { availableFor, type OpenOrder, type StockBand } from '@/lib/inventory'

// Public catalog read for the store. Active products only. Service role bypasses
// RLS; prices aren't secret.
//
// Stock is counted from the bands table on every read rather than served from
// product_variants.stock, which only a sale ever moved and which therefore drifted
// upward every time a band left the box any other way. See lib/inventory.ts.
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createServiceClient()
  const { data: products, error } = await admin
    .from('products')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = (products ?? []).map((p: any) => p.id)
  let variants: any[] = []
  if (ids.length) {
    const { data: v } = await admin
      .from('product_variants')
      .select('product_id, size, stock, backorder')
      .in('product_id', ids)
    variants = v ?? []
  }

  // The shelf. sellable_bands is the single definition of what that means —
  // never registered, never claimed, not church stock, and with no registration
  // row anywhere proving it is already out in the world.
  const { data: bandRows, error: bandErr } = await admin
    .from('sellable_bands')
    .select('theme, color, size, status, owner_id, org_id')

  // Bands already paid for but not yet picked, so a sale isn't offered twice.
  const { data: orderRows } = await admin
    .from('orders')
    .select('order_metadata, assigned_band_ids')
    .eq('payment_status', 'paid')
    .neq('status', 'cancelled')

  // If the shelf can't be read, fall back to the stored numbers rather than
  // reporting the whole store out of stock. A stale number sells too much; a
  // failed read would sell nothing at all.
  const shelf: StockBand[] | null = bandErr ? null : ((bandRows ?? []) as StockBand[])
  const openOrders = (orderRows ?? []) as OpenOrder[]
  if (bandErr) console.error('Stock read failed, serving stored stock:', bandErr.message)

  const shaped = (products ?? []).map((p: any) => {
    // Keep only the variant rows this product's sizing mode actually uses: the
    // seed left sized rows on unsized products (packs), which the store never
    // reads but which show up anywhere else that lists variants.
    const rows = variants.filter((v) => v.product_id === p.id && (p.has_sizes ? !!v.size : !v.size))
    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      theme: p.theme,
      color: p.color,
      icon: p.icon,
      tag: p.tag,
      price: (p.price_cents ?? 0) / 100,
      bandsPerUnit: p.bands_per_unit,
      features: Array.isArray(p.features) ? p.features : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      hasSizes: p.has_sizes,
      multiDiscount: p.multi_discount,
      discountTiers: Array.isArray(p.discount_tiers) ? p.discount_tiers : [],
      images: Array.isArray(p.image_urls) ? p.image_urls : [],
      variants: rows.map((v) => ({
        size: v.size,
        stock: shelf
          ? availableFor(shelf, openOrders, p.slug, v.size || undefined, p.bands_per_unit ?? 1).available
          : v.stock,
        backorder: v.backorder,
      })),
    }
  })

  return NextResponse.json({ products: shaped })
}
