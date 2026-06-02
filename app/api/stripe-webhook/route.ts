import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      // Save order to Supabase
      await supabase.from('orders').insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
        amount_total: session.amount_total,
        payment_status: session.payment_status,
        status: 'pending',
        has_custom_bands: session.metadata?.type === 'custom',
        shipping_address: (session as any).shipping?.address || (session as any).shipping_details?.address || null,
        order_metadata: session.metadata,
      })

      // Send confirmation email
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const email = session.customer_details?.email
      const name = session.customer_details?.name || 'Friend'
      const amount = ((session.amount_total || 0) / 100).toFixed(2)
      const qty = session.metadata?.quantity || '1'
      const type = session.metadata?.type || 'standard'

      if (email) {
        await resend.emails.send({
          from: 'PrayerBands <bands@prayerbands.com>',
          to: [email],
          subject: '✝ Your PrayerBands Order is Confirmed',
          html: `
            <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
              <div style="background:#0d3d6e;padding:32px;text-align:center">
                <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
                <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Order Confirmed!</h1>
                <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0">Thank you, ${name}</p>
              </div>
              <div style="padding:32px">
                <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                  Your ${qty} ${type} PrayerBand${parseInt(qty)>1?'s':''} 
                  ($${amount}) will ship within 3-5 business days. Each band comes 
                  pre-programmed with a unique NFC chip — ready to give away. ✝
                </p>
                <div style="background:#e8f4fd;border-radius:10px;padding:20px;margin:20px 0">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#2b7bc4;margin-bottom:12px">What Happens Next</div>
                  <div style="font-size:14px;color:#4a5568;line-height:2">
                    1. Your bands ship within 3-5 business days<br>
                    2. Each band arrives NFC-programmed and ready<br>
                    3. Give them away as a prayer<br>
                    4. Watch your prayer travel the world
                  </div>
                </div>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://prayerbands.com/dashboard" 
                     style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                    View Your Dashboard ✝
                  </a>
                </div>
                <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
                  "Go into all the world and preach the gospel." — Mark 16:15
                </p>
              </div>
            </div>
          `
        })
      }

      // Also notify you
      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: ['dshipps941@gmail.com'],
        subject: `✝ New Order — ${qty}x ${type} band — $${amount}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
            <h2 style="color:#1a5fa0">New PrayerBands Order ✝</h2>
            <p><strong>Customer:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Quantity:</strong> ${qty}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            <p><strong>Message:</strong> ${session.metadata?.customMessage || 'None'}</p>
            <p><strong>Verse:</strong> ${session.metadata?.verse || 'None'}</p>
            <a href="https://dashboard.stripe.com/payments" style="background:#2b7bc4;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View in Stripe →</a>
          </div>
        `
      })

    } catch (err) {
      console.error('Order processing error:', err)
    }
  }

  return NextResponse.json({ received: true })
}