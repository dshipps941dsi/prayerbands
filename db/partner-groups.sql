-- Partner groups: a person's own private labels on the partners they know
-- (Youth Group, Baseball team). Distinct from Circles — a Circle is a shared
-- room strangers join with a code; a group is one person's lens on people they
-- already have, and later a share target in the Journal.
--
-- Everything here is owner-scoped: you only ever see and manage your own groups
-- and who is in them. No anon access at all.

create table if not exists public.partner_groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  sort_order  int  not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists partner_groups_owner_idx on public.partner_groups(owner_id);

create table if not exists public.partner_group_members (
  group_id   uuid not null references public.partner_groups(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (group_id, member_id)
);
create index if not exists partner_group_members_member_idx on public.partner_group_members(member_id);

alter table public.partner_groups        enable row level security;
alter table public.partner_group_members enable row level security;

-- Groups: the owner manages their own, and no one else can see them.
drop policy if exists "Owner manages their groups" on public.partner_groups;
create policy "Owner manages their groups"
  on public.partner_groups for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Membership: gated by owning the parent group (references a different table,
-- so no recursion). The member being tagged is just a uuid; a group is the
-- owner's private note, the tagged person is never told.
drop policy if exists "Owner manages their group members" on public.partner_group_members;
create policy "Owner manages their group members"
  on public.partner_group_members for all
  using      (group_id in (select id from public.partner_groups where owner_id = auth.uid()))
  with check (group_id in (select id from public.partner_groups where owner_id = auth.uid()));

-- Service-role (the API) bypasses RLS; no anonymous access to either table.
revoke all on public.partner_groups        from anon;
revoke all on public.partner_group_members from anon;
