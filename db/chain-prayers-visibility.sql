-- Applied to production 2026-08-20.
--
-- chain_prayers had row-level security on and no policies at all, which denies
-- everyone except the service role. The dashboard reads it from the browser to
-- build its prayer-activity feed, so the feed has always been empty — 12 real
-- rows that the page displaying them could never see. No error, just nothing.
--
-- A chain prayer is addressed to whoever holds a band, so the people entitled
-- to see one are its requester and anyone who has held that band. Both halves
-- are checked here rather than opening the table up.
create policy "Requester reads their own chain prayers"
  on public.chain_prayers for select
  using (requester_user_id = auth.uid());

create policy "Band holders read that band's chain prayers"
  on public.chain_prayers for select
  using (
    exists (
      select 1 from public.registrations r
       where r.band_id = chain_prayers.band_id
         and r.user_id = auth.uid()
    )
    or exists (
      select 1 from public.bands b
       where b.band_id = chain_prayers.band_id
         and b.owner_id = auth.uid()
    )
  );
