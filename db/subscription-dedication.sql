-- Per-cycle gift dedication for subscription shipments. The subscriber sets a
-- recipient + message for their next shipment from the dashboard; when an admin
-- assigns bands to that shipment, the dedication is copied onto those bands so
-- the recipient sees the "sent especially for you" screen on first tap.
--
-- (subscription_shipments already has band_ids / tracking_number / status.)
--
-- Run in the Supabase SQL editor.

ALTER TABLE subscription_shipments
  ADD COLUMN IF NOT EXISTS dedication_recipient TEXT,
  ADD COLUMN IF NOT EXISTS dedication_note TEXT;
