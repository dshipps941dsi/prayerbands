-- Applied to production 2026-08-19.
-- Ownership is written from 11 call sites across 8 files, so this is a trigger
-- rather than per-site instrumentation: it cannot be forgotten by future code,
-- and it captures manual SQL fixes too. See app/api/admin/activity for the read.
create table if not exists public.band_ownership_events (
  id bigserial primary key,
  band_id text not null,
  old_owner_id uuid,
  new_owner_id uuid,
  actor_uid uuid,
  changed_at timestamptz not null default now()
);
create index if not exists band_ownership_events_band_idx on public.band_ownership_events (band_id, changed_at desc);
create index if not exists band_ownership_events_recent_idx on public.band_ownership_events (changed_at desc);
alter table public.band_ownership_events enable row level security;

create or replace function public.log_band_owner_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id then
    insert into public.band_ownership_events (band_id, old_owner_id, new_owner_id, actor_uid)
    values (new.band_id, old.owner_id, new.owner_id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists on_band_owner_change on public.bands;
create trigger on_band_owner_change
  after update of owner_id on public.bands
  for each row execute function public.log_band_owner_change();
