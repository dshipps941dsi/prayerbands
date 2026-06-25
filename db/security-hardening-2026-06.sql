-- Security hardening applied 2026-06 via the Supabase MCP (combined code+DB
-- review). Recorded here for the repo; already applied to the live project.

-- ── Batch A ───────────────────────────────────────────────────────────────
-- Names: code reads profiles.full_name but data lived only in legacy display_name.
update public.profiles set full_name = display_name
 where (full_name is null or full_name = '') and display_name is not null and display_name <> '';
alter table public.profiles drop column if exists display_name;

-- Org RPCs were anon-executable over REST (SECURITY DEFINER). Block anon; keep
-- signed-in users (dashboard) and the service role (server routes incl. the
-- public church page via church-public).
revoke execute on function public.get_org_stats(uuid)  from public, anon;
revoke execute on function public.get_org_lineage(uuid) from public, anon;
grant  execute on function public.get_org_stats(uuid)  to authenticated, service_role;
grant  execute on function public.get_org_lineage(uuid) to authenticated, service_role;

-- Pin search_path on flagged functions.
alter function public.set_band_owner()                         set search_path = public, pg_temp;
alter function public.get_org_stats(uuid)                      set search_path = public, pg_temp;
alter function public.get_org_lineage(uuid)                    set search_path = public, pg_temp;
alter function public.update_updated_at()                      set search_path = public, pg_temp;
alter function public.update_updated_at_column()               set search_path = public, pg_temp;
alter function public.gen_referral_code()                      set search_path = public, pg_temp;
alter function public.set_referral_code()                      set search_path = public, pg_temp;
alter function public.check_rate_limit(text, integer, integer) set search_path = public, pg_temp;

-- Drop the duplicate bands public-read policy.
drop policy if exists "Anyone can view bands" on public.bands;

-- ── Batch B ───────────────────────────────────────────────────────────────
-- orders was readable/insertable/updatable by anon (PII). Admin + Stripe webhook
-- use the service role (bypasses RLS); scope the rest to the site admin.
drop policy if exists "Admin can read orders"    on public.orders;
drop policy if exists "Service can insert orders" on public.orders;
drop policy if exists "Service can update orders" on public.orders;
create policy "Site admin can read orders" on public.orders
  for select using ((auth.jwt() ->> 'email') = 'dshipps941@gmail.com');
create policy "Site admin can update orders" on public.orders
  for update using ((auth.jwt() ->> 'email') = 'dshipps941@gmail.com')
            with check ((auth.jwt() ->> 'email') = 'dshipps941@gmail.com');
-- Admin assigns inventory bands from the dashboard client-side; scope to admin.
create policy "Site admin can update bands" on public.bands
  for update using ((auth.jwt() ->> 'email') = 'dshipps941@gmail.com')
            with check ((auth.jwt() ->> 'email') = 'dshipps941@gmail.com');

-- bands is publicly readable; hide dedication_token (gates dedication writes) by
-- swapping the blanket table SELECT for a column allow-list. Service role keeps
-- full access. NOTE: new bands columns must be added to this grant to be visible
-- to anon/authenticated direct REST reads (app reads go via the service role).
revoke select on public.bands from anon, authenticated;
grant select (
  id, band_id, status, batch, owner_id, upline_user_id, outside_text, inside_text,
  nfc_url, created_date, created_at, org_id, dedication_note, dedication_recipient,
  theme, dedication_viewed, color
) on public.bands to anon, authenticated;
