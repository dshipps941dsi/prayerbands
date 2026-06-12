import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Resolve the authenticated user from the session cookie — never trust a
  // client-supplied user id for billing.
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No-op: this route only reads the session.
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { planId, bandColor, bandDesign } = await req.json()

    // Pull pricing from the DB so amounts can't be tampered with client-side.
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 })
    }

    const color = bandColor || 'sky'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email || undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(Number(plan.total_price) * 100),
            recurring: {
              interval: 'month',
              interval_count: plan.interval_months,
            },
            product_data: {
              name: `${plan.name} — Prayer Bands Subscription`,
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'],
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}&subscription=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscribe`,
      metadata: {
        kind: 'subscription',
        planId: plan.id,
        bandColor: color,
        bandDesign: bandDesign || '',
        user_id: user.id,
      },
      // Mirror onto the subscription so renewal invoices carry the same context.
      subscription_data: {
        metadata: {
          planId: plan.id,
          bandColor: color,
          bandDesign: bandDesign || '',
          user_id: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Subscription checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
