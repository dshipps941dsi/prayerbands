import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// Ensure a variant row exists for each size the product offers.
async function syncVariants(admin: any, productId: string, sizes: string[], hasSizes: boolean) {
  const wanted = hasSizes && sizes.length ? sizes : ['']
  const { data: existing } = await admin.from('product_variants').select('size').eq('product_id', productId)
  const have = new Set((existing ?? []).map((v: any) => v.size))
  const toAdd = wanted.filter((s) => !have.has(s))
  if (toAdd.length) {
    await admin.from('product_variants').insert(toAdd.map((size) => ({ product_id: productId, size })))
  }
}

// Map an incoming body to a products row (only known columns).
function productFields(b: any) {
  const f: Record<string, unknown> = {}
  const str = ['slug', 'name', 'description', 'category', 'theme', 'color', 'icon', 'tag']
  for (const k of str) if (b[k] !== undefined) f[k] = b[k]
  if (b.price_cents !== undefined) f.price_cents = Math.max(0, Math.round(Number(b.price_cents) || 0))
  if (b.bands_per_unit !== undefined) f.bands_per_unit = Math.max(1, Math.round(Number(b.bands_per_unit) || 1))
  if (b.features !== undefined) f.features = Array.isArray(b.features) ? b.features : []
  if (b.sizes !== undefined) f.sizes = Array.isArray(b.sizes) ? b.sizes : []
  if (b.has_sizes !== undefined) f.has_sizes = !!b.has_sizes
  if (b.multi_discount !== undefined) f.multi_discount = !!b.multi_discount
  if (b.discount_tiers !== undefined) {
    f.discount_tiers = Array.isArray(b.discount_tiers)
      ? b.discount_tiers
          .filter((t: any) => t && Number(t.min_qty) > 0)
          .map((t: any) => ({ min_qty: Math.round(Number(t.min_qty)), percent: Math.max(0, Math.min(90, Math.round(Number(t.percent) || 0))) }))
      : []
  }
  if (b.image_urls !== undefined) f.image_urls = Array.isArray(b.image_urls) ? b.image_urls : []
  if (b.active !== undefined) f.active = !!b.active
  if (b.sort_order !== undefined) f.sort_order = Math.round(Number(b.sort_order) || 0)
  return f
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createServiceClient()
  const { data: products } = await admin.from('products').select('*').order('sort_order', { ascending: true })
  const ids = (products ?? []).map((p: any) => p.id)
  let variants: any[] = []
  if (ids.length) {
    const { data } = await admin.from('product_variants').select('id, product_id, size, stock, backorder').in('product_id', ids)
    variants = data ?? []
  }
  return NextResponse.json({ products: products ?? [], variants })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.slug || !body.name) return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  const admin = createServiceClient()
  const fields = productFields(body)
  const { data, error } = await admin.from('products').insert(fields).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncVariants(admin, data.id, (data.sizes as string[]) ?? [], !!data.has_sizes)
  return NextResponse.json({ product: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const admin = createServiceClient()

  const fields = productFields(body)
  if (Object.keys(fields).length) {
    const { error } = await admin.from('products').update(fields).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Keep variant rows in step with the product's sizes.
  if (body.sizes !== undefined || body.has_sizes !== undefined) {
    await syncVariants(admin, body.id, body.sizes ?? [], !!body.has_sizes)
  }

  // Update per-variant stock / backorder.
  if (Array.isArray(body.variants)) {
    for (const v of body.variants) {
      const size = v.size ?? ''
      await admin
        .from('product_variants')
        .update({ stock: Math.max(0, Math.round(Number(v.stock) || 0)), backorder: !!v.backorder })
        .eq('product_id', body.id)
        .eq('size', size)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const admin = createServiceClient()
  const { error } = await admin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
