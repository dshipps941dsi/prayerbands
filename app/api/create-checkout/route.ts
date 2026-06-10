import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteConfig } from '@/lib/getSiteConfig'

// Cart product id → site_config price key + display name + bands it represents.
const CATALOG: Record<string, { key: string; name: string; bands: number }> = {
  standard: { key: 'band_price_single', name: 'PrayerBand', bands: 1 },
  custom: { key: 'band_price_custom', name: 'Custom PrayerBand', bands: 1 },
  'pack-50': { key: 'pack_price_50', name: 'Starter Pack — 50 Bands', bands: 50 },
  'pack-100': { key: 'pack_price_100', name: 'Community Pack — 100 Bands', bands: 100 },
  'pack-200': { key: 'pack_price_200', name: 'Mission Pack — 200 Bands', bands: 200 },
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const body = await req.json()
    const { customMessage, verse, color, email, replaces } = body

    // Preferred shape: items: [{ id, qty }]. Fall back to the old single-type body.
    let items: { id: string; qty: number; size?: string }[] = Array.isArray(body.items) ? body.items : []
    if (items.length === 0 && body.type) {
      items = [{ id: body.type === 'custom' ? 'custom' : 'standard', qty: body.quantity || 1 }]
    }

    // Keep only known products with a positive quantity — never trust client prices.
    items = items
      .filter(i => i && CATALOG[i.id] && Number(i.qty) > 0)
      .map(i => ({ id: i.id, qty: Math.floor(Number(i.qty)), size: i.size ? String(i.size).toUpperCase().slice(0, 2) : undefined }))

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Total standard bands → automatic multi-band discount tier.
    const standardQty = items.filter(i => i.id === 'standard').reduce((s, i) => s + i.qty, 0)

    // Fetch needed prices (cents) from the editable site_config table.
    const neededKeys = new Set(items.map(i => CATALOG[i.id].key))
    if (standardQty > 0) { neededKeys.add('band_price_single'); neededKeys.add('band_price_3pack'); neededKeys.add('band_price_5pack') }
    const prices: Record<string, number> = {}
    await Promise.all([...neededKeys].map(async k => { prices[k] = await getSiteConfig(k) }))

    // Per-band price for standard bands at the current quantity tier.
    const standardUnit = standardQty >= 5
      ? Math.round(prices['band_price_5pack'] / 5)
      : standardQty >= 3
        ? Math.round(prices['band_price_3pack'] / 3)
        : prices['band_price_single']

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(i => {
      const unit = i.id === 'standard' ? standardUnit : prices[CATALOG[i.id].key]
      const name = CATALOG[i.id].name + (i.size ? ` (${i.size})` : '')
      return {
        quantity: i.qty,
        price_data: {
          currency: 'usd',
          unit_amount: unit,
          tax_behavior: 'exclusive' as const, // tax added on top (US sales tax)
          product_data: { name, tax_code: 'txcd_99999999' }, // General - Tangible Goods
        },
      }
    })

    const shippingCost = await getSiteConfig('shipping_cost_standard')

    const hasCustom = items.some(i => i.id === 'custom')
    const totalBands = items.reduce((sum, i) => sum + i.qty * CATALOG[i.id].bands, 0)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true,
      // Stripe Tax. Off until STRIPE_TAX_ENABLED=true so it can't break checkout
      // before Tax is configured (origin address + registrations) in the dashboard.
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === 'true' },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store`,
      customer_email: email || undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      // Shipping pulled from site_config (omit when free).
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
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
