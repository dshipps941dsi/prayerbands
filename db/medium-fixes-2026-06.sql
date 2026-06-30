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


-- Prayer-email unsubscribe (per-sender + global). Keyed by email because
-- recipients often have no account. sender_user_id NULL = opted out of ALL
-- prayer emails; a value = opted out of that one sender.
--
-- migration: prayer_email_optouts
create table if not exists prayer_email_optouts (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  sender_user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create unique index if not exists prayer_email_optouts_uniq
  on prayer_email_optouts (email, sender_user_id) nulls not distinct;
create index if not exists prayer_email_optouts_email_idx
  on prayer_email_optouts (email);
alter table prayer_email_optouts enable row level security;
-- (no policies — server/service-role only)

-- Rollback:
--   DROP TABLE IF EXISTS prayer_email_optouts;
