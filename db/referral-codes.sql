-- Applied to production 2026-08-20.
--
-- Codes themselves already existed — lib/referral.ts generates them and every
-- account had one. What was missing is that they were only issued by
-- /api/onboard, which not every signup path reaches; db/profile-on-signup.sql
-- says so outright: "referral_code is left null on purpose". An account created
-- any other way would have no code and no way to refer anyone.
--
-- The trigger now issues one with the profile, so it cannot be missed. Format
-- matches lib/referral.ts exactly ("PB-" + 5 characters from an alphabet with
-- no I, O, 0 or 1) — a second format would be worse than none.
create or replace function public.new_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
begin
  loop
    code := 'PB-';
    for i in 1..5 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where referral_code = code);
    attempts := attempts + 1;
    -- The unique index is the real guarantee; this only stops a pathological
    -- loop if the space ever fills, which it will not.
    if attempts > 50 then
      raise exception 'new_referral_code: could not find a free code';
    end if;
  end loop;
  return code;
end;
$$;

revoke execute on function public.new_referral_code() from public;
grant execute on function public.new_referral_code() to service_role;

-- Every new account gets one, alongside its profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    public.new_referral_code()
  )
  on conflict (id) do nothing;

  -- Credit waiting on this address from a band handed out before they joined.
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

-- Backfill for any account that predates the trigger. One row at a time:
-- inside a single UPDATE the uniqueness check cannot see the codes the same
-- statement is writing. (Found none — every account already had one.)
do $$
declare r record;
begin
  for r in select id from profiles where referral_code is null loop
    update profiles set referral_code = public.new_referral_code() where id = r.id;
  end loop;
end;
$$;
