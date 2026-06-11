-- Dedication feature: let a buyer (or admin) attach a personal "sent
-- especially for you" message to a band before it ships. The recipient sees it
-- on their first tap, once.
--
-- dedication_note / dedication_recipient already exist on bands; this adds the
-- "seen yet?" flag and a per-band secret token that gates the public /dedicate
-- form so only someone with the link can write a message.
--
-- Run in the Supabase SQL editor.

ALTER TABLE bands
  ADD COLUMN IF NOT EXISTS dedication_viewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dedication_token TEXT DEFAULT gen_random_uuid()::text;
