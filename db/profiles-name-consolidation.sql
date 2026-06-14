-- Consolidate the profile name onto a single column: full_name.
-- Previously the personal flow used profiles.full_name while the org/onboard/
-- invite flow used profiles.display_name, so a person's name could be blank in
-- whichever flow didn't write "their" column. All code now reads/writes
-- full_name, so backfill any name that only lived in display_name and drop it.
--
-- NOTE: org_invites.display_name is a DIFFERENT table (invite metadata) and is
-- intentionally left untouched.
UPDATE profiles SET full_name = COALESCE(full_name, display_name) WHERE display_name IS NOT NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS display_name;

-- Refresh PostgREST's schema cache so the dropped column is forgotten immediately.
NOTIFY pgrst, 'reload schema';
