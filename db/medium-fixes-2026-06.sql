-- Medium-priority flow-audit fixes (2026-06) — DB changes
-- Applied via Supabase migrations; recorded here for the repo.

-- N-M2: prevent duplicate prayer-network connections between the same two users
-- in EITHER direction. The table's UNIQUE(requester_id, recipient_id) only
-- caught same-direction duplicates, so A->B and B->A could both exist — which
-- then broke the .maybeSingle() pair lookups in the request/status/intercede
-- routes. This normalized index makes a pair unique regardless of who asked.
--
-- migration: pnc_unique_pair_either_direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_pnc_unique_pair
  ON prayer_network_connections (
    LEAST(requester_id, recipient_id),
    GREATEST(requester_id, recipient_id)
  );

-- Rollback:
--   DROP INDEX IF EXISTS idx_pnc_unique_pair;
