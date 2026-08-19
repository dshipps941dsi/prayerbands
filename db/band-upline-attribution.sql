-- Applied to production 2026-08-19.
--
-- Who put this band into circulation. bands.upline_user_id has existed since
-- the beginning but nothing ever wrote it; this makes it real.
--
-- upline_email lets a band be attributed to someone with no account yet — the
-- common case when seeding, where bands are handed out before the person ever
-- taps one. It resolves to upline_user_id automatically the moment that address
-- signs up, so nobody has to remember to come back and fix it.
alter table public.bands add column if not exists upline_email text;

create index if not exists bands_upline_email_idx on public.bands (lower(upline_email))
  where upline_email is not null and upline_user_id is null;
create index if not exists bands_upline_user_idx on public.bands (upline_user_id)
  where upline_user_id is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do nothing;

  if new.email is not null then
    update public.bands
       set upline_user_id = new.id
     where upline_user_id is null
       and lower(upline_email) = lower(new.email);
  end if;

  return new;
end;
$$;

update public.bands b set upline_user_id = u.id
  from auth.users u
 where b.upline_user_id is null and b.upline_email is not null
   and lower(b.upline_email) = lower(u.email);
