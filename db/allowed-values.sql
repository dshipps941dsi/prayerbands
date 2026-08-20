-- Applied to production 2026-08-20.
--
-- Two features wrote values the database refuses, so they had never once
-- worked. Both were verified rejected against production before this ran.
--
-- 'replaced' — all three band-replacement paths set it to retire a lost band.
-- The write failed every time, so the old band stayed active and owned while
-- its prayer history moved to the replacement. The customer-facing route
-- discarded the error and reported success.
alter table public.bands drop constraint if exists bands_status_check;
alter table public.bands add constraint bands_status_check
  check (status = any (array[
    'unregistered'::text, 'registered'::text, 'active'::text,
    'pending_transfer'::text, 'assigned'::text, 'handed_out'::text,
    'replaced'::text
  ]));

-- 'private' — a prayer written on your own band page, visible only to you.
-- Existing policies already handle it correctly: the two public read policies
-- match on visibility = 'public', and "Users read their own" covers the author,
-- so a private row is readable by its owner and nobody else.
alter table public.prayer_requests drop constraint if exists prayer_requests_visibility_check;
alter table public.prayer_requests add constraint prayer_requests_visibility_check
  check (visibility = any (array[
    'network'::text, 'public'::text, 'both'::text, 'private'::text
  ]));
