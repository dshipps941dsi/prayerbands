-- Production band size (S / M / L) for a manufacturing run. The batch generator
-- writes `size` per row so a single design can be split across sizes (e.g. 10 S,
-- 20 M, 20 L). Stays null for older bands generated before sizing existed.
--
-- Run in the Supabase SQL editor (already applied via migration on the hosted DB).
ALTER TABLE bands ADD COLUMN IF NOT EXISTS size TEXT;
