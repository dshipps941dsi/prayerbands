-- Subscriptions: remember which band DESIGN (store product) to ship each cycle.
-- Chosen at signup from the store catalog; color + size remain editable
-- dashboard preferences. Stored as the product slug (e.g. 'standard').
--
-- Run in the Supabase SQL editor.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS band_design TEXT;

ALTER TABLE subscription_shipments
  ADD COLUMN IF NOT EXISTS band_design TEXT;
