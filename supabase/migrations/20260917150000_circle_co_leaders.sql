-- Co-leaders: a leader can name members who help run the circle. Leaders and
-- co-leaders post the wall's topics; members write prayers under them.
alter table public.circle_members drop constraint if exists circle_members_role_check;
alter table public.circle_members
  add constraint circle_members_role_check check (role in ('leader', 'co_leader', 'member'));
