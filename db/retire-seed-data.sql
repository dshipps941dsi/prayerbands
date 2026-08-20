-- NOT APPLIED. This is the switch, ready for the day the real network can
-- carry the page on its own.
--
-- As of 2026-08-20 the public map and prayer wall are mostly seeded: 11
-- invented prayers from Tokyo, Berlin, Nairobi, Accra, São Paulo, London,
-- Toronto, Atlanta, New York and Los Angeles, against 4 real ones. The home
-- page says nine countries; one of them is real. That is a deliberate choice —
-- an empty map shows nothing about what the product is for — and it holds
-- until real reach can stand alone.
--
-- Every seeded stop is on a GCC- band; every test stop is on a PB-TEST band.
-- No real band uses either prefix, and that is the only thing marking them, so
-- do not reuse those prefixes for anything real.
--
-- Flagging rather than deleting: flagged rows drop out of the wall, the map and
-- the home-page counts, but the history stays if the decision is reversed.

-- What the page looks like before flipping.
select
  count(*) filter (where band_id like 'GCC-%' or band_id like 'PB-TEST%') as seeded_stops,
  count(*) filter (where band_id not like 'GCC-%' and band_id not like 'PB-TEST%') as real_stops,
  count(distinct country) filter (where band_id not like 'GCC-%' and band_id not like 'PB-TEST%') as real_countries
from public.registrations;

-- The switch.
update public.registrations
   set flagged = true,
       flagged_reason = 'Seed data retired ' || to_char(now(), 'YYYY-MM-DD')
 where (band_id like 'GCC-%' or band_id like 'PB-TEST%')
   and flagged = false;

-- To reverse it:
-- update public.registrations set flagged = false, flagged_reason = null
--  where flagged_reason like 'Seed data retired%';
