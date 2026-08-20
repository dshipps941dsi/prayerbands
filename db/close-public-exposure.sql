-- Applied to production 2026-08-20.
--
-- Two things reachable from the open internet with the publishable key that
-- ships in every page of the site.
--
-- 1. downline_of() is SECURITY DEFINER and was never restricted, so anyone
--    could POST a user id to /rest/v1/rpc/downline_of and enumerate that
--    person's whole network. Verified from outside the site with no account.
--
-- 2. registrations carries a single unconditional read policy, which is right
--    for a name and a city — that is how the map and the wall work — but it
--    also exposed ip_address (18 real addresses) and email. An IP is roughly a
--    street-level location; beside a real name and a map pin, on a product
--    used by children, that is not something to leave open.
--
-- Nothing in the app loses access: /api/my-reach calls downline_of on the
-- service client, and no browser query selects email or ip_address once the
-- blessing page stops using select('*').

revoke execute on function public.downline_of(uuid, int) from anon, authenticated;

-- Column privileges cannot be subtracted from a table-wide grant, so the grant
-- is replaced with an explicit column list. Keeping this list literal rather
-- than "everything except" is deliberate: a column added later is unreadable
-- until someone chooses to publish it, which is the safe direction to fail.
revoke select on public.registrations from anon, authenticated;
grant select (
  id, band_id, user_id, user_name, city, state, country,
  latitude, longitude, prayer, verse, registered_at, flagged, flagged_reason
) on public.registrations to anon, authenticated;
