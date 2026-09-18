-- Two things the admin tools need.
--
-- 1. Hand-off reminders: the nightly job nudges a giver once when a hand-off
--    has sat a week; this records that it did.
alter table public.band_transfers add column if not exists reminded_at timestamptz;

-- 2. merge_accounts(keep, drop): one person, two accounts. Moves everything
--    the dropped account owns or did onto the kept one — every column that
--    points at a user, found from the catalog so a new table is covered
--    automatically — resolves the collisions a unique constraint would raise
--    (same circle twice, same partner twice) by dropping the duplicate, moves
--    the dropped account's Google/Apple logins onto the kept one, and deletes
--    the empty shell. Service role only; the admin Bands tab calls it.
create or replace function public.merge_accounts(keep uuid, drop_ uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  rid record;
  n int;
  moved jsonb := '{}'::jsonb;
begin
  if keep = drop_ then raise exception 'keep and drop are the same account'; end if;
  if not exists (select 1 from auth.users where id = keep) then raise exception 'kept account not found'; end if;
  if not exists (select 1 from auth.users where id = drop_) then raise exception 'dropped account not found'; end if;

  for r in
    select kcu.table_schema, kcu.table_name, kcu.column_name
    from information_schema.referential_constraints rc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = rc.constraint_name and kcu.constraint_schema = rc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = rc.unique_constraint_name and ccu.constraint_schema = rc.unique_constraint_schema
    where kcu.table_schema = 'public'
      and ccu.column_name = 'id'
      and ((ccu.table_schema = 'auth' and ccu.table_name = 'users') or (ccu.table_schema = 'public' and ccu.table_name = 'profiles'))
      and not (kcu.table_name = 'profiles' and kcu.column_name = 'id')
  loop
    n := 0;
    for rid in execute format('select ctid from %I.%I where %I = $1', r.table_schema, r.table_name, r.column_name) using drop_
    loop
      begin
        execute format('update %I.%I set %I = $1 where ctid = $2', r.table_schema, r.table_name, r.column_name) using keep, rid.ctid;
        n := n + 1;
      exception when unique_violation then
        -- The kept account already has this row (same circle, same partner):
        -- the duplicate goes.
        execute format('delete from %I.%I where ctid = $1', r.table_schema, r.table_name) using rid.ctid;
      end;
    end loop;
    if n > 0 then moved := moved || jsonb_build_object(r.table_name || '.' || r.column_name, n); end if;
  end loop;

  -- A sponsorship that now points at itself.
  update public.profiles set upline_user_id = null where id = keep and upline_user_id = keep;
  -- Fill blanks on the kept profile from the dropped one (never overwrite).
  update public.profiles k set
    full_name = coalesce(nullif(k.full_name, ''), d.full_name),
    avatar_icon = coalesce(k.avatar_icon, d.avatar_icon),
    upline_user_id = coalesce(k.upline_user_id, case when d.upline_user_id = keep then null else d.upline_user_id end),
    upline_band_id = coalesce(k.upline_band_id, d.upline_band_id)
  from public.profiles d where k.id = keep and d.id = drop_;

  -- Logins: Google / Apple / Facebook identities follow the person. An email
  -- identity is the account's own and dies with it.
  for rid in select id from auth.identities where user_id = drop_ and provider <> 'email'
  loop
    begin
      update auth.identities set user_id = keep where id = rid.id;
    exception when unique_violation then
      delete from auth.identities where id = rid.id;
    end;
  end loop;

  delete from auth.users where id = drop_;
  return moved;
end
$$;

revoke all on function public.merge_accounts(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_accounts(uuid, uuid) to service_role;
