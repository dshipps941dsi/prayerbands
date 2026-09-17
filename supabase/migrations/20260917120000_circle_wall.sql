-- Circle Prayer Wall: topics with prayers underneath.
--
-- A circle's requests become forum-style topics: each gets an optional title
-- and a kind (a prayer request, or an update on how things are going), and
-- members can write a prayer underneath any topic. The tap-to-pray count
-- (circle_intercessions) stays as it was; writing a prayer also counts you
-- as praying.
--
-- Existing rows keep working: title null, kind 'request', body in request_text.

alter table public.circle_prayer_requests
  add column if not exists title text,
  add column if not exists kind text not null default 'request';

alter table public.circle_prayer_requests
  drop constraint if exists circle_prayer_requests_kind_check;
alter table public.circle_prayer_requests
  add constraint circle_prayer_requests_kind_check check (kind in ('request', 'update'));

alter table public.circle_prayer_requests
  drop constraint if exists circle_prayer_requests_title_check;
alter table public.circle_prayer_requests
  add constraint circle_prayer_requests_title_check check (title is null or char_length(title) <= 120);

create table if not exists public.circle_prayer_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.circle_prayer_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists circle_prayer_replies_req_idx on public.circle_prayer_replies (request_id, created_at);
create index if not exists circle_prayer_replies_user_idx on public.circle_prayer_replies (user_id);

alter table public.circle_prayer_replies enable row level security;

-- Same shape as circle_intercessions: members of the circle can see and add,
-- the author or the circle leader can remove. (The app writes through the
-- service role after its own checks; these keep direct access honest.)
drop policy if exists "Circle members can view replies" on public.circle_prayer_replies;
create policy "Circle members can view replies" on public.circle_prayer_replies
  for select to authenticated
  using (request_id in (
    select r.id from public.circle_prayer_requests r
    where r.circle_id in (select m.circle_id from public.circle_members m where m.user_id = auth.uid())
  ));

drop policy if exists "Circle members can reply" on public.circle_prayer_replies;
create policy "Circle members can reply" on public.circle_prayer_replies
  for insert to authenticated
  with check (auth.uid() = user_id and request_id in (
    select r.id from public.circle_prayer_requests r
    where r.circle_id in (select m.circle_id from public.circle_members m where m.user_id = auth.uid())
  ));

drop policy if exists "Author or leader can delete a reply" on public.circle_prayer_replies;
create policy "Author or leader can delete a reply" on public.circle_prayer_replies
  for delete to authenticated
  using (auth.uid() = user_id or request_id in (
    select r.id from public.circle_prayer_requests r
    join public.prayer_circles c on c.id = r.circle_id
    where c.created_by = auth.uid()
  ));

grant select, insert, delete on public.circle_prayer_replies to authenticated;
