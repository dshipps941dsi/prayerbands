-- The personal-account display name lives in profiles.full_name — written by the
-- Settings page and read by band journey emails, the prayer network, admin
-- lookup, subscription shipments, etc. If the column is missing, saving your
-- name fails with "Could not find the 'full_name' column of 'profiles' in the
-- schema cache". Add it (idempotent) and reload PostgREST's schema cache.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Force PostgREST to pick up the new column immediately (otherwise the API may
-- keep returning the schema-cache error until its next reload).
NOTIFY pgrst, 'reload schema';
