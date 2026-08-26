import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { recordCredit, creditExpiresAt } from '@/lib/credit'
import { getSiteConfig } from '@/lib/getSiteConfig'

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

    // Idempotency: if this session is already recorded, stop — avoids duplicate
    // emails AND double stock decrement when Stripe retries the webhook.
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()
    if (existingOrder) {
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
        // sessionShipping() knows every field name Stripe has used; the two paths
        // that used to be inlined here are both gone in the current API version,
        // so every order was being saved with no address at all.
        shipping_address: sessionShipping(session).address || null,
        order_metadata: session.metadata,
        org_id: session.metadata?.org_id || null,
      })

      await settleCredit(supabase, session)

      // Decrement catalog stock and flag any backordered lines.
      await applyInventory(supabase, session)

      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const email = session.customer_details?.email
      const name = session.customer_details?.name || 'Friend'
      const amount = ((session.amount_total || 0) / 100).toFixed(2)
      const qty = session.metadata?.quantity || '1'
      const type = session.metadata?.type || 'standard'

      if (email) {
        await resend.emails.send({
          from: 'Prayer Bands <bands@prayerbands.com>',
          to: [email],
          subject: '✝ Your Prayer Bands Order is Confirmed',
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
        from: 'Prayer Bands <bands@prayerbands.com>',
        to: ['dshipps941@gmail.com'],
        subject: `✝ New Order — ${qty}x ${type} band — $${amount}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
            <h2 style="color:#1a5fa0">New Prayer Bands Order ✝</h2>
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

// Decrement product_variants stock for a completed order and flag backordered
// lines (ordered qty exceeded stock). Safe no-op if the catalog isn't in use.
async function applyInventory(supabase: any, session: Stripe.Checkout.Session) {
  try {
    const raw = session.metadata?.items
    if (!raw) return
    let items: { id: string; qty: number; size?: string }[] = []
    try { items = JSON.parse(raw) } catch { return }
    if (!Array.isArray(items) || items.length === 0) return

    const slugs = [...new Set(items.map(i => i.id))]
    const { data: products } = await supabase.from('products').select('id, slug').in('slug', slugs)
    const idBySlug = new Map((products ?? []).map((p: any) => [p.slug, p.id]))
    if (idBySlug.size === 0) return // catalog not seeded — nothing to track

    const backorderItems: { slug: string; size: string; ordered: number; available: number }[] = []
    for (const it of items) {
      const productId = idBySlug.get(it.id)
      if (!productId) continue
      const size = it.size ? String(it.size).toUpperCase().slice(0, 2) : ''
      const qty = Number(it.qty) || 0
      const { data: variant } = await supabase
        .from('product_variants')
        .select('id, stock')
        .eq('product_id', productId)
        .eq('size', size)
        .maybeSingle()
      if (!variant) continue
      if (variant.stock < qty) backorderItems.push({ slug: it.id, size, ordered: qty, available: variant.stock })
      await supabase.from('product_variants').update({ stock: Math.max(0, variant.stock - qty) }).eq('id', variant.id)
    }

    if (backorderItems.length > 0) {
      await supabase
        .from('orders')
        .update({ order_metadata: { ...(session.metadata || {}), backordered: true, backorder_items: backorderItems } })
        .eq('stripe_session_id', session.id)
    }
  } catch (e) {
    console.error('Inventory update error:', e)
  }
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
// Credit-based subscriptions: each paid cycle drops store credit worth the full
// retail value of the plan's bands into the subscriber's account. It never
// expires; they redeem it whenever someone needs prayer (no auto-shipment).
// Idempotent on the invoice/session id, so a replayed webhook can't double-credit.
async function grantSubscriptionCredit(
  supabase: any,
  userId: string,
  plan: any,
  idemKey: string,
): Promise<{ recorded: boolean; duplicate: boolean }> {
  const { data: cfg } = await supabase.from('site_config').select('value').eq('key', 'band_price_single').maybeSingle()
  const retail = parseInt(cfg?.value ?? '1199', 10) || 1199
  const bands = plan?.bands_per_cycle || 1
  return recordCredit(supabase, {
    user_id: userId,
    delta_cents: retail * bands,
    reason: 'subscription',
    stripe_session_id: idemKey,
    expires_at: null,
    note: `${plan?.name ?? 'Subscription'} — ${bands} band${bands === 1 ? '' : 's'} of credit`,
  })
}

async function handleSubscriptionCheckout(
  stripe: Stripe,
  supabase: any,
  session: Stripe.Checkout.Session,
) {
  try {
    const planId = session.metadata?.planId
    const userId = session.metadata?.user_id
    const bandColor = session.metadata?.bandColor || 'sky'
    const bandDesign = session.metadata?.bandDesign || null
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
          band_design: bandDesign,
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

    // First cycle: drop the plan's credit into their account (no auto-shipment —
    // they redeem it whenever someone needs prayer). Idempotent on the invoice id.
    const idemKey = typeof session.invoice === 'string' ? session.invoice : session.id
    const credited = await grantSubscriptionCredit(supabase, userId, plan, idemKey)
    if (credited.recorded && !credited.duplicate) {
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
      .select('name, bands_per_cycle')
      .eq('id', sub.plan_id)
      .single()

    // Credit this cycle — idempotent on the invoice id, so a replayed renewal
    // can't double-credit. Nothing ships; the subscriber redeems as needs arise.
    const credited = await grantSubscriptionCredit(supabase, sub.user_id, plan, invoice.id as string)
    if (!credited.recorded || credited.duplicate) return

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
      // A cancel-at-period-end subscription keeps status 'active' until the
      // period ends, so capture the scheduled-cancel flag for the dashboard.
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
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
    const planName = plan?.name || 'Prayer Bands Subscription'
    const bands = plan?.bands_per_cycle || 1
    const cadence = plan?.interval_months > 1 ? `every ${plan.interval_months} months` : 'every month'

    if (email) {
      await resend.emails.send({
        from: 'Prayer Bands <bands@prayerbands.com>',
        to: [email],
        subject: '✝ Your Prayer Bands Subscription is Active',
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
      from: 'Prayer Bands <bands@prayerbands.com>',
      to: ['dshipps941@gmail.com'],
      subject: `✝ New Subscription — ${planName} (${bands}x ${bandColor})`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#1a5fa0">New Prayer Bands Subscription ✝</h2>
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

// Referral credit is earned when Stripe confirms payment, not when the checkout
// page opens — the old behaviour recorded abandoned carts as if they were sales.
// Redemption is recorded here too, so both sides of the ledger land in the same
// place and the same webhook retry protects them.
async function settleCredit(supabase: any, session: any) {
  const sessionId = session.id as string

  // 1. The buyer spent credit at checkout. create-checkout applied it as a
  //    one-off discount and stamped the amount here.
  const spent = parseInt(session.metadata?.credit_applied_cents || '0', 10) || 0
  const spender = session.metadata?.credit_user_id || null
  if (spent > 0 && spender) {
    try {
      await recordCredit(supabase, {
        user_id: spender,
        delta_cents: -Math.abs(spent),
        reason: 'redemption',
        stripe_session_id: sessionId,
        note: 'Applied at checkout',
      })
    } catch (e) {
      console.error('[stripe-webhook] credit redemption error:', e)
    }
  }

  // 2. Somebody referred this order. Credit them.
  let referrerUserId = session.metadata?.referrer_user_id || null

  // create-checkout can only read a standing sponsorship for a buyer who was
  // signed in. Plenty of people check out logged out and pay with the address
  // their account uses, so resolve it here from the email Stripe collected —
  // otherwise the sponsor loses the credit purely over a session cookie.
  if (!referrerUserId) {
    try {
      const buyerEmail = session.customer_details?.email || session.customer_email || null
      if (buyerEmail) {
        const { data: buyer } = await supabase
          .from('profiles')
          .select('id, upline_user_id')
          .ilike('email', buyerEmail)
          .maybeSingle()
        // Never credit somebody for their own order.
        if (buyer?.upline_user_id && buyer.upline_user_id !== buyer.id) {
          referrerUserId = buyer.upline_user_id as string
        }
      }
    } catch (e) {
      console.error('[stripe-webhook] upline lookup failed:', e)
    }
  }

  if (!referrerUserId) return

  try {
    const creditCents = await getSiteConfig('referral_credit_cents')
    if (!creditCents || creditCents <= 0) return

    const { data: order } = await supabase
      .from('orders').select('id').eq('stripe_session_id', sessionId).maybeSingle()

    const { duplicate } = await recordCredit(supabase, {
      user_id: referrerUserId,
      delta_cents: creditCents,
      reason: 'referral',
      order_id: order?.id ?? null,
      stripe_session_id: sessionId,
      note: 'Referral reward',
      expires_at: creditExpiresAt(),
    })
    // A retry finds the credit already recorded; the referral row is updated
    // either way so its status cannot drift from the ledger.
    if (duplicate) return

    const { data: updatedRefs, error: refErr } = await supabase
      .from('referrals')
      .update({
        status: 'earned',
        order_id: order?.id ?? null,
        credit_cents: creditCents,
        earned_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', sessionId)
      .select('id')
    if (refErr) console.error('[stripe-webhook] referral update error:', refErr)

    // No row to update when the referrer was resolved here rather than at
    // checkout — the credit is in the ledger either way, but without this the
    // referrals table would have no record of the sale that earned it.
    if (!refErr && (!updatedRefs || updatedRefs.length === 0)) {
      const { error: insErr } = await supabase.from('referrals').insert({
        referrer_user_id: referrerUserId,
        stripe_session_id: sessionId,
        status: 'earned',
        order_id: order?.id ?? null,
        credit_cents: creditCents,
        earned_at: new Date().toISOString(),
      })
      if (insErr) console.error('[stripe-webhook] referral insert error:', insErr)
    }
  } catch (e) {
    console.error('[stripe-webhook] referral credit error:', e)
  }
}
