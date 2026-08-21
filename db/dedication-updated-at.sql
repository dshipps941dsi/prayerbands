-- Applied to production 2026-08-21.
--
-- "Show me recent dedications" had no answer: nothing recorded when a
-- dedication was written or last changed. bands.created_at is when the band was
-- manufactured, and every band in the 2026-06-16 batch shares one timestamp to
-- the microsecond — so ordering by it puts a message written this morning in
-- among bands from June.
--
-- Left null for the twelve dedications that already existed, because there is
-- no honest way to recover when those were written. Readers show them as
-- undated rather than inventing a time from the band's manufacture date.
--
-- Written by every path that saves a dedication: app/api/save-dedications
-- (the /dedicate page, the admin panel, and the checkout array) and
-- app/api/my-dedications (a buyer editing from their dashboard).

alter table public.bands
  add column if not exists dedication_updated_at timestamptz;

comment on column public.bands.dedication_updated_at is
  'When the dedication was last written. Null for dedications predating this column (2026-08-21).';
