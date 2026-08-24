-- circle_members' SELECT policy queried circle_members itself:
--   USING (circle_id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid()))
-- Postgres re-applies the policy to that inner read → infinite recursion (42P17).
-- Every anon/authenticated read of circle_members — and of circle_prayer_requests
-- and circle_intercessions, whose policies subquery circle_members — returned a
-- 500. It fails closed (deny), so it is a correctness bug rather than a leak, but
-- it means RLS on the Circles tables is not actually doing its job. (The app is
-- unaffected today: every Circles read runs server-side with the service key.)
--
-- Fix the root: a SECURITY DEFINER helper reads circle_members with the owner's
-- rights, so RLS is not re-applied inside it and the self-reference disappears.

create or replace function public.is_circle_member(p_circle uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.circle_members
     where circle_id = p_circle and user_id = auth.uid()
  );
$$;

revoke all on function public.is_circle_member(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid) to authenticated;

drop policy if exists "Members can see who is in their circles" on public.circle_members;
create policy "Members can see who is in their circles"
  on public.circle_members
  for select
  using (public.is_circle_member(circle_id));
