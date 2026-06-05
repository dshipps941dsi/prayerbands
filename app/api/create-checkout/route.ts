import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const { type, quantity, customMessage, verse, color, email } = await req.json()

    const priceId = type === 'custom'
      ? process.env.STRIPE_CUSTOM_PRICE_ID!
      : process.env.STRIPE_STANDARD_PRICE_ID!

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1,
        }
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/store`,
      customer_email: email || undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
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
