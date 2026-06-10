import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public catalog read for the store. Active products only, with per-size
// variant stock/backorder. Service role bypasses RLS; prices aren't secret.
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

  const shaped = (products ?? []).map((p: any) => ({
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
    variants: variants
      .filter((v) => v.product_id === p.id)
      .map((v) => ({ size: v.size, stock: v.stock, backorder: v.backorder })),
  }))

  return NextResponse.json({ products: shaped })
}
