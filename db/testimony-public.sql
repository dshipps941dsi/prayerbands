-- Lets a believer opt in to sharing their answered-prayer testimony on a public
-- page (/testimony/[id]) that can be posted to social media. Defaults to private.
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS testimony_public BOOLEAN DEFAULT FALSE;
