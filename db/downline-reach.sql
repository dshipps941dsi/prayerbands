-- Applied to production 2026-08-19.
--
-- Person-to-person sponsorship. profiles.upline_user_id has existed unwritten
-- since the beginning; bands.upline_user_id says who put a band into
-- circulation, but that is band-level. This is the edge that makes a tree:
-- who introduced this person.
--
-- First-wins by design: whoever gave someone their first band keeps them.
-- Reassigning on a later band would let attribution be taken by whoever handed
-- over a band most recently.
create index if not exists profiles_upline_idx on public.profiles (upline_user_id)
  where upline_user_id is not null;

-- Everyone below `root`, with how many generations down they sit.
--   depth 1     people they gave a band to directly
--   depth 2     those people's recipients
--   no max      total reach
-- The ceiling is a cycle guard: first-wins plus the self-check on write should
-- make cycles impossible, but a recursive CTE over user-influenced data has no
-- business being able to hang the database.
create or replace function public.downline_of(root uuid, max_depth int default null)
returns table(user_id uuid, depth int)
language sql stable security definer set search_path = public
as $$
  with recursive tree as (
    select p.id as user_id, 1 as depth
      from profiles p
     where p.upline_user_id = root and p.id <> root
    union all
    select p.id, t.depth + 1
      from profiles p join tree t on p.upline_user_id = t.user_id
     where t.depth < least(coalesce(max_depth, 20), 20) and p.id <> root
  )
  select user_id, min(depth) as depth from tree
   where max_depth is null or depth <= max_depth
   group by user_id;
$$;
