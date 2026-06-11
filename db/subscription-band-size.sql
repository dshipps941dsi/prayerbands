-- Subscriptions: add an editable band size preference (color already exists).
-- Subscribers can change color + size anytime from their dashboard; each
-- shipment uses whatever is set then. Existing rows default to Medium.
--
-- Run in the Supabase SQL editor.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS band_size TEXT NOT NULL DEFAULT 'M';
