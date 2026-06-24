-- "Your walk": a per-user daily-verse counter. `total` is the lifetime number of
-- days the verse has been opened (only ever counts up); `run` is the current
-- consecutive-day streak (a missed day quietly resets it to 1, never penalized).
-- Cross-device for signed-in users; accountless holders use a localStorage
-- fallback (lib/verseWalk.ts) that merges in on sign-up.
create table if not exists verse_walks (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total      int  not null default 0,
  run        int  not null default 0,
  last_seen  date,
  updated_at timestamptz not null default now()
);
alter table verse_walks enable row level security;

-- Drop-then-create so this file is safe to re-run.
drop policy if exists "own walk select" on verse_walks;
drop policy if exists "own walk insert" on verse_walks;
drop policy if exists "own walk update" on verse_walks;
create policy "own walk select" on verse_walks for select using (auth.uid() = user_id);
create policy "own walk insert" on verse_walks for insert with check (auth.uid() = user_id);
create policy "own walk update" on verse_walks for update using (auth.uid() = user_id);

notify pgrst, 'reload schema';
