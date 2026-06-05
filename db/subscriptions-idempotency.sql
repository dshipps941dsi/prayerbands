-- ─────────────────────────────────────────────
-- Idempotency for Stripe webhook retries / replays
-- Run this in your Supabase SQL editor (both test + live projects)
-- ─────────────────────────────────────────────
--
-- Stripe delivers webhooks at-least-once, so the same event can arrive twice.
-- Without unique keys, each delivery inserts a duplicate subscription / shipment
-- row (double shipments, double emails). These constraints let the webhook use
-- upserts that are safe to run repeatedly.
--
-- subscriptions.stripe_subscription_id is ALREADY UNIQUE (see
-- subscriptions-schema.sql), so the subscription upsert needs no schema change.
--
-- subscription_shipments needs a unique key on the Stripe invoice id. A plain
-- unique index is what we want: Postgres treats NULLs as distinct, so shipments
-- with no invoice id (edge cases) are still allowed, while any real invoice id
-- can back exactly one shipment.

-- If earlier testing left duplicate invoice ids, de-dupe before adding the index
-- (keeps the oldest row per invoice). Uncomment if the CREATE INDEX below fails:
--
-- DELETE FROM subscription_shipments a
-- USING subscription_shipments b
-- WHERE a.stripe_invoice_id IS NOT NULL
--   AND a.stripe_invoice_id = b.stripe_invoice_id
--   AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_shipments_stripe_invoice
  ON subscription_shipments (stripe_invoice_id);
