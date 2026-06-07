import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSiteConfig } from '@/lib/getSiteConfig'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const { type, quantity, customMessage, verse, color, email } = await req.json()
    const qty = quantity || 1

    // Pricing comes from the editable site_config table (cents) at request time.
    const [bandPrice, shippingCost] = await Promise.all([
      getSiteConfig('band_price_single'),
      getSiteConfig('shipping_cost_standard'),
    ])

    // Standard bands are priced dynamically from site_config. Custom bands keep
    // their dedicated Stripe price (no custom price key exists in site_config).
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = type === 'custom'
      ? [{ price: process.env.STRIPE_CUSTOM_PRICE_ID!, quantity: qty }]
      : [{
          quantity: qty,
          price_data: {
            currency: 'usd',
            unit_amount: bandPrice,
            product_data: { name: 'PrayerBand' },
          },
        }]

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
        type,
        quantity: quantity?.toString() || '1',
        customMessage: customMessage || '',
        verse: verse || '',
        color: color || 'blue',
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
