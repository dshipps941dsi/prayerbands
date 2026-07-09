-- Per-request audience for shared prayer requests (Phase 3 request targeting).
--   network = everyone you're connected to (accepted partners)
--   direct  = only direct partners (no band passed between you)
--   lineage = only lineage partners (a band passed between you)
--   wall    = the public prayer wall (visibility also stays 'public')
-- Already applied to the hosted DB via migration.
ALTER TABLE prayer_network_requests ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'network';

UPDATE prayer_network_requests SET audience = 'wall' WHERE visibility = 'public';
UPDATE prayer_network_requests SET audience = 'network' WHERE visibility <> 'public' AND audience IS NULL;
