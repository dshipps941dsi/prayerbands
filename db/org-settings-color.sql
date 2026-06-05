-- Let ministries theme their dashboard/band pages with a custom color.
-- The dashboard already reads organizations.color (falling back to green),
-- but the column may not exist yet — add it safely.
--
-- Run in your Supabase SQL editor (live project).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS color text;
