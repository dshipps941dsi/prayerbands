-- Database cleanup pass (2026-06-30). Applied via Supabase migrations; recorded
-- here for the repo. DB snapshot taken first: db/backups/2026-06-30-pre-cleanup/.

-- 1. Cross-org leak: restrict get_org_lineage (SECURITY DEFINER) to org members.
--    Any signed-in user could previously pass another org's id and read its
--    band-holder names/locations. get_org_stats stays public (counts only,
--    powers church landing pages).
--    migration: get_org_lineage_membership_guard
--    (full body in the migration; guard added at the top:)
--      IF (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()) IS DISTINCT FROM org_uuid THEN RETURN; END IF;

-- 2. Covering indexes for previously-unindexed foreign keys.
--    migrations: add_covering_fk_indexes, drop_orphaned_tables_followers_lineage
--    (band_transfers, chain_prayers, circle_*, faq_entries, order_bands,
--     org_invites, organizations, prayer_acknowledgments, prayer_circles,
--     prayer_email_optouts, prayer_network_intercessions, prayer_requests,
--     prayer_intercessions, referrals, subscriptions)

-- 3. Remove the open anon-insert policy on registrations. Inserts now go only
--    through trusted server routes (register-band, wall-prayer) on the service
--    key. The public prayer wall was rewired to POST /api/wall-prayer (which
--    adds moderation + rate limiting it previously lacked).
--    migration: drop_open_registrations_insert_policy
--    DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.registrations;

-- 4. Drop orphaned tables (0 rows, 0 code refs, no dependencies).
--    migration: drop_orphaned_tables_followers_lineage
--    DROP TABLE followers;       -- abandoned follow feature
--    DROP TABLE lineage_tree;    -- superseded by registrations-based chain
--    NOTE: prayer_intercessions was investigated and KEPT — it backs the
--    prayer_requests_with_counts view used by the dashboard + notifications.

-- Rollback notes:
--   - Re-create followers / lineage_tree from db/backups/2026-06-30-pre-cleanup if needed.
--   - Re-add the registrations insert policy:
--       CREATE POLICY "Anyone can insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);
--   - Indexes/function guard are safe to drop/revert individually.
