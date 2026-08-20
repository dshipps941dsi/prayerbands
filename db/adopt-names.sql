-- Applied to production 2026-08-20.
--
-- Six accounts had no name. profiles.full_name is only ever filled from the
-- sign-up provider's metadata: Google supplies a name, the emailed code does
-- not. So anyone who signed up with a code stayed nameless — and appeared blank
-- in a prayer chain — despite having typed their name on the band's first
-- screen minutes earlier.
--
-- The name they gave the band is the name they meant. Backfill from their most
-- recent stop, and only where the account has none: a name someone has since
-- set in settings must never be overwritten by an old registration.
--
-- Going forward this is handled in code (lib/adopt-name.ts), called when a band
-- is claimed and when a signed-in person registers a stop.
update public.profiles p
   set full_name = sub.user_name
  from (
    select distinct on (r.user_id)
           r.user_id, trim(r.user_name) as user_name
      from public.registrations r
     where r.user_id is not null
       and coalesce(trim(r.user_name), '') <> ''
     order by r.user_id, r.registered_at desc
  ) sub
 where p.id = sub.user_id
   and p.full_name is null;
