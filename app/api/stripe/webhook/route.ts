/**
 * Stripe -> GA4 purchase bridge.
 *
 * Fires a GA4 `purchase` event when Stripe confirms payment, rather than from
 * the /order-success page. This matters: the two 27 Aug orders produced no
 * page_view on /order-success at all, which means at least one buyer never made
 * it back from Stripe's hosted checkout. A server-side webhook records the sale
 * whether or not the customer's browser ever returns.
 *
 * This is a separate endpoint from the webhook that handles credit/fulfilment,
 * deliberately — Stripe delivers the same event to every registered endpoint,
 * so analytics can never break an order. Register it alongside the existing one.
 *
 * Route:  POST /api/stripe/webhook
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendGa4Purchase, itemsFromLineItems } from '@/lib/ga4';
import { createServiceClient } from '@/lib/supabase/server';

// Stripe signature verification needs the raw body and Node crypto.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_GA4_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[ga4-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Only count money that actually landed. `checkout.session.completed` also
  // fires for unpaid sessions when the payment method settles asynchronously.
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, skipped: 'not paid' });
  }

  try {
    await recordPurchase(session);
  } catch (err) {
    // Never fail the webhook over analytics — Stripe would retry the whole
    // event, and a 500 here looks like a delivery failure in your dashboard.
    console.error('[ga4-webhook] GA4 send failed', err);
  }

  return NextResponse.json({ received: true });
}

async function recordPurchase(session: Stripe.Checkout.Session) {
  const md = (session.metadata ?? {}) as Record<string, string>;

  // client_id is what joins this purchase to the visitor GA4 already knows.
  // Without it GA4 invents a brand-new user and the sale is attributed to
  // nothing. See SETUP.md step 2 for how it gets here.
  const clientId = md.ga_client_id;
  if (!clientId) {
    console.warn(
      `[ga4-webhook] no ga_client_id on ${session.id} — recording as an unattributed user`
    );
  }

  // The webhook payload doesn't include line items, so fetch them. This is the
  // authoritative source for names, sizes, quantities and post-tier unit prices.
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  });

  let metadataItems: Array<{ id: string; qty: number; size?: string }> = [];
  try {
    const parsed = JSON.parse(md.items || '[]');
    if (Array.isArray(parsed)) metadataItems = parsed;
  } catch {
    console.warn('[ga4-webhook] metadata.items was not valid JSON');
  }

  // Current display names, so a product that has been renamed since the order
  // still reports under one name in GA4 rather than forking into two rows.
  const nameBySlug = await currentProductNames(
    metadataItems.map((it) => it.id)
  );

  const items = itemsFromLineItems(
    lineItems.data,
    metadataItems,
    md.type === 'custom' ? 'Custom' : 'Standard',
    nameBySlug
  );

  const currency = (session.currency ?? 'usd').toUpperCase();
  const total = (session.amount_total ?? 0) / 100;
  const shipping = (session.total_details?.amount_shipping ?? 0) / 100;
  const tax = (session.total_details?.amount_tax ?? 0) / 100;
  const discount = (session.total_details?.amount_discount ?? 0) / 100;

  // Name the discount so you can tell referral rewards from store credit in the
  // Ecommerce reports, instead of a single anonymous "discount" bucket.
  const coupon =
    discount > 0
      ? md.referral_code || (md.credit_applied_cents ? 'store-credit' : 'discount')
      : undefined;

  await sendGa4Purchase({
    clientId: clientId || fallbackClientId(session.id),
    sessionId: md.ga_session_id || undefined,
    transactionId: session.id, // GA4 dedupes on this if the event ever repeats
    value: total,              // what the customer actually paid, incl. shipping
    currency,
    shipping,
    tax,
    coupon,
    items,
    timestampMicros: session.created * 1_000_000,
  });

  console.log(
    `[ga4-webhook] purchase sent: ${session.id} ${currency} ${total} (${items.length} line(s))`
  );
}

/**
 * Look up current names for the given product slugs. Best-effort: if the query
 * fails we fall back to the names Stripe recorded on the line items, which are
 * correct for that order even if they're stale.
 */
async function currentProductNames(
  slugs: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const admin = createServiceClient();
    const { data } = await admin
      .from('products')
      .select('slug, name')
      .in('slug', unique);
    return Object.fromEntries(
      (data ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name])
    );
  } catch (err) {
    console.warn('[ga4-webhook] product name lookup failed, using Stripe names', err);
    return {};
  }
}

/**
 * Last resort when the browser never handed us a client_id. The purchase gets
 * recorded (revenue right, items right) but lands on a synthetic user with no
 * traffic source. Deterministic on session id so a Stripe retry doesn't mint a
 * second phantom user.
 */
function fallbackClientId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return `${hash}.${Math.floor(Date.now() / 1000)}`;
}
