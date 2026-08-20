-- Applied to production 2026-08-20.
--
-- Referral rewards. Until now checkout wrote a row to `referrals` and nothing
-- ever read it, so no reward was calculated or paid. Worse, the row was written
-- when the checkout page opened rather than when payment succeeded — all seven
-- existing rows are abandoned carts, not sales.
--
-- The reward is store credit, earned when Stripe confirms payment and spent
-- automatically at the referrer's next checkout.

-- A ledger rather than a balance column: a running total can be corrected but
-- never explained, and this is money. Balance is sum(delta_cents).
create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta_cents int not null,
  reason text not null check (reason in ('referral', 'redemption', 'adjustment')),
  order_id bigint,
  stripe_session_id text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

-- Stripe retries webhooks, so the same session must never be credited or
-- charged twice. One row per (session, reason) makes the second attempt a
-- no-op at the database level rather than relying on application checks.
create unique index if not exists credit_ledger_once_per_session
  on public.credit_ledger (stripe_session_id, reason)
  where stripe_session_id is not null;

alter table public.credit_ledger enable row level security;

drop policy if exists "People read their own credit" on public.credit_ledger;
create policy "People read their own credit"
  on public.credit_ledger for select
  using (user_id = auth.uid());

-- referrals gains the state it needed to be readable as anything.
alter table public.referrals add column if not exists status text not null default 'pending';
alter table public.referrals drop constraint if exists referrals_status_check;
alter table public.referrals add constraint referrals_status_check
  check (status in ('pending', 'earned', 'void'));
alter table public.referrals add column if not exists order_id bigint;
alter table public.referrals add column if not exists credit_cents int;
alter table public.referrals add column if not exists earned_at timestamptz;

create unique index if not exists referrals_session_uniq
  on public.referrals (stripe_session_id) where stripe_session_id is not null;

-- The seven rows on record all predate any of this and none became an order.
update public.referrals r
   set status = 'void'
 where r.status = 'pending'
   and not exists (select 1 from public.orders o where o.stripe_session_id = r.stripe_session_id);

-- $1.50 per referred order. Editable without a deploy, like every other price
-- in the system, so this seed value only matters for a fresh database.
insert into public.site_config (key, value) values ('referral_credit_cents', '150')
  on conflict (key) do nothing;
