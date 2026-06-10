import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteConfig } from '@/lib/getSiteConfig'
import { createServiceClient } from '@/lib/supabase/server'

// Fallback definitions (used only if the products table hasn't been seeded yet),
// so checkout keeps working before db/products.sql is run.
const FALLBACK: Record<string, { key: string; name: string; bands: number; multi: boolean }> = {
  standard: { key: 'band_price_single', name: 'PrayerBand', bands: 1, multi: true },
  custom: { key: 'band_price_custom', name: 'Custom PrayerBand', bands: 1, multi: false },
  'pack-50': { key: 'pack_price_50', name: 'Starter Pack — 50 Bands', bands: 50, multi: false },
  'pack-100': { key: 'pack_price_100', name: 'Community Pack — 100 Bands', bands: 100, multi: false },
  'pack-200': { key: 'pack_price_200', name: 'Mission Pack — 200 Bands', bands: 200, multi: false },
}

type Resolved = { priceCents: number; name: string; bands: number; multi: boolean; tiers: { min_qty: number; percent: number }[] }

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const body = await req.json()
    const { customMessage, verse, color, email, replaces } = body
    const referralCode = typeof body.referralCode === 'string' ? body.referralCode.trim().toUpperCase() : ''

    let items: { id: string; qty: number; size?: string }[] = Array.isArray(body.items) ? body.items : []
    if (items.length === 0 && body.type) {
      items = [{ id: body.type === 'custom' ? 'custom' : 'standard', qty: body.quantity || 1 }]
    }
    items = items
      .filter(i => i && i.id && Number(i.qty) > 0)
      .map(i => ({ id: String(i.id), qty: Math.floor(Number(i.qty)), size: i.size ? String(i.size).toUpperCase().slice(0, 2) : undefined }))
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Resolve each product from the catalog, falling back to site_config.
    const admin = createServiceClient()
    const slugs = [...new Set(items.map(i => i.id))]
    const { data: dbProducts } = await admin
      .from('products')
      .select('slug, name, price_cents, bands_per_unit, multi_discount, discount_tiers, active')
      .in('slug', slugs)
    const dbMap = new Map((dbProducts ?? []).map((p: any) => [p.slug, p]))

    const resolved: Record<string, Resolved> = {}
    for (const slug of slugs) {
      const p = dbMap.get(slug)
      if (p && p.active !== false) {
        resolved[slug] = { priceCents: p.price_cents, name: p.name, bands: p.bands_per_unit || 1, multi: !!p.multi_discount, tiers: Array.isArray(p.discount_tiers) ? p.discount_tiers : [] }
      } else if (FALLBACK[slug]) {
        resolved[slug] = { priceCents: await getSiteConfig(FALLBACK[slug].key), name: FALLBACK[slug].name, bands: FALLBACK[slug].bands, multi: FALLBACK[slug].multi, tiers: [] }
      }
    }
    items = items.filter(i => resolved[i.id])
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Automatic multi-band discount: percent tiers stored on each product
    // (applied to its own base price), keyed on the combined multi-eligible qty.
    const discountQty = items.filter(i => resolved[i.id].multi).reduce((s, i) => s + i.qty, 0)
    const tierPercent = (qty: number, tiers: { min_qty: number; percent: number }[]) =>
      (tiers || []).filter(t => qty >= Number(t.min_qty)).reduce((m, t) => Math.max(m, Number(t.percent) || 0), 0)
    const unitFor = (slug: string): number => {
      const r = resolved[slug]
      if (!r.multi) return r.priceCents
      const pct = tierPercent(discountQty, r.tiers)
      return pct > 0 ? Math.round(r.priceCents * (1 - pct / 100)) : r.priceCents
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(i => {
      const name = resolved[i.id].name + (i.size ? ` (${i.size})` : '')
      return {
        quantity: i.qty,
        price_data: {
          currency: 'usd',
          unit_amount: unitFor(i.id),
          tax_behavior: 'exclusive' as const,
          product_data: { name, tax_code: 'txcd_99999999' },
        },
      }
    })

    const shippingCost = await getSiteConfig('shipping_cost_standard')
    const hasCustom = items.some(i => i.id === 'custom')
    const totalBands = items.reduce((sum, i) => sum + i.qty * resolved[i.id].bands, 0)

    // Referral: confirm the code maps to a real profile, then (if a promo code
    // is configured) apply the discount. When a discount is set, Stripe forbids
    // allow_promotion_codes, so we choose one or the other.
    let referrerUserId: string | null = null
    if (referralCode) {
      const { data: refProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle()
      if (refProfile) referrerUserId = refProfile.id as string
    }
    const promoId = process.env.STRIPE_REFERRAL_PROMO_CODE_ID
    // Accept either a Promotion Code id (promo_...) or a Coupon id.
    const referralDiscount: Stripe.Checkout.SessionCreateParams.Discount | null = promoId
      ? (promoId.startsWith('promo_') ? { promotion_code: promoId } : { coupon: promoId })
      : null
    const applyReferralDiscount = !!(referrerUserId && referralDiscount)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ...(applyReferralDiscount && referralDiscount
        ? { discounts: [referralDiscount] }
        : { allow_promotion_codes: true }),
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === 'true' },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store`,
      customer_email: email || undefined,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'] },
      shipping_options: shippingCost > 0
        ? [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: shippingCost, currency: 'usd' }, display_name: 'Standard Shipping', tax_behavior: 'exclusive', tax_code: 'txcd_92010001' } }]
        : undefined,
      metadata: {
        type: hasCustom ? 'custom' : 'standard',
        quantity: String(totalBands),
        customMessage: customMessage || '',
        verse: verse || '',
        color: color || 'blue',
        items: JSON.stringify(items),
        replaces: replaces ? String(replaces).trim().toUpperCase() : '',
        referrer_user_id: referrerUserId || '',
        referral_code: referrerUserId ? referralCode : '',
      },
    })

    // Record the referred checkout (best-effort; never block the redirect).
    if (referrerUserId) {
      const { error: refErr } = await admin
        .from('referrals')
        .insert({ referrer_user_id: referrerUserId, stripe_session_id: session.id })
      if (refErr) console.error('[create-checkout] referrals insert error:', refErr)
    }

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
