import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteConfig } from '@/lib/getSiteConfig'

// Cart product id → site_config price key + display name + bands it represents.
const CATALOG: Record<string, { key: string; name: string; bands: number }> = {
  standard: { key: 'band_price_single', name: 'PrayerBand', bands: 1 },
  custom: { key: 'band_price_custom', name: 'Custom PrayerBand', bands: 1 },
  'pack-3': { key: 'band_price_3pack', name: '3-Pack — 3 Bands', bands: 3 },
  'pack-5': { key: 'band_price_5pack', name: '5-Pack — 5 Bands', bands: 5 },
  'pack-50': { key: 'pack_price_50', name: 'Starter Pack — 50 Bands', bands: 50 },
  'pack-100': { key: 'pack_price_100', name: 'Community Pack — 100 Bands', bands: 100 },
  'pack-200': { key: 'pack_price_200', name: 'Mission Pack — 200 Bands', bands: 200 },
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const body = await req.json()
    const { customMessage, verse, color, email } = body

    // Preferred shape: items: [{ id, qty }]. Fall back to the old single-type body.
    let items: { id: string; qty: number }[] = Array.isArray(body.items) ? body.items : []
    if (items.length === 0 && body.type) {
      items = [{ id: body.type === 'custom' ? 'custom' : 'standard', qty: body.quantity || 1 }]
    }

    // Keep only known products with a positive quantity — never trust client prices.
    items = items
      .filter(i => i && CATALOG[i.id] && Number(i.qty) > 0)
      .map(i => ({ id: i.id, qty: Math.floor(Number(i.qty)) }))

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Fetch each needed price (cents) from the editable site_config table.
    const uniqueKeys = [...new Set(items.map(i => CATALOG[i.id].key))]
    const prices: Record<string, number> = {}
    await Promise.all(uniqueKeys.map(async k => { prices[k] = await getSiteConfig(k) }))

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: 'usd',
        unit_amount: prices[CATALOG[i.id].key],
        product_data: { name: CATALOG[i.id].name },
      },
    }))

    const shippingCost = await getSiteConfig('shipping_cost_standard')

    const hasCustom = items.some(i => i.id === 'custom')
    const totalBands = items.reduce((sum, i) => sum + i.qty * CATALOG[i.id].bands, 0)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store`,
      customer_email: email || undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      // Shipping pulled from site_config (omit when free).
      shipping_options: shippingCost > 0
        ? [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: shippingCost, currency: 'usd' }, display_name: 'Standard Shipping' } }]
        : undefined,
      metadata: {
        type: hasCustom ? 'custom' : 'standard',
        quantity: String(totalBands),
        customMessage: customMessage || '',
        verse: verse || '',
        color: color || 'blue',
        items: JSON.stringify(items),
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
