-- Fulfillment blockers found by the order→assign→ship smoke test (2026-07).
-- The app code already wrote these values; the database schema was the gap, so
-- every "Assign Bands" would have failed. Both applied to the hosted DB.

-- 1) Allow the 'assigned' band status (unregistered -> assigned -> registered).
ALTER TABLE bands DROP CONSTRAINT bands_status_check;
ALTER TABLE bands ADD CONSTRAINT bands_status_check
  CHECK (status = ANY (ARRAY['unregistered','registered','active','pending_transfer','assigned']));

-- 2) Record which bands were allocated to an order (written on Assign, read on
--    Mark-as-Shipped for the shipping email).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_band_ids text[];
