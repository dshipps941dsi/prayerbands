-- Applied to production 2026-08-20.
--
-- Referral credit expires 90 days after it is earned.
--
-- Expiry is written as its own ledger entry rather than filtered out at read
-- time. Two reasons: the balance stays a plain sum of the ledger, and a person
-- asking "where did my $3 go" can be shown the row that took it.
alter table public.credit_ledger add column if not exists expires_at timestamptz;
alter table public.credit_ledger add column if not exists parent_id bigint
  references public.credit_ledger (id) on delete cascade;

alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in ('referral', 'redemption', 'adjustment', 'expiry'));

-- An earning can only be expired once, however many times the sweep runs.
create unique index if not exists credit_ledger_one_expiry_per_entry
  on public.credit_ledger (parent_id) where reason = 'expiry';

create index if not exists credit_ledger_expiry_due_idx
  on public.credit_ledger (expires_at) where expires_at is not null and delta_cents > 0;

-- Sweep one person's expired credit.
--
-- Spending consumes the oldest credit first, so someone who earns in January
-- and again in March, then spends once, has their January credit used up rather
-- than left to expire. Only what is genuinely unspent when the clock runs out
-- is taken back.
--
-- Idempotent: the expiry rows it writes are themselves negative, so a second
-- run sees them as already consumed and has nothing left to cancel.
create or replace function public.expire_credit(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumed bigint;
  v_remainder bigint;
  r record;
begin
  select coalesce(-sum(delta_cents), 0) into v_consumed
    from credit_ledger where user_id = p_user and delta_cents < 0;

  for r in
    select id, delta_cents, expires_at
      from credit_ledger
     where user_id = p_user and delta_cents > 0
     order by created_at, id
  loop
    if v_consumed >= r.delta_cents then
      v_consumed := v_consumed - r.delta_cents;
    else
      v_remainder := r.delta_cents - v_consumed;
      v_consumed := 0;
      if r.expires_at is not null and r.expires_at <= now() then
        insert into credit_ledger (user_id, delta_cents, reason, parent_id, note)
        values (p_user, -v_remainder, 'expiry', r.id, 'Expired 90 days after it was earned')
        on conflict do nothing;
      end if;
    end if;
  end loop;
end;
$$;

-- Called only from the server on the service client, like downline_of.
revoke execute on function public.expire_credit(uuid) from public;
grant execute on function public.expire_credit(uuid) to service_role;
