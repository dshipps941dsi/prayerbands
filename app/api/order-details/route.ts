import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'No session ID' }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  try {
    // Get the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const customerEmail = session.customer_details?.email ?? null
    const value = (session.amount_total ?? 0) / 100
    const currency = (session.currency ?? 'usd').toUpperCase()

    // Find the order in Supabase by matching the Stripe session ID or customer email
    const { data: order } = await supabase
      .from('orders')
      .select('id, customer_email, order_metadata')
      .eq('stripe_session_id', sessionId)
      .single()

    if (!order) {
      // Order not yet recorded by webhook — return session data only
      return NextResponse.json({
        email: customerEmail,
        quantity: session.metadata?.quantity ?? 1,
        bands: [],
        value,
        currency,
      })
    }

    // Get the band IDs assigned to this order
    const { data: orderBands } = await supabase
      .from('order_bands')
      .select('band_id')
      .eq('order_id', order.id)

    const bands = (orderBands ?? []).map((b: any) => b.band_id)

    return NextResponse.json({
      email: customerEmail,
      quantity: order.order_metadata?.quantity ?? 1,
      bands,
      value,
      currency,
    })
  } catch (err: any) {
    console.error('Order details error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
