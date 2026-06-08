-- ============================================
-- Band themes — per-band color palette for the /band experience.
-- ============================================
-- Run in your Supabase SQL editor (live project).
-- Theme keys map to entries in lib/themes.ts (default, beach, military, ...).

ALTER TABLE bands ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';

-- Org-level default: generated bands inherit this unless overridden at generation.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_theme TEXT DEFAULT 'default';
