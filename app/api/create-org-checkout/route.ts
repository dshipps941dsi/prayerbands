import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { loadChurchTiers } from '@/lib/church-pricing-load'
import { churchTierFor, churchMinQty, MAX_CHURCH_QTY } from '@/lib/church-pricing'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  try {
    const { quantity, orgId, orgName, prefix } = await req.json()

    if (!quantity || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      return NextResponse.json({ error: 'Enter a whole number of bands.' }, { status: 400 })
    }
    if (qty > MAX_CHURCH_QTY) {
      return NextResponse.json({ error: 'That is more bands than one online order can take. Please contact us to place an order this size.' }, { status: 400 })
    }

    // The price per band comes from the tiers set in Admin > Pricing, the
    // same ones the church dashboard shows, so what is shown is what is
    // charged. The price is always worked out here, never taken from the
    // browser.
    const { tiers } = await loadChurchTiers(createServiceClient())
    const tier = churchTierFor(qty, tiers)
    if (!tier) {
      return NextResponse.json({ error: 'The minimum order is ' + churchMinQty(tiers).toLocaleString('en-US') + ' bands.' }, { status: 400 })
    }
    const unitAmount = tier.cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: orgName + ' Prayer Bands (' + prefix + '-XXXXX)',
              description: qty + ' NFC bands with ' + prefix + ' prefix',
            },
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      success_url: process.env.NEXT_PUBLIC_SITE_URL + '/org/dashboard?tab=Orders&success=true',
      cancel_url: process.env.NEXT_PUBLIC_SITE_URL + '/org/dashboard?tab=Orders',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      metadata: {
        org_id: orgId,
        org_name: orgName,
        prefix,
        quantity: qty.toString(),
        type: 'org_order',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Org checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
