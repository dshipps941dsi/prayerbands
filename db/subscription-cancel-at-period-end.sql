-- Track scheduled cancellations so the dashboard can show "Cancels on <date>"
-- instead of a plain "Active" for subscriptions the customer has cancelled but
-- that remain active until the end of the paid period.
--
-- Run this in your Supabase SQL editor (live project; also test if you use one).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
