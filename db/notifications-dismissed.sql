-- Lets a user dismiss ("delete") individual derived notifications. Since the
-- feed is computed on the fly, we just remember the dismissed notification IDs
-- and filter them out. Capped client-of-server-side to the most recent ~500.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dismissed_notifications JSONB DEFAULT '[]'::jsonb;
