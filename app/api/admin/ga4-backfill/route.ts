/**
 * ONE-TIME admin route: replay recent paid Stripe checkouts into GA4.
 *
 * Exists because the 27 Aug orders were placed before purchase tracking was
 * wired up, and GA4's Measurement Protocol refuses events older than 72 hours.
 * This does the same job as scripts/backfill-ga4-purchases.ts, but over HTTP,
 * so it can be run from a browser without a terminal.
 *
 *   Preview (sends nothing):  https://prayerbands.com/api/admin/ga4-backfill
 *   Actually send:            https://prayerbands.com/api/admin/ga4-backfill?send=1
 *
 * Admin-only, same check as the other admin routes.
 *
 * DELETE THIS FILE once the backfill is done. It has no ongoing purpose — the
 * webhook handles every order from here on.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendGa4Purchase, itemsFromLineItems } from '@/lib/ga4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stay just inside GA4's hard 72-hour limit for backdated events.
const MAX_AGE_HOURS = 71;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isTeamAdmin(user))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Default is preview. Sending requires ?send=1 explicitly, so that opening
  // the URL — or a browser prefetching it — can never write to GA4 by accident.
  const send = req.nextUrl.searchParams.get('send') === '1';

  const cutoff = Math.floor(Date.now() / 1000) - MAX_AGE_HOURS * 3600;

  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: cutoff },
  });
  const paid = sessions.data.filter((s) => s.payment_status === 'paid');

  // Current display names, so backfilled orders use the same labels as new
  // ones. The 27 Aug bulk order was placed while slug `gray` was still called
  // "Gray"; it is "Light Grey" now.
  let nameBySlug: Record<string, string> = {};
  try {
    const admin = createServiceClient();
    const { data } = await admin.from('products').select('slug, name');
    nameBySlug = Object.fromEntries(
      (data ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name])
    );
  } catch {
    // Falls back to the names Stripe recorded at purchase time.
  }

  const results: unknown[] = [];

  for (const session of paid) {
    const md = (session.metadata ?? {}) as Record<string, string>;

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });

    let metadataItems: Array<{ id: string; qty: number; size?: string }> = [];
    try {
      const parsed = JSON.parse(md.items || '[]');
      if (Array.isArray(parsed)) metadataItems = parsed;
    } catch {
      // Line items still carry everything that matters.
    }

    const items = itemsFromLineItems(
      lineItems.data,
      metadataItems,
      md.type === 'custom' ? 'Custom' : 'Standard',
      nameBySlug
    );

    const currency = (session.currency ?? 'usd').toUpperCase();
    const total = (session.amount_total ?? 0) / 100;

    const outcome = await sendGa4Purchase({
      clientId: md.ga_client_id || fallbackClientId(session.id),
      sessionId: md.ga_session_id || undefined,
      transactionId: session.id,
      value: total,
      currency,
      shipping: (session.total_details?.amount_shipping ?? 0) / 100,
      tax: (session.total_details?.amount_tax ?? 0) / 100,
      items,
      timestampMicros: session.created * 1_000_000,
      debug: !send, // preview posts to GA4's validation endpoint instead
    });

    results.push({
      transaction_id: session.id,
      placed: new Date(session.created * 1000).toISOString(),
      amount: `${currency} ${total.toFixed(2)}`,
      attributed: md.ga_client_id ? 'yes' : 'no — placed before tracking existed',
      items: items.map(
        (i) =>
          `${i.item_name}${i.item_variant ? ' / ' + i.item_variant : ''} x${i.quantity} @ $${i.price}`
      ),
      http_status: outcome.status,
      validation: outcome.validation ?? undefined,
    });
  }

  return NextResponse.json(
    {
      mode: send ? 'SENT to GA4' : 'PREVIEW ONLY — nothing was sent',
      window: `paid Stripe sessions from the last ${MAX_AGE_HOURS} hours`,
      found: paid.length,
      orders: results,
      next: send
        ? 'Done. Allow a few hours before checking the Ecommerce purchases report. Do not run with ?send=1 again — delete this route.'
        : 'Check the figures above, then re-open this URL with ?send=1 appended to send them.',
    },
    { status: 200 }
  );
}

/**
 * These orders predate the client_id plumbing, so GA4 has no visitor to attach
 * them to. Deterministic on session id so a repeat run doesn't mint a second
 * phantom user. Revenue and items are correct; traffic source will be blank.
 */
function fallbackClientId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return `${hash}.${Math.floor(Date.now() / 1000)}`;
}
