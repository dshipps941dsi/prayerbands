-- Hide the family/friend test cohort from PUBLIC surfaces only.
--
-- The early testing was all done in one town (Venice) by family and friends —
-- Jackson, Karen, the Strubles, the Hunts, and so on, plus "Dad" in Syracuse.
-- Those are real registrations (not GCC- seed, not PB-TEST), so they were
-- showing on the public map, the prayer wall, and the home-page counts with
-- the kids' real names attached.
--
-- flagged=true drops a registration from the public wall (wall-prayers),
-- the public map and the home-page counts (home-stats) — both filter
-- flagged=false. It does NOT touch the private views: band-status (the band's
-- own journey page), my-reach (the dashboard map) and my-bands all ignore the
-- flag, so every tester still sees their own bands, journeys and reach exactly
-- as before. The GCC- seed cities stay live so the public map still looks global.
--
-- Reversible as a group via the flagged_reason below.

-- Before.
select
  count(*) filter (where band_id not like 'GCC-%' and band_id not like 'PB-TEST%' and not flagged) as cohort_showing,
  count(*) filter (where band_id like 'GCC-%' and not flagged) as gcc_seed_showing
from public.registrations;

-- The switch: hide every currently-public real stop (the Venice/Syracuse cohort).
update public.registrations
   set flagged = true,
       flagged_reason = 'Test cohort hidden from public 2026-08-24'
 where band_id not like 'GCC-%'
   and band_id not like 'PB-TEST%'
   and flagged = false;

-- To reverse:
-- update public.registrations set flagged = false, flagged_reason = null
--  where flagged_reason = 'Test cohort hidden from public 2026-08-24';
