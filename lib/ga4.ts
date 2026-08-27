/**
 * GA4 helpers for Prayer Bands.
 *
 * Two halves:
 *   - readGaIds()      runs in the BROWSER. Pulls the GA4 client_id / session_id
 *                      out of the _ga cookies so they can ride along to Stripe.
 *   - sendGa4Purchase() runs on the SERVER. Posts a `purchase` event to the GA4
 *                      Measurement Protocol.
 *
 * Measurement ID for prayerbands.com: G-YRMGDPW8JQ
 */

export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? 'G-YRMGDPW8JQ';

/* ------------------------------------------------------------------ *
 * CLIENT SIDE
 * ------------------------------------------------------------------ */

export type GaIds = { gaClientId: string; gaSessionId: string };

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * _ga             = "GA1.1.1234567890.1712345678"  -> client_id "1234567890.1712345678"
 * _ga_YRMGDPW8JQ  = "GS1.1.1712345678.3.1.1712345900.0.0.0"       (older format)
 *                 = "GS2.1.s1712345678$o3$g1$t1712345900$j0$l0$h0" (newer format)
 *                   -> session_id 1712345678
 *
 * Both cookie formats are handled because Google has shipped both and a given
 * browser may still be carrying the old one.
 */
export function readGaIds(): GaIds {
  const ga = readCookie('_ga') ?? '';
  const clientId = ga.split('.').slice(2).join('.'); // drop the "GA1.1" prefix

  const streamId = GA4_MEASUREMENT_ID.replace(/^G-/, '');
  const sessionCookie = readCookie(`_ga_${streamId}`) ?? '';
  let sessionId = '';

  if (sessionCookie.startsWith('GS2')) {
    // GS2.1.s<sessionId>$o1$g1$t...
    sessionId = sessionCookie.match(/\bs(\d{6,})/)?.[1] ?? '';
  } else if (sessionCookie.startsWith('GS1')) {
    // GS1.1.<sessionId>.<sessionNumber>....
    sessionId = sessionCookie.split('.')[2] ?? '';
  }

  return { gaClientId: clientId, gaSessionId: sessionId };
}

/* ------------------------------------------------------------------ *
 * SERVER SIDE
 * ------------------------------------------------------------------ */

/**
 * Fallback display names, used only when a line item's description is missing.
 * Your real names come from the `products` table via `price_data.product_data`,
 * so this map should almost never be hit.
 */
export const DESIGN_NAMES: Record<string, string> = {
  standard: 'Standard Band',
  custom: 'Custom Band',
  'pack-50': 'Starter Pack',
  'pack-100': 'Community Pack',
  'pack-200': 'Mission Pack',
};

export function designName(id: string): string {
  return (
    DESIGN_NAMES[id] ??
    id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Split a Stripe line-item description back into name and size.
 * Your checkout builds these as `${product.name} (${size})`, e.g. "Gray (M)".
 */
export function splitDescription(description: string): {
  name: string;
  size?: string;
} {
  const m = description.match(/^(.*?)\s*\(([A-Za-z0-9]{1,3})\)\s*$/);
  return m ? { name: m[1].trim(), size: m[2].toUpperCase() } : { name: description.trim() };
}

/** Minimal shape we need off a Stripe line item — avoids importing Stripe types here. */
export type LineItemLike = {
  description?: string | null;
  quantity?: number | null;
  amount_subtotal?: number | null;
  amount_discount?: number | null;
  price?: { unit_amount?: number | null } | null;
};

/**
 * Build GA4 item rows from Stripe line items.
 *
 * Line items are the authoritative source: the description already carries the
 * real product name and size, and unit_amount already reflects your volume
 * tiers (the 43-band order priced at $10.79, not list $11.99). Session metadata
 * is used only to recover the product slug for item_id, matched by position
 * because your checkout builds line items in the same order as `items`.
 */
export function itemsFromLineItems(
  lineItems: LineItemLike[],
  metadataItems: Array<{ id: string; qty: number; size?: string }> = [],
  category = 'Standard',
  /**
   * Current slug -> name from the `products` table. Pass this whenever you can.
   * A line item's description is a snapshot of the name at purchase time, so
   * after a rename the same product reports under two names forever and GA4 has
   * no way to merge them. Resolving against the live table keeps one row per
   * product. `gray` shipping as "Gray" in the morning and "Light Grey" by the
   * afternoon is exactly this case.
   */
  nameBySlug: Record<string, string> = {}
): Ga4Item[] {
  return lineItems.map((li, i) => {
    const { name, size } = splitDescription(li.description ?? '');
    const quantity = li.quantity ?? 1;

    // Positional match, but only trust it when the quantity agrees — otherwise
    // fall back to a slug derived from the name.
    const meta = metadataItems[i];
    const slug =
      meta && meta.qty === quantity
        ? meta.id
        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const unit =
      li.price?.unit_amount != null
        ? li.price.unit_amount / 100
        : (li.amount_subtotal ?? 0) / 100 / (quantity || 1);

    const perUnitDiscount = (li.amount_discount ?? 0) / 100 / (quantity || 1);

    return {
      item_id: size ? `${slug}-${size}` : slug, // slug-based, so renames don't fork the item
      item_name: nameBySlug[slug] || name || designName(slug),
      ...(size ? { item_variant: size } : {}),
      item_category: category,
      price: Math.round(unit * 100) / 100,
      ...(perUnitDiscount > 0
        ? { discount: Math.round(perUnitDiscount * 100) / 100 }
        : {}),
      quantity,
    };
  });
}

export type Ga4Item = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  /** Per-unit discount, if a coupon or credit was applied to this line. */
  discount?: number;
  quantity: number;
};

export type Ga4PurchasePayload = {
  clientId: string;
  sessionId?: string;
  transactionId: string;
  value: number;
  currency: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
  items: Ga4Item[];
  /** Event time. GA4 accepts backdating up to 72 hours; older is silently dropped. */
  timestampMicros?: number;
  /** Post to the debug endpoint and return validation messages instead of recording. */
  debug?: boolean;
};

const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MP_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

export async function sendGa4Purchase(p: Ga4PurchasePayload): Promise<{
  ok: boolean;
  status: number;
  validation?: unknown;
}> {
  const apiSecret = process.env.GA4_API_SECRET;
  if (!apiSecret) throw new Error('GA4_API_SECRET is not set');

  const url = `${p.debug ? MP_DEBUG_ENDPOINT : MP_ENDPOINT}?measurement_id=${encodeURIComponent(
    GA4_MEASUREMENT_ID
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const body: Record<string, unknown> = {
    client_id: p.clientId,
    events: [
      {
        name: 'purchase',
        params: {
          // Ties the purchase to the visitor's real session so GA4 credits the
          // original traffic source rather than opening a brand-new session.
          ...(p.sessionId ? { session_id: p.sessionId } : {}),
          // Required for the event to count as engaged and appear in Realtime.
          engagement_time_msec: 1,
          transaction_id: p.transactionId,
          value: round2(p.value),
          currency: p.currency.toUpperCase(),
          ...(p.shipping ? { shipping: round2(p.shipping) } : {}),
          ...(p.tax ? { tax: round2(p.tax) } : {}),
          ...(p.coupon ? { coupon: p.coupon } : {}),
          items: p.items,
        },
      },
    ],
  };

  if (p.timestampMicros) body.timestamp_micros = p.timestampMicros;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // The live endpoint returns 204 with no body and validates nothing.
  // The debug endpoint returns 200 with a validationMessages array.
  const validation = p.debug ? await res.json().catch(() => undefined) : undefined;
  return { ok: res.ok, status: res.status, validation };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
