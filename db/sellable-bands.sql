-- Applied to production 2026-08-21.
--
-- The store used to sell against product_variants.stock: a number typed in by
-- hand, moved only by the Stripe webhook. Every other way a band leaves the box
-- — handed out at a meeting, claimed, registered, assigned to an order, taken
-- by one of the kids for a friend — changed the bands table and not that number.
-- So it drifted, silently, in the direction that oversells. At the time of this
-- migration it claimed 355 bands across the catalogue against 536 really on the
-- shelf, wrong in both directions per size (Military S said 10 with 8 in the
-- box; Beach Life said 5 per size with 49 in the box), and it showed 0 for VHS
-- while 48 sat there unsold.
--
-- The fix is to stop keeping the second number. A band's status already records
-- everything that happens to it, so the storefront counts this view on every
-- read and cannot fall behind: whatever takes a band out of circulation takes
-- it out of stock in the same motion, with nobody having to remember.
--
-- The `not exists` clause is belt and braces. Every path that puts a band into
-- circulation already flips its status, so as of today no band is both tapped
-- and on the shelf. But a band handed to someone in person and never recorded
-- stays 'unregistered' until it is tapped, and if any future path forgets the
-- status update, the registration row is still proof the band is out in the
-- world. Physical evidence beats a flag somebody had to set.

create or replace view public.sellable_bands as
  select b.band_id, b.theme, b.color, b.size, b.status, b.owner_id, b.org_id
    from public.bands b
   where b.status = 'unregistered'
     and b.owner_id is null
     and b.org_id is null
     and not exists (
       select 1 from public.registrations r where r.band_id = b.band_id
     );

-- Service role only. band_id is enumerable stock and must not reach the public
-- API roles. PUBLIC is revoked explicitly: a grant there survives revoking anon
-- and authenticated individually, which is how downline_of stayed readable
-- through the first attempt to close it.
revoke all on public.sellable_bands from public, anon, authenticated;

-- Read by app/api/products (the storefront), app/api/admin/assign-order-bands
-- (the picker) and app/api/admin/activity (the dashboard), so all three answer
-- "what can we ship" identically.

-- Also applied, separately: products.has_sizes was true for pack-100, a 100-band
-- assorted pack. The store therefore looked up a size-specific variant row and
-- reported one Community Pack available in Large while 536 bands sat on the
-- shelf. Packs are not sized.
--   update public.products set has_sizes = false, sizes = '[]'::jsonb
--    where slug = 'pack-100';
