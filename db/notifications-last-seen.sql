-- Tracks when the user last opened their dashboard notifications inbox.
-- Anything newer than this is shown as "unread" (drives the bell badge).
-- Notifications themselves are derived on the fly from band registrations,
-- orders, and subscription shipments — there is no notifications table.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notifications_last_seen TIMESTAMPTZ;
