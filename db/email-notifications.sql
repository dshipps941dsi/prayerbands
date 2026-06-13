-- Per-user toggle for band notification emails (journey alerts + "band passed
-- on" owner emails). Defaults to TRUE so existing users keep getting them; a
-- user can pause them from /settings. Senders check this before sending.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;
