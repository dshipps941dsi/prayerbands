-- Let ministries upload a logo. The image is stored in the 'org-logos'
-- Supabase Storage bucket; this column holds its public URL.
--
-- Run in your Supabase SQL editor (live project). The storage bucket is
-- created automatically by the upload route the first time a logo is uploaded.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url text;
