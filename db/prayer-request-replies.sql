-- Opt-in private replies to a shared prayer. The requester decides per prayer
-- whether others can reply (default off), and a reply goes only to them — not a
-- public thread. Access is enforced in the API (service key); no direct client
-- access to the comments table.
alter table public.prayer_network_requests
  add column if not exists allow_comments boolean not null default false;

create table if not exists public.prayer_request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.prayer_network_requests(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists prayer_request_comments_req_idx on public.prayer_request_comments(request_id, created_at);
alter table public.prayer_request_comments enable row level security;
revoke all on public.prayer_request_comments from anon, authenticated;
