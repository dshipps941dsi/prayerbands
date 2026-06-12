import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const { quantity, orgId, orgName, prefix } = await req.json()

    if (!quantity || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const pricePerBand = quantity >= 500 ? 3.75
      : quantity >= 250 ? 4.00
      : quantity >= 100 ? 4.20
      : 4.75

    const unitAmount = Math.round(pricePerBand * 100)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: `${orgName} Prayer Bands (${prefix}-XXXXX)`,
              description: `${quantity} laser-engraved NFC bands with ${prefix} prefix`,
            },
          },
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/org/dashboard?tab=Orders&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/org/dashboard?tab=Orders`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      metadata: {
        org_id: orgId,
        org_name: orgName,
        prefix,
        quantity: quantity.toString(),
        type: 'org_order',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Org checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
