-- The journal holds more than prayers: notes, saved verses, and dated updates
-- under a prayer ("saw the doctor today", "answered — she's home"). Entries
-- keep the prayer_network_requests table (a prayer is still a request that
-- can be shared); notes and verses are always private.

alter table public.prayer_network_requests
  add column if not exists kind text not null default 'prayer',
  add column if not exists verse_ref text;

alter table public.prayer_network_requests drop constraint if exists prayer_network_requests_kind_check;
alter table public.prayer_network_requests
  add constraint prayer_network_requests_kind_check check (kind in ('prayer', 'note', 'verse'));

alter table public.prayer_network_requests drop constraint if exists prayer_network_requests_verse_ref_check;
alter table public.prayer_network_requests
  add constraint prayer_network_requests_verse_ref_check check (verse_ref is null or char_length(verse_ref) <= 80);

-- Follow-ups written under an entry, each with its own time stamp. Deleting
-- the entry takes its updates with it.
create table if not exists public.journal_updates (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.prayer_network_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 1 and char_length(trim(body)) <= 1000),
  -- 'update' is a plain follow-up; 'answered' is the note written when the
  -- prayer was marked answered.
  kind text not null default 'update' check (kind in ('update', 'answered')),
  created_at timestamptz not null default now()
);

create index if not exists journal_updates_entry_idx on public.journal_updates (entry_id, created_at);

alter table public.journal_updates enable row level security;

drop policy if exists "Owner manages their journal updates" on public.journal_updates;
create policy "Owner manages their journal updates" on public.journal_updates
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.journal_updates to authenticated;
grant all on public.journal_updates to service_role;
