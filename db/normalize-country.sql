-- Applied to production 2026-08-20.
--
-- The home page listed "United States" and "USA" as two separate countries,
-- because early registrations stored the abbreviation before the country
-- dropdown existed. It also inflated the distinct-country count by one.
--
-- The dropdown in lib/locations.ts writes "United States" for everything now,
-- so this is a one-off cleanup of the eight rows that predate it.
update public.registrations
   set country = 'United States'
 where country in ('USA', 'US', 'U.S.A.', 'U.S.');
