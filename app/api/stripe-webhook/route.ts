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

    // Subscription checkouts are recorded separately from one-time orders.
    if (session.mode === 'subscription' || session.metadata?.kind === 'subscription') {
      await handleSubscriptionCheckout(stripe, supabase, session)
      return NextResponse.json({ received: true })
    }

    try {
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
        org_id: session.metadata?.org_id || null,
      })

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
  } else if (event.type === 'invoice.payment_succeeded') {
    await handleInvoicePaid(stripe, supabase, event.data.object as Stripe.Invoice)
  } else if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionCancelled(supabase, event.data.object as Stripe.Subscription)
  } else if (event.type === 'customer.subscription.updated') {
    await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
  }

  return NextResponse.json({ received: true })
}

const toISO = (unixSeconds: number | null | undefined) =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null

const shippingFields = (name: any, addr: any) => ({
  shipping_name: name || null,
  shipping_line1: addr?.line1 || null,
  shipping_line2: addr?.line2 || null,
  shipping_city: addr?.city || null,
  shipping_state: addr?.state || null,
  shipping_zip: addr?.postal_code || null,
  shipping_country: addr?.country || 'US',
})

// The billing period moved from the subscription to its first item in Stripe's
// 2025 API versions — read whichever is present.
const subPeriod = (subscription: any) => {
  const item = subscription?.items?.data?.[0]
  return {
    start: toISO(subscription?.current_period_start ?? item?.current_period_start),
    end: toISO(subscription?.current_period_end ?? item?.current_period_end),
  }
}

// invoice.subscription was removed from the top level in newer API versions.
const invoiceSubId = (invoice: any): string | null => {
  const s =
    invoice?.subscription ??
    invoice?.parent?.subscription_details?.subscription ??
    invoice?.lines?.data?.[0]?.subscription ??
    invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription
  return typeof s === 'string' ? s : s?.id || null
}

// Stripe has used session.shipping, session.shipping_details, and
// collected_information.shipping_details across versions — try each.
const sessionShipping = (session: any) => {
  const sd =
    session?.shipping_details ||
    session?.shipping ||
    session?.collected_information?.shipping_details ||
    {}
  return {
    name: sd?.name || session?.customer_details?.name,
    address: sd?.address,
  }
}

// Creates the subscription record + its first shipment when checkout completes.
async function handleSubscriptionCheckout(
  stripe: Stripe,
  supabase: any,
  session: Stripe.Checkout.Session,
) {
  try {
    const planId = session.metadata?.planId
    const userId = session.metadata?.user_id
    const bandColor = session.metadata?.bandColor || 'sky'
    if (!planId || !userId) {
      console.error('Subscription checkout missing planId/user_id metadata')
      return
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    const shipInfo = sessionShipping(session)
    const ship = shippingFields(shipInfo.name, shipInfo.address)
    const period = subPeriod(subscription)

    // Upsert on the unique stripe_subscription_id so a replayed/retried
    // checkout.session.completed event can't create a duplicate subscription.
    const { data: subRow, error: subErr } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
          status: 'active',
          band_color: bandColor,
          ...ship,
          current_period_start: period.start,
          current_period_end: period.end,
          next_ship_date: period.end,
        },
        { onConflict: 'stripe_subscription_id' },
      )
      .select('id')
      .single()

    if (subErr) {
      console.error('Subscription upsert error:', subErr)
      return
    }

    // First shipment — we have the shipping address here at checkout time.
    // Upsert on stripe_invoice_id so a duplicate event can't ship twice.
    const { data: shipInserted } = await supabase
      .from('subscription_shipments')
      .upsert(
        {
          subscription_id: subRow.id,
          user_id: userId,
          status: 'pending',
          bands_quantity: plan?.bands_per_cycle || 1,
          band_color: bandColor,
          ...ship,
          stripe_invoice_id: typeof session.invoice === 'string' ? session.invoice : null,
        },
        { onConflict: 'stripe_invoice_id', ignoreDuplicates: true },
      )
      .select('id')

    // Only email on the first delivery — a replayed event inserts no new
    // shipment row, so skip the activation emails to avoid duplicates.
    if (shipInserted && shipInserted.length > 0) {
      await sendSubscriptionEmails(session, plan, bandColor)
    }
  } catch (err) {
    console.error('Subscription checkout processing error:', err)
  }
}

// Each successful renewal invoice creates the next shipment.
async function handleInvoicePaid(stripe: Stripe, supabase: any, invoice: Stripe.Invoice) {
  try {
    // The first invoice ('subscription_create') is already handled at checkout.
    if (invoice.billing_reason !== 'subscription_cycle') return
    const subId = invoiceSubId(invoice)
    if (!subId) return

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subId)
      .single()
    if (!sub) {
      console.error('Renewal invoice for unknown subscription:', subId)
      return
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('bands_per_cycle')
      .eq('id', sub.plan_id)
      .single()

    // Upsert on stripe_invoice_id so a retried/replayed renewal invoice can't
    // create a duplicate shipment for the same billing cycle. ignoreDuplicates
    // means a repeat delivery is DO NOTHING and returns no row — we use that to
    // skip the period update + renewal email so retries stay fully no-op.
    const { data: shipInserted, error: shipErr } = await supabase
      .from('subscription_shipments')
      .upsert(
        {
          subscription_id: sub.id,
          user_id: sub.user_id,
          status: 'pending',
          bands_quantity: plan?.bands_per_cycle || 1,
          band_color: sub.band_color,
          shipping_name: sub.shipping_name,
          shipping_line1: sub.shipping_line1,
          shipping_line2: sub.shipping_line2,
          shipping_city: sub.shipping_city,
          shipping_state: sub.shipping_state,
          shipping_zip: sub.shipping_zip,
          shipping_country: sub.shipping_country,
          stripe_invoice_id: invoice.id,
        },
        { onConflict: 'stripe_invoice_id', ignoreDuplicates: true },
      )
      .select('id')

    if (shipErr) {
      console.error('Renewal shipment upsert error:', shipErr)
      return
    }
    // Already processed this invoice — nothing new inserted, so stop here.
    if (!shipInserted || shipInserted.length === 0) return

    // Advance the stored cycle window.
    const subscription = await stripe.subscriptions.retrieve(subId)
    const period = subPeriod(subscription)
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: period.start,
        current_period_end: period.end,
        next_ship_date: period.end,
      })
      .eq('id', sub.id)

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: ['dshipps941@gmail.com'],
        subject: `✝ Subscription renewal — ${plan?.bands_per_cycle || 1}x ${sub.band_color} band to ship`,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#1a5fa0">Subscription Renewal ✝</h2>
          <p><strong>Ship to:</strong> ${sub.shipping_name || 'N/A'}</p>
          <p><strong>Bands:</strong> ${plan?.bands_per_cycle || 1} × ${sub.band_color}</p>
          <p><strong>Plan:</strong> ${sub.plan_id}</p>
          <a href="https://dashboard.stripe.com/subscriptions" style="background:#2b7bc4;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View in Stripe →</a>
        </div>`,
      })
    } catch (e) {
      console.error('Renewal email error:', e)
    }
  } catch (err) {
    console.error('Invoice processing error:', err)
  }
}

async function handleSubscriptionCancelled(supabase: any, subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    paused: 'paused',
    canceled: 'cancelled',
  }
  const status = statusMap[subscription.status]
  if (!status) return
  const period = subPeriod(subscription)
  await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: period.start,
      current_period_end: period.end,
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function sendSubscriptionEmails(session: Stripe.Checkout.Session, plan: any, bandColor: string) {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const email = session.customer_details?.email
    const name = session.customer_details?.name || 'Friend'
    const planName = plan?.name || 'PrayerBands Subscription'
    const bands = plan?.bands_per_cycle || 1
    const cadence = plan?.interval_months > 1 ? `every ${plan.interval_months} months` : 'every month'

    if (email) {
      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: [email],
        subject: '✝ Your PrayerBands Subscription is Active',
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
            <div style="background:#0d3d6e;padding:32px;text-align:center">
              <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Subscription Active!</h1>
              <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0">Thank you, ${name}</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                You're now on the <strong>${planName}</strong> — ${bands} ${bandColor} band${bands > 1 ? 's' : ''} delivered ${cadence}.
                Your first shipment is being prepared and will ship within 3-5 business days. ✝
              </p>
              <div style="background:#e8f4fd;border-radius:10px;padding:20px;margin:20px 0">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#2b7bc4;margin-bottom:12px">Your Rhythm of Prayer</div>
                <div style="font-size:14px;color:#4a5568;line-height:2">
                  1. Bands arrive ${cadence}, NFC-programmed and ready<br>
                  2. Pray over each band<br>
                  3. Give it away as a prayer passed forward<br>
                  4. Watch your prayers travel the world
                </div>
              </div>
              <div style="text-align:center;margin:28px 0">
                <a href="https://prayerbands.com/dashboard"
                   style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                  View Your Dashboard ✝
                </a>
              </div>
              <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
                "Pray without ceasing." — 1 Thessalonians 5:17
              </p>
            </div>
          </div>
        `,
      })
    }

    await resend.emails.send({
      from: 'PrayerBands <bands@prayerbands.com>',
      to: ['dshipps941@gmail.com'],
      subject: `✝ New Subscription — ${planName} (${bands}x ${bandColor})`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#1a5fa0">New PrayerBands Subscription ✝</h2>
          <p><strong>Customer:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Bands/cycle:</strong> ${bands} × ${bandColor}</p>
          <p><strong>Cadence:</strong> ${cadence}</p>
          <a href="https://dashboard.stripe.com/subscriptions" style="background:#2b7bc4;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View in Stripe →</a>
        </div>
      `,
    })
  } catch (e) {
    console.error('Subscription email error:', e)
  }
}
