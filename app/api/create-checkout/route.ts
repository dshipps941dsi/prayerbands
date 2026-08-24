import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteConfig } from '@/lib/getSiteConfig'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { creditBalanceCents } from '@/lib/credit'

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

    // Who is buying. Resolved once: it decides both the credit they can spend
    // and who gets credited for the sale.
    let buyerId: string | null = null
    try {
      const authed = await createClient()
      const { data: { user: buyer } } = await authed.auth.getUser()
      buyerId = buyer?.id ?? null
    } catch {
      buyerId = null
    }

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

    // No code? Fall back to whoever introduced this buyer.
    //
    // Credit only ever followed a code somebody had to remember to type, which
    // assumed the network grows by people passing bands on. In practice they
    // keep the band and buy one for the next person instead — and that sale
    // earned their sponsor nothing, even though the relationship was already
    // recorded when they claimed the band they were given.
    //
    // profiles.upline_user_id is that relationship, and it is first-wins: it is
    // set once, by the first band someone was given, and never moves. So a
    // second purchase credits the same person as the first.
    if (!referrerUserId && buyerId) {
      const { data: me } = await admin
        .from('profiles')
        .select('upline_user_id')
        .eq('id', buyerId)
        .maybeSingle()
      if (me?.upline_user_id) referrerUserId = me.upline_user_id as string
    }

    // Nobody earns a reward for their own order — including by pasting their
    // own code, which nothing stopped before.
    if (referrerUserId && referrerUserId === buyerId) referrerUserId = null
    // Store credit the buyer has earned from referrals, spent automatically.
    // Capped at the order total so a discount can never exceed what is owed,
    // and only for a signed-in buyer — credit belongs to an account.
    let creditUserId: string | null = null
    let creditApplied = 0
    let couponAmount = 0
    let waiveShipping = false
    try {
      if (buyerId) {
        const balance = await creditBalanceCents(admin, buyerId)
        if (balance > 0) {
          const goodsTotal = lineItems.reduce(
            (sum, li) => sum + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0
          )
          // Stripe can discount line items but not a shipping rate, so shipping
          // is covered by waiving it outright — and only when the balance covers
          // the entire order. Anything less is capped at the goods, because a
          // part-paid shipping rate is not something Stripe can express.
          if (balance >= goodsTotal + shippingCost) {
            creditApplied = goodsTotal + shippingCost
            couponAmount = goodsTotal
            waiveShipping = true
          } else {
            creditApplied = Math.min(balance, goodsTotal)
            couponAmount = creditApplied
          }
          if (creditApplied > 0) creditUserId = buyerId
        }
      }
    } catch (e) {
      // Never block a purchase over credit. Worst case they keep the balance.
      console.error('[create-checkout] credit lookup failed:', e)
      creditApplied = 0
      creditUserId = null
    }

    const promoId = process.env.STRIPE_REFERRAL_PROMO_CODE_ID
    // Accept either a Promotion Code id (promo_...) or a Coupon id.
    const referralDiscount: Stripe.Checkout.SessionCreateParams.Discount | null = promoId
      ? (promoId.startsWith('promo_') ? { promotion_code: promoId } : { coupon: promoId })
      : null
    // The buyer's discount is the reward for USING a code. A sponsorship they
    // never invoked should credit the sponsor without quietly changing the price
    // the buyer was shown.
    const applyReferralDiscount = !!(referralCode && referrerUserId && referralDiscount) && creditApplied === 0

    let creditCoupon: string | null = null
    if (couponAmount > 0 && creditUserId) {
      const coupon = await stripe.coupons.create({
        amount_off: couponAmount,
        currency: 'usd',
        duration: 'once',
        name: 'Referral credit',
        max_redemptions: 1,
      })
      creditCoupon = coupon.id
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ...(creditCoupon
        ? { discounts: [{ coupon: creditCoupon }] }
        : applyReferralDiscount && referralDiscount
          ? { discounts: [referralDiscount] }
          : { allow_promotion_codes: true }),
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === 'true' },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store`,
      customer_email: email || undefined,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'] },
      shipping_options: shippingCost > 0 && !waiveShipping
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
        // Read back by the webhook to record the spend against the ledger.
        credit_applied_cents: creditApplied > 0 ? String(creditApplied) : '',
        credit_user_id: creditUserId || '',
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
