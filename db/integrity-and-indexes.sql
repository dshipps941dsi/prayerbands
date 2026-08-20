-- Applied to production 2026-08-20.
--
-- The database enforced referential integrity in 24 places, none of them on the
-- links that carry the network. Every one of these was clean at the time of
-- writing — the point is that nothing was keeping them that way, and a dangling
-- id in this graph is a branch of the tree silently disappearing.
--
-- All are SET NULL rather than CASCADE, except the account link: losing a person
-- should never delete the bands they touched or the prayers they left. The stop
-- stays on the map; only the attribution to a deleted account goes.

-- Left over from OTP debugging on 2026-08-19; its auth user is gone and it owns
-- nothing. Removing it lets the account link below be enforced.
delete from public.profiles
 where email = 'probe-otp-check@prayerbands.com'
   and not exists (select 1 from auth.users u where u.id = profiles.id);

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

alter table public.profiles
  add constraint profiles_upline_user_id_fkey
  foreign key (upline_user_id) references public.profiles (id) on delete set null;

alter table public.bands
  add constraint bands_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.bands
  add constraint bands_upline_user_id_fkey
  foreign key (upline_user_id) references public.profiles (id) on delete set null;

alter table public.registrations
  add constraint registrations_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

-- band_transfers.from_user_id already references auth.users(id); the audit query
-- missed it because information_schema does not resolve cross-schema references.
-- Equivalent protection, so it is left alone.

-- Indexes for the queries that run on every page load. Instant at 36 stops;
-- a full scan and sort at 100,000. The wall orders by registered_at on every
-- request, and owner/holder lookups sit behind the dashboard and every claim.
create index if not exists registrations_registered_at_idx
  on public.registrations (registered_at desc);

create index if not exists registrations_user_id_idx
  on public.registrations (user_id) where user_id is not null;

create index if not exists bands_owner_id_idx
  on public.bands (owner_id) where owner_id is not null;

create index if not exists bands_status_idx
  on public.bands (status);

create index if not exists chain_prayers_band_id_idx
  on public.chain_prayers (band_id);
