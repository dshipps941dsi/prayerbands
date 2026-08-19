-- Applied to production 2026-08-18.
--
-- Accounts created via signInWithOtp({ shouldCreateUser: true }) on the band
-- page got an auth.users row but no profiles row, because nothing in the app
-- or the database created one. Those half-created accounts own no bands and
-- are invisible to any lookup that resolves an email through profiles
-- (e.g. /api/admin/assign-bands reported "No account found" for a real user).
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill every account that predates the trigger (4 of 12 at time of writing).
-- referral_code is left null on purpose: it is nullable, uniquely constrained,
-- and every read site already guards for its absence.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
