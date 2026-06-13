-- Custom + overridden band themes, editable from the admin Band Mgmt → Themes tab.
--
-- Built-in themes still live in code (lib/themes.ts) and are always available.
-- This table only stores (a) NEW custom themes admins create, and (b) OVERRIDES
-- of built-in themes (same key, is_builtin = true). At runtime /api/themes merges
-- the built-ins with these rows (DB wins on key collision), so the table can be
-- empty and everything still works.
CREATE TABLE IF NOT EXISTS band_themes (
  key         TEXT PRIMARY KEY,             -- slug, e.g. 'pickleball' or 'mountain' (override)
  label       TEXT NOT NULL,                -- human label shown in dropdowns
  data        JSONB NOT NULL DEFAULT '{}',  -- full BandTheme minus label: palette, verse, image, wash
  is_builtin  BOOLEAN NOT NULL DEFAULT FALSE, -- true = override of a code built-in (not deletable in UI)
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
