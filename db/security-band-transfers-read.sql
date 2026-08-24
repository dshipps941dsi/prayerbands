-- Handoff notes are private messages between a giver and a recipient
-- ("Proud of you son"), yet band_transfers carried a `USING (true)` SELECT
-- policy AND a table-level SELECT grant to anon. Anyone with the public
-- (anon) key — which ships in the browser bundle — could read every note and
-- the giver's user_id straight off the REST API:
--   GET /rest/v1/band_transfers?select=*
--
-- Nothing legitimate depends on that read. Every band_transfers access in the
-- app goes through the service key server-side (band-status, register-band,
-- initiate/cancel-transfer, admin), which bypasses both RLS and grants. So we
-- lock the table to match bands/registrations: no anonymous read at all, and
-- a signed-in user may see only transfers they themselves sent.

drop policy if exists "Anyone can read transfers" on public.band_transfers;

create policy "Participants read their own transfers"
  on public.band_transfers
  for select
  using (auth.uid() = from_user_id);

-- Belt and suspenders: even revoke the raw SELECT grant from anon, so an
-- anonymous caller is refused at the privilege layer before any policy runs.
revoke select on public.band_transfers from anon;
