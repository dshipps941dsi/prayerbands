-- Applied to production 2026-08-20.
--
-- Bands given away rather than sold — seeding, donations, samples — still leave
-- the shelf, but nothing recorded that. They stayed 'unregistered' with no
-- owner, which is exactly the shape every "sellable stock" query counts, so the
-- inventory number quietly overstated what was actually in the box.
--
-- Two parts: a ledger of what left and why, and a fix for crediting a giver who
-- has not signed up yet.
create table if not exists public.band_handouts (
  id bigserial primary key,
  band_id text not null,
  reason text not null,
  recipient_name text,
  recipient_email text,
  -- Who gets credit in the downline tree. May be an email only: bands are
  -- routinely handed to someone on behalf of a giver who has no account yet.
  upline_user_id uuid,
  upline_email text,
  note text,
  actor_uid uuid,
  created_at timestamptz not null default now()
);
create index if not exists band_handouts_band_idx on public.band_handouts (band_id, created_at desc);
create index if not exists band_handouts_recent_idx on public.band_handouts (created_at desc);
alter table public.band_handouts enable row level security;

-- Attribution used to form only at claim time, from bands.upline_user_id. A band
-- credited to someone who had not yet registered carried an upline_email and no
-- user id, so the credit was silently lost the moment the recipient claimed it —
-- the exact case that lost Isla's and Brinley's bands from Taylor's downline.
--
-- Resolving it on signup closes the loop from the other end: hand bands out
-- crediting anyone, and the attribution attaches itself when they join.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do nothing;

  -- Claim any credit left waiting on this address.
  if new.email is not null then
    update public.bands
       set upline_user_id = new.id
     where upline_user_id is null
       and upline_email is not null
       and lower(upline_email) = lower(new.email);

    update public.band_handouts
       set upline_user_id = new.id
     where upline_user_id is null
       and upline_email is not null
       and lower(upline_email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Resolve credit for anyone who already has an account.
update public.bands b
   set upline_user_id = p.id
  from public.profiles p
 where b.upline_user_id is null
   and b.upline_email is not null
   and lower(b.upline_email) = lower(p.email);

-- 'handed_out' has to be allowed before anything can be written with it: the
-- status column carries a check constraint, and the first attempt to record a
-- handout failed on it.
alter table public.bands drop constraint if exists bands_status_check;
alter table public.bands add constraint bands_status_check
  check (status = any (array['unregistered'::text, 'registered'::text, 'active'::text, 'pending_transfer'::text, 'assigned'::text, 'handed_out'::text]));
