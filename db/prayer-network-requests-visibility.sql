-- ============================================
-- Prayer network requests — visibility (private / public) + public display name
-- ============================================
-- Run after db/prayer-network-requests-schema.sql.

alter table prayer_network_requests
  add column if not exists visibility text not null default 'private',
  add column if not exists public_name text;

-- Constrain visibility values (drop+add so this file is re-runnable).
alter table prayer_network_requests drop constraint if exists prayer_network_requests_visibility_check;
alter table prayer_network_requests
  add constraint prayer_network_requests_visibility_check check (visibility in ('private', 'public'));

create index if not exists idx_pnr_visibility on prayer_network_requests(visibility);

-- Anyone (including signed-out wall visitors) can read PUBLIC requests.
drop policy if exists "Public network requests are readable by anyone" on prayer_network_requests;
create policy "Public network requests are readable by anyone"
  on prayer_network_requests for select
  using (visibility = 'public');
