-- Prayer Bands: public schema, rendered by public.schema_dump() at 2026-09-18 02:23:40.654451+00
-- Regenerate with `npm run db:schema` after every migration. Do not hand-edit.

-- Applied migrations
--   20260625135112  batch_a_security_hardening
--   20260625135136  batch_a_revoke_anon_org_rpcs
--   20260625135509  batch_b_close_orders_to_anon
--   20260625140520  batch_b_revoke_dedication_token_column
--   20260625140629  batch_b_bands_column_allowlist
--   20260630122441  pnc_unique_pair_either_direction
--   20260630125705  prayer_email_optouts
--   20260630134403  get_org_lineage_membership_guard
--   20260630134421  add_covering_fk_indexes
--   20260630134449  drop_open_registrations_insert_policy
--   20260630134620  drop_orphaned_tables_followers_lineage
--   20260702182739  add_bands_size_column
--   20260709132752  add_prayer_network_requests_audience
--   20260711151815  add_prayer_requests_testimony_public
--   20260712131509  allow_bands_status_assigned
--   20260712131549  add_orders_assigned_band_ids
--   20260819004415  auto_create_profile_on_signup
--   20260819102852  band_ownership_audit
--   20260819212135  band_upline_attribution
--   20260819213421  downline_reach
--   20260820113051  band_handouts
--   20260820113349  bands_status_handed_out
--   20260820130526  close_public_exposure
--   20260820130600  revoke_downline_of_from_public
--   20260820130702  allow_replaced_and_private
--   20260820130931  chain_prayers_visibility
--   20260820131129  integrity_and_indexes
--   20260820134853  referral_credit
--   20260820141259  credit_expiry
--   20260820142200  referral_codes
--   20260820142304  referral_code_format_match
--   20260821103421  sellable_bands_view
--   20260821123833  dedication_updated_at
--   20260821140244  registrations_source
--   20260822031559  band_handouts_direction
--   20260824174302  security_band_transfers_read
--   20260824174323  fix_circle_rls_recursion
--   20260824222431  partner_groups
--   20260824232702  prayer_mutes
--   20260824234151  journal_lists
--   20260825000742  profile_connect_code
--   20260825005456  prayer_request_comments
--   20260825123651  referral_code_give_prefix
--   20260826114646  profiles_avatar_icon
--   20260826123547  profiles_avatar_initials_font
--   20260826144417  subscription_credit_model
--   20260827100120  profiles_team_role
--   20260831181524  create_announcements
--   20260831200641  create_prayer_encouragements
--   20260901001209  add_profiles_default_band_id
--   20260904232941  add_band_transfers_recipient_name
--   20260910124057  push_subscriptions
--   20260914195756  registrations_registered_by
--   20260914223054  integrity_alerts
--   20260914223119  stalled_signups_fn
--   20260915010540  band_transfers_from_name
--   20260915013752  review_indexes_2026_09
--   20260915020352  org_applications
--   20260915021746  bands_tap_secret
--   20260915022227  bands_tap_secret_enc
--   20260915095117  schema_dump_fn

-- Extensions
create extension if not exists pg_stat_statements with schema extensions; -- 1.11
create extension if not exists pgcrypto with schema extensions; -- 1.3
create extension if not exists supabase_vault with schema vault; -- 0.3.1
create extension if not exists "uuid-ossp" with schema extensions; -- 1.1
create sequence if not exists public.band_handouts_id_seq;
create sequence if not exists public.band_ownership_events_id_seq;
create sequence if not exists public.bands_id_seq;
create sequence if not exists public.chain_prayers_id_seq;
create sequence if not exists public.credit_ledger_id_seq;
create sequence if not exists public.order_bands_id_seq;
create sequence if not exists public.orders_id_seq;
create sequence if not exists public.prayer_acknowledgments_id_seq;
create sequence if not exists public.registrations_id_seq;

-- Tables
create table public.announcements (
  id uuid default gen_random_uuid() not null,
  title text not null,
  body text default ''::text not null,
  cta_label text,
  cta_href text,
  target_user_id uuid,
  active boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table public.band_handouts (
  id bigint default nextval('band_handouts_id_seq'::regclass) not null,
  band_id text not null,
  reason text not null,
  recipient_name text,
  recipient_email text,
  upline_user_id uuid,
  upline_email text,
  note text,
  actor_uid uuid,
  created_at timestamp with time zone default now() not null,
  direction text default 'out'::text not null
);

create table public.band_ownership_events (
  id bigint default nextval('band_ownership_events_id_seq'::regclass) not null,
  band_id text not null,
  old_owner_id uuid,
  new_owner_id uuid,
  actor_uid uuid,
  changed_at timestamp with time zone default now() not null
);

create table public.band_themes (
  key text not null,
  label text not null,
  data jsonb default '{}'::jsonb not null,
  is_builtin boolean default false not null,
  sort_order integer default 100 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.band_transfers (
  id uuid default gen_random_uuid() not null,
  band_id text,
  from_user_id uuid,
  note text,
  status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  recipient_name text,
  from_name text,
  reminded_at timestamp with time zone
);

create table public.bands (
  id bigint default nextval('bands_id_seq'::regclass) not null,
  band_id text not null,
  status text default 'unregistered'::text,
  batch text,
  owner_id uuid,
  upline_user_id uuid,
  outside_text text,
  inside_text text,
  nfc_url text,
  created_date text,
  created_at timestamp with time zone default now(),
  org_id uuid,
  dedication_note text,
  dedication_recipient text,
  theme text default 'default'::text,
  dedication_viewed boolean default false,
  dedication_token text default (gen_random_uuid())::text,
  color text,
  size text,
  upline_email text,
  dedication_updated_at timestamp with time zone,
  tap_secret_hash text,
  tap_secret_enc text
);

create table public.chain_prayers (
  id bigint default nextval('chain_prayers_id_seq'::regclass) not null,
  band_id text not null,
  prayer_text text not null,
  sender_city text,
  sender_country text,
  sender_contact text,
  sender_contact_type text,
  targets jsonb,
  sent_at timestamp with time zone default now(),
  requester_user_id uuid,
  requester_name text
);

create table public.circle_intercessions (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.circle_members (
  id uuid default gen_random_uuid() not null,
  circle_id uuid not null,
  user_id uuid not null,
  role text default 'member'::text not null,
  joined_at timestamp with time zone default now()
);

create table public.circle_prayer_replies (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

create table public.circle_prayer_requests (
  id uuid default gen_random_uuid() not null,
  circle_id uuid not null,
  user_id uuid not null,
  request_text text not null,
  is_answered boolean default false,
  answered_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  title text,
  kind text default 'request'::text not null
);

create table public.contact_submissions (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  category text not null,
  subject text,
  message text not null,
  recaptcha_score numeric(3,2),
  status text default 'new'::text not null,
  admin_notes text,
  faq_candidate boolean default false,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.credit_ledger (
  id bigint default nextval('credit_ledger_id_seq'::regclass) not null,
  user_id uuid not null,
  delta_cents integer not null,
  reason text not null,
  order_id bigint,
  stripe_session_id text,
  note text,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone,
  parent_id bigint
);

create table public.faq_entries (
  id uuid default gen_random_uuid() not null,
  question text not null,
  answer text not null,
  category text,
  published boolean default false,
  sort_order integer default 100,
  view_count integer default 0,
  deflection_count integer default 0,
  source_submission_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.integrity_alerts (
  key text not null,
  kind text not null,
  detail jsonb default '{}'::jsonb not null,
  first_seen timestamp with time zone default now() not null,
  last_seen timestamp with time zone default now() not null,
  notified_at timestamp with time zone,
  resolved_at timestamp with time zone
);

create table public.journal_lists (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  sort_order integer default 100 not null,
  created_at timestamp with time zone default now() not null
);

create table public.order_bands (
  id bigint default nextval('order_bands_id_seq'::regclass) not null,
  order_id bigint,
  type text,
  custom_message text,
  verse text,
  color text,
  band_id text,
  status text default 'ordered'::text,
  created_at timestamp with time zone default now()
);

create table public.orders (
  id bigint default nextval('orders_id_seq'::regclass) not null,
  stripe_session_id text,
  customer_name text,
  customer_email text,
  shipping_address jsonb,
  amount_total integer,
  payment_status text,
  has_custom_bands boolean default false,
  order_metadata jsonb,
  status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  org_id uuid,
  tracking_number text,
  assigned_band_ids text[]
);

create table public.org_applications (
  id uuid default gen_random_uuid() not null,
  name text not null,
  prefix text not null,
  subdomain text not null,
  location text,
  website text,
  pastor text not null,
  email text not null,
  status text default 'pending'::text not null,
  note text,
  org_id uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.org_invites (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  email text not null,
  token text not null,
  display_name text,
  invited_by uuid,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone default (now() + '14 days'::interval) not null
);

create table public.organizations (
  id uuid default gen_random_uuid() not null,
  name text not null,
  prefix text not null,
  subdomain text not null,
  color text default '#1a6b4a'::text,
  plan text default 'ministry'::text,
  admin_id uuid,
  location text,
  website text,
  created_at timestamp with time zone default now(),
  logo_url text,
  default_theme text default 'default'::text
);

create table public.partner_group_members (
  group_id uuid not null,
  member_id uuid not null,
  added_at timestamp with time zone default now() not null
);

create table public.partner_groups (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  sort_order integer default 100 not null,
  created_at timestamp with time zone default now() not null
);

create table public.prayer_acknowledgments (
  id bigint default nextval('prayer_acknowledgments_id_seq'::regclass) not null,
  chain_prayer_id bigint,
  acknowledger_email text,
  acknowledger_name text,
  acknowledged_at timestamp with time zone default now()
);

create table public.prayer_circles (
  id uuid default gen_random_uuid() not null,
  name text not null,
  description text,
  join_code text not null,
  created_by uuid not null,
  qualifying_band_id bigint,
  is_closed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.prayer_email_optouts (
  id uuid default gen_random_uuid() not null,
  email text not null,
  sender_user_id uuid,
  created_at timestamp with time zone default now()
);

create table public.prayer_encouragements (
  id uuid default gen_random_uuid() not null,
  from_user_id uuid not null,
  to_user_id uuid not null,
  note text,
  created_at timestamp with time zone default now() not null
);

create table public.prayer_intercessions (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  intercessor_id uuid not null,
  prayed_at timestamp with time zone default now()
);

create table public.prayer_mutes (
  muter_id uuid not null,
  muted_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.prayer_network_connections (
  id uuid default gen_random_uuid() not null,
  requester_id uuid not null,
  recipient_id uuid not null,
  band_id text,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.prayer_network_intercessions (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.prayer_network_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  request_text text not null,
  is_answered boolean default false,
  answered_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  visibility text default 'private'::text not null,
  public_name text,
  audience text default 'network'::text not null,
  list_id uuid,
  allow_comments boolean default false not null,
  excluded_user_ids uuid[] default '{}'::uuid[] not null
);

create table public.prayer_request_comments (
  id uuid default gen_random_uuid() not null,
  request_id uuid not null,
  user_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

create table public.prayer_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  body text,
  visibility text default 'network'::text,
  status text default 'active'::text,
  answered_testimony text,
  answered_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  band_id text,
  testimony_public boolean default false
);

create table public.product_variants (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  size text default ''::text not null,
  stock integer default 0 not null,
  backorder boolean default false not null
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name text not null,
  description text default ''::text,
  category text default 'band'::text not null,
  theme text default 'default'::text,
  color text default '#C8A96E'::text,
  icon text default '✝'::text,
  tag text,
  price_cents integer default 0 not null,
  bands_per_unit integer default 1 not null,
  features jsonb default '[]'::jsonb,
  sizes jsonb default '[]'::jsonb,
  has_sizes boolean default false,
  multi_discount boolean default false,
  image_urls jsonb default '[]'::jsonb,
  active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  discount_tiers jsonb default '[]'::jsonb not null
);

create table public.profiles (
  id uuid not null,
  master_id text,
  email text,
  avatar_url text,
  upline_user_id uuid,
  upline_band_id text,
  created_at timestamp with time zone default now(),
  org_id uuid,
  referral_code text,
  referral_reward_code text,
  email_notifications boolean default true,
  notifications_last_seen timestamp with time zone,
  dismissed_notifications jsonb default '[]'::jsonb,
  full_name text,
  connect_code text default gen_connect_code() not null,
  avatar_icon text,
  avatar_initials text default 'single'::text,
  avatar_font text default 'serif'::text,
  team_role text,
  default_band_id text
);

create table public.push_subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp with time zone default now() not null,
  last_used_at timestamp with time zone,
  failed_at timestamp with time zone
);

create table public.rate_limit_buckets (
  key text not null,
  count integer default 0 not null,
  window_start timestamp with time zone default now() not null
);

create table public.referrals (
  id uuid default gen_random_uuid() not null,
  referrer_user_id uuid not null,
  referred_user_id uuid,
  stripe_session_id text,
  referee_discount_applied boolean default false,
  referrer_reward_issued boolean default false,
  referrer_stripe_coupon_id text,
  created_at timestamp with time zone default now(),
  converted_at timestamp with time zone,
  status text default 'pending'::text not null,
  order_id bigint,
  credit_cents integer,
  earned_at timestamp with time zone
);

create table public.registrations (
  id bigint default nextval('registrations_id_seq'::regclass) not null,
  band_id text not null,
  user_id uuid,
  user_name text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  prayer text,
  verse text,
  email text,
  ip_address text,
  registered_at timestamp with time zone default now(),
  state text,
  flagged boolean default false,
  flagged_reason text,
  source text default 'tap'::text not null,
  registered_by uuid
);

create table public.site_config (
  key text not null,
  value text not null,
  label text,
  updated_at timestamp with time zone default now()
);

create table public.subscription_plans (
  id text not null,
  name text not null,
  bands_per_cycle integer default 1 not null,
  interval_months integer default 1 not null,
  band_price numeric(10,2) not null,
  shipping_price numeric(10,2) default 2.99 not null,
  total_price numeric(10,2) not null,
  discount_percent integer default 0 not null,
  stripe_price_id text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now()
);

create table public.subscription_shipments (
  id uuid default gen_random_uuid() not null,
  subscription_id uuid not null,
  user_id uuid not null,
  status text default 'pending'::text not null,
  bands_quantity integer default 1 not null,
  band_color text not null,
  shipping_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country text default 'US'::text,
  tracking_number text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  stripe_invoice_id text,
  band_ids text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  dedication_recipient text,
  dedication_note text,
  band_design text
);

create table public.subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  plan_id text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text default 'active'::text not null,
  band_color text default 'sky'::text not null,
  shipping_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country text default 'US'::text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  next_ship_date timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancel_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  cancel_at_period_end boolean default false not null,
  band_size text default 'M'::text not null,
  band_design text
);

create table public.verse_walks (
  user_id uuid not null,
  total integer default 0 not null,
  run integer default 0 not null,
  last_seen date,
  updated_at timestamp with time zone default now() not null
);

-- Constraints
alter table public.announcements add constraint announcements_pkey PRIMARY KEY (id);
alter table public.band_handouts add constraint band_handouts_direction_check CHECK ((direction = ANY (ARRAY['out'::text, 'in'::text])));
alter table public.band_handouts add constraint band_handouts_pkey PRIMARY KEY (id);
alter table public.band_ownership_events add constraint band_ownership_events_pkey PRIMARY KEY (id);
alter table public.band_themes add constraint band_themes_pkey PRIMARY KEY (key);
alter table public.band_transfers add constraint band_transfers_pkey PRIMARY KEY (id);
alter table public.band_transfers add constraint band_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])));
alter table public.bands add constraint bands_band_id_key UNIQUE (band_id);
alter table public.bands add constraint bands_pkey PRIMARY KEY (id);
alter table public.bands add constraint bands_status_check CHECK ((status = ANY (ARRAY['unregistered'::text, 'registered'::text, 'active'::text, 'pending_transfer'::text, 'assigned'::text, 'handed_out'::text, 'replaced'::text])));
alter table public.chain_prayers add constraint chain_prayers_pkey PRIMARY KEY (id);
alter table public.circle_intercessions add constraint circle_intercessions_pkey PRIMARY KEY (id);
alter table public.circle_intercessions add constraint circle_intercessions_request_id_user_id_key UNIQUE (request_id, user_id);
alter table public.circle_members add constraint circle_members_circle_id_user_id_key UNIQUE (circle_id, user_id);
alter table public.circle_members add constraint circle_members_pkey PRIMARY KEY (id);
alter table public.circle_members add constraint circle_members_role_check CHECK ((role = ANY (ARRAY['leader'::text, 'co_leader'::text, 'member'::text])));
alter table public.circle_prayer_replies add constraint circle_prayer_replies_body_check CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 1000)));
alter table public.circle_prayer_replies add constraint circle_prayer_replies_pkey PRIMARY KEY (id);
alter table public.circle_prayer_requests add constraint circle_prayer_requests_kind_check CHECK ((kind = ANY (ARRAY['request'::text, 'update'::text])));
alter table public.circle_prayer_requests add constraint circle_prayer_requests_pkey PRIMARY KEY (id);
alter table public.circle_prayer_requests add constraint circle_prayer_requests_title_check CHECK (((title IS NULL) OR (char_length(title) <= 120)));
alter table public.contact_submissions add constraint contact_submissions_category_check CHECK ((category = ANY (ARRAY['order'::text, 'ministry'::text, 'technical'::text, 'partnership'::text, 'subscription'::text, 'other'::text])));
alter table public.contact_submissions add constraint contact_submissions_pkey PRIMARY KEY (id);
alter table public.contact_submissions add constraint contact_submissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'spam'::text])));
alter table public.credit_ledger add constraint credit_ledger_pkey PRIMARY KEY (id);
alter table public.credit_ledger add constraint credit_ledger_reason_check CHECK ((reason = ANY (ARRAY['referral'::text, 'redemption'::text, 'adjustment'::text, 'expiry'::text, 'subscription'::text])));
alter table public.faq_entries add constraint faq_entries_category_check CHECK ((category = ANY (ARRAY['order'::text, 'ministry'::text, 'technical'::text, 'partnership'::text, 'subscription'::text, 'general'::text])));
alter table public.faq_entries add constraint faq_entries_pkey PRIMARY KEY (id);
alter table public.integrity_alerts add constraint integrity_alerts_pkey PRIMARY KEY (key);
alter table public.journal_lists add constraint journal_lists_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 60)));
alter table public.journal_lists add constraint journal_lists_pkey PRIMARY KEY (id);
alter table public.order_bands add constraint order_bands_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_stripe_session_id_key UNIQUE (stripe_session_id);
alter table public.org_applications add constraint org_applications_pkey PRIMARY KEY (id);
alter table public.org_applications add constraint org_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text])));
alter table public.org_invites add constraint org_invites_pkey PRIMARY KEY (id);
alter table public.org_invites add constraint org_invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text])));
alter table public.org_invites add constraint org_invites_token_key UNIQUE (token);
alter table public.organizations add constraint organizations_pkey PRIMARY KEY (id);
alter table public.organizations add constraint organizations_prefix_key UNIQUE (prefix);
alter table public.organizations add constraint organizations_subdomain_key UNIQUE (subdomain);
alter table public.partner_group_members add constraint partner_group_members_pkey PRIMARY KEY (group_id, member_id);
alter table public.partner_groups add constraint partner_groups_name_check CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 60)));
alter table public.partner_groups add constraint partner_groups_pkey PRIMARY KEY (id);
alter table public.prayer_acknowledgments add constraint prayer_acknowledgments_pkey PRIMARY KEY (id);
alter table public.prayer_circles add constraint prayer_circles_join_code_key UNIQUE (join_code);
alter table public.prayer_circles add constraint prayer_circles_pkey PRIMARY KEY (id);
alter table public.prayer_email_optouts add constraint prayer_email_optouts_pkey PRIMARY KEY (id);
alter table public.prayer_encouragements add constraint prayer_encouragements_pkey PRIMARY KEY (id);
alter table public.prayer_intercessions add constraint prayer_intercessions_pkey PRIMARY KEY (id);
alter table public.prayer_mutes add constraint prayer_mutes_pkey PRIMARY KEY (muter_id, muted_id);
alter table public.prayer_network_connections add constraint prayer_network_connections_pkey PRIMARY KEY (id);
alter table public.prayer_network_connections add constraint prayer_network_connections_requester_id_recipient_id_key UNIQUE (requester_id, recipient_id);
alter table public.prayer_network_connections add constraint prayer_network_connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));
alter table public.prayer_network_intercessions add constraint prayer_network_intercessions_pkey PRIMARY KEY (id);
alter table public.prayer_network_intercessions add constraint prayer_network_intercessions_request_id_user_id_key UNIQUE (request_id, user_id);
alter table public.prayer_network_requests add constraint prayer_network_requests_pkey PRIMARY KEY (id);
alter table public.prayer_network_requests add constraint prayer_network_requests_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'public'::text])));
alter table public.prayer_request_comments add constraint prayer_request_comments_body_check CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 1000)));
alter table public.prayer_request_comments add constraint prayer_request_comments_pkey PRIMARY KEY (id);
alter table public.prayer_requests add constraint prayer_requests_pkey PRIMARY KEY (id);
alter table public.prayer_requests add constraint prayer_requests_visibility_check CHECK ((visibility = ANY (ARRAY['network'::text, 'public'::text, 'both'::text, 'private'::text])));
alter table public.product_variants add constraint product_variants_pkey PRIMARY KEY (id);
alter table public.product_variants add constraint product_variants_product_id_size_key UNIQUE (product_id, size);
alter table public.products add constraint products_pkey PRIMARY KEY (id);
alter table public.products add constraint products_slug_key UNIQUE (slug);
alter table public.profiles add constraint profiles_connect_code_key UNIQUE (connect_code);
alter table public.profiles add constraint profiles_master_id_key UNIQUE (master_id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_referral_code_key UNIQUE (referral_code);
alter table public.profiles add constraint profiles_team_role_check CHECK (((team_role IS NULL) OR (team_role = ANY (ARRAY['admin'::text, 'fulfillment'::text]))));
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key UNIQUE (endpoint);
alter table public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id);
alter table public.rate_limit_buckets add constraint rate_limit_buckets_pkey PRIMARY KEY (key);
alter table public.referrals add constraint referrals_pkey PRIMARY KEY (id);
alter table public.referrals add constraint referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'earned'::text, 'void'::text])));
alter table public.registrations add constraint registrations_pkey PRIMARY KEY (id);
alter table public.registrations add constraint registrations_source_check CHECK ((source = ANY (ARRAY['tap'::text, 'wall'::text])));
alter table public.site_config add constraint site_config_pkey PRIMARY KEY (key);
alter table public.subscription_plans add constraint subscription_plans_pkey PRIMARY KEY (id);
alter table public.subscription_shipments add constraint subscription_shipments_pkey PRIMARY KEY (id);
alter table public.subscription_shipments add constraint subscription_shipments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'failed'::text])));
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'cancelled'::text, 'past_due'::text])));
alter table public.subscriptions add constraint subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
alter table public.verse_walks add constraint verse_walks_pkey PRIMARY KEY (user_id);
alter table public.announcements add constraint announcements_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.band_transfers add constraint band_transfers_band_id_fkey FOREIGN KEY (band_id) REFERENCES bands(band_id);
alter table public.band_transfers add constraint band_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id);
alter table public.bands add constraint bands_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
alter table public.bands add constraint bands_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.bands add constraint bands_upline_user_id_fkey FOREIGN KEY (upline_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.chain_prayers add constraint chain_prayers_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES profiles(id);
alter table public.circle_intercessions add constraint circle_intercessions_request_id_fkey FOREIGN KEY (request_id) REFERENCES circle_prayer_requests(id) ON DELETE CASCADE;
alter table public.circle_intercessions add constraint circle_intercessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.circle_members add constraint circle_members_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES prayer_circles(id) ON DELETE CASCADE;
alter table public.circle_members add constraint circle_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.circle_prayer_replies add constraint circle_prayer_replies_request_id_fkey FOREIGN KEY (request_id) REFERENCES circle_prayer_requests(id) ON DELETE CASCADE;
alter table public.circle_prayer_replies add constraint circle_prayer_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.circle_prayer_requests add constraint circle_prayer_requests_circle_id_fkey FOREIGN KEY (circle_id) REFERENCES prayer_circles(id) ON DELETE CASCADE;
alter table public.circle_prayer_requests add constraint circle_prayer_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.credit_ledger add constraint credit_ledger_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES credit_ledger(id) ON DELETE CASCADE;
alter table public.credit_ledger add constraint credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.faq_entries add constraint faq_entries_source_submission_id_fkey FOREIGN KEY (source_submission_id) REFERENCES contact_submissions(id) ON DELETE SET NULL;
alter table public.journal_lists add constraint journal_lists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.order_bands add constraint order_bands_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
alter table public.orders add constraint orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
alter table public.org_applications add constraint org_applications_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
alter table public.org_applications add constraint org_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.org_invites add constraint org_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.org_invites add constraint org_invites_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public.organizations add constraint organizations_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id);
alter table public.partner_group_members add constraint partner_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES partner_groups(id) ON DELETE CASCADE;
alter table public.partner_group_members add constraint partner_group_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.partner_groups add constraint partner_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.prayer_acknowledgments add constraint prayer_acknowledgments_chain_prayer_id_fkey FOREIGN KEY (chain_prayer_id) REFERENCES chain_prayers(id);
alter table public.prayer_circles add constraint prayer_circles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_circles add constraint prayer_circles_qualifying_band_id_fkey FOREIGN KEY (qualifying_band_id) REFERENCES bands(id) ON DELETE SET NULL;
alter table public.prayer_email_optouts add constraint prayer_email_optouts_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_encouragements add constraint prayer_encouragements_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_encouragements add constraint prayer_encouragements_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_intercessions add constraint prayer_intercessions_intercessor_id_fkey FOREIGN KEY (intercessor_id) REFERENCES auth.users(id);
alter table public.prayer_intercessions add constraint prayer_intercessions_request_id_fkey FOREIGN KEY (request_id) REFERENCES prayer_requests(id);
alter table public.prayer_mutes add constraint prayer_mutes_muted_id_fkey FOREIGN KEY (muted_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.prayer_mutes add constraint prayer_mutes_muter_id_fkey FOREIGN KEY (muter_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.prayer_network_connections add constraint prayer_network_connections_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_network_connections add constraint prayer_network_connections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_network_intercessions add constraint prayer_network_intercessions_request_id_fkey FOREIGN KEY (request_id) REFERENCES prayer_network_requests(id) ON DELETE CASCADE;
alter table public.prayer_network_intercessions add constraint prayer_network_intercessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_network_requests add constraint prayer_network_requests_list_id_fkey FOREIGN KEY (list_id) REFERENCES journal_lists(id) ON DELETE SET NULL;
alter table public.prayer_network_requests add constraint prayer_network_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.prayer_request_comments add constraint prayer_request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES prayer_network_requests(id) ON DELETE CASCADE;
alter table public.prayer_request_comments add constraint prayer_request_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.prayer_requests add constraint prayer_requests_band_id_fkey FOREIGN KEY (band_id) REFERENCES bands(band_id);
alter table public.prayer_requests add constraint prayer_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public.product_variants add constraint product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
alter table public.profiles add constraint profiles_upline_user_id_fkey FOREIGN KEY (upline_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.referrals add constraint referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id);
alter table public.referrals add constraint referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id);
alter table public.registrations add constraint fk_registrations_band_id FOREIGN KEY (band_id) REFERENCES bands(band_id);
alter table public.registrations add constraint registrations_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.registrations add constraint registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.subscription_shipments add constraint subscription_shipments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;
alter table public.subscription_shipments add constraint subscription_shipments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table public.subscriptions add constraint subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);
alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.verse_walks add constraint verse_walks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX announcements_active_created_idx ON public.announcements USING btree (active, created_at DESC);
CREATE INDEX band_handouts_band_idx ON public.band_handouts USING btree (band_id, created_at DESC);
CREATE INDEX band_handouts_recent_idx ON public.band_handouts USING btree (created_at DESC);
CREATE INDEX band_ownership_events_band_idx ON public.band_ownership_events USING btree (band_id, changed_at DESC);
CREATE INDEX band_ownership_events_recent_idx ON public.band_ownership_events USING btree (changed_at DESC);
CREATE INDEX idx_band_transfers_band_id ON public.band_transfers USING btree (band_id);
CREATE INDEX idx_band_transfers_from_user_id ON public.band_transfers USING btree (from_user_id);
CREATE INDEX bands_owner_id_idx ON public.bands USING btree (owner_id) WHERE (owner_id IS NOT NULL);
CREATE INDEX bands_status_idx ON public.bands USING btree (status);
CREATE INDEX bands_upline_email_idx ON public.bands USING btree (lower(upline_email)) WHERE ((upline_email IS NOT NULL) AND (upline_user_id IS NULL));
CREATE INDEX bands_upline_user_idx ON public.bands USING btree (upline_user_id) WHERE (upline_user_id IS NOT NULL);
CREATE INDEX idx_bands_band_id ON public.bands USING btree (band_id);
CREATE INDEX idx_bands_org_id ON public.bands USING btree (org_id);
CREATE INDEX chain_prayers_band_id_idx ON public.chain_prayers USING btree (band_id);
CREATE INDEX idx_chain_prayers_requester_user_id ON public.chain_prayers USING btree (requester_user_id);
CREATE INDEX idx_circle_intercessions_request_id ON public.circle_intercessions USING btree (request_id);
CREATE INDEX idx_circle_intercessions_user_id ON public.circle_intercessions USING btree (user_id);
CREATE INDEX idx_circle_members_circle_id ON public.circle_members USING btree (circle_id);
CREATE INDEX idx_circle_members_user_id ON public.circle_members USING btree (user_id);
CREATE INDEX circle_prayer_replies_req_idx ON public.circle_prayer_replies USING btree (request_id, created_at);
CREATE INDEX circle_prayer_replies_user_idx ON public.circle_prayer_replies USING btree (user_id);
CREATE INDEX idx_circle_prayer_requests_circle_id ON public.circle_prayer_requests USING btree (circle_id);
CREATE INDEX idx_circle_prayer_requests_user_id ON public.circle_prayer_requests USING btree (user_id);
CREATE INDEX idx_contact_submissions_category ON public.contact_submissions USING btree (category);
CREATE INDEX idx_contact_submissions_created ON public.contact_submissions USING btree (created_at DESC);
CREATE INDEX idx_contact_submissions_faq_cand ON public.contact_submissions USING btree (faq_candidate) WHERE (faq_candidate = true);
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions USING btree (status);
CREATE INDEX credit_ledger_expiry_due_idx ON public.credit_ledger USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (delta_cents > 0));
CREATE UNIQUE INDEX credit_ledger_once_per_session ON public.credit_ledger USING btree (stripe_session_id, reason) WHERE (stripe_session_id IS NOT NULL);
CREATE UNIQUE INDEX credit_ledger_one_expiry_per_entry ON public.credit_ledger USING btree (parent_id) WHERE (reason = 'expiry'::text);
CREATE INDEX credit_ledger_user_idx ON public.credit_ledger USING btree (user_id, created_at DESC);
CREATE INDEX idx_faq_entries_category ON public.faq_entries USING btree (category);
CREATE INDEX idx_faq_entries_published ON public.faq_entries USING btree (published) WHERE (published = true);
CREATE INDEX idx_faq_entries_sort ON public.faq_entries USING btree (sort_order);
CREATE INDEX idx_faq_entries_source_submission_id ON public.faq_entries USING btree (source_submission_id);
CREATE INDEX journal_lists_owner_idx ON public.journal_lists USING btree (owner_id);
CREATE INDEX idx_order_bands_order_id ON public.order_bands USING btree (order_id);
CREATE INDEX idx_orders_org_id ON public.orders USING btree (org_id);
CREATE INDEX orders_assigned_band_ids_gin ON public.orders USING gin (assigned_band_ids);
CREATE INDEX orders_customer_email_lower_idx ON public.orders USING btree (lower(customer_email));
CREATE INDEX org_applications_status_created_idx ON public.org_applications USING btree (status, created_at DESC);
CREATE INDEX idx_org_invites_invited_by ON public.org_invites USING btree (invited_by);
CREATE INDEX idx_org_invites_org ON public.org_invites USING btree (org_id);
CREATE UNIQUE INDEX idx_org_invites_pending_email ON public.org_invites USING btree (org_id, lower(email)) WHERE (status = 'pending'::text);
CREATE INDEX idx_org_invites_token ON public.org_invites USING btree (token);
CREATE INDEX idx_organizations_admin_id ON public.organizations USING btree (admin_id);
CREATE INDEX partner_group_members_member_idx ON public.partner_group_members USING btree (member_id);
CREATE INDEX partner_groups_owner_idx ON public.partner_groups USING btree (owner_id);
CREATE INDEX idx_prayer_acknowledgments_chain_prayer_id ON public.prayer_acknowledgments USING btree (chain_prayer_id);
CREATE INDEX idx_prayer_circles_created_by ON public.prayer_circles USING btree (created_by);
CREATE INDEX idx_prayer_circles_join_code ON public.prayer_circles USING btree (join_code);
CREATE INDEX idx_prayer_circles_qualifying_band_id ON public.prayer_circles USING btree (qualifying_band_id);
CREATE INDEX idx_prayer_email_optouts_sender_user_id ON public.prayer_email_optouts USING btree (sender_user_id);
CREATE INDEX prayer_email_optouts_email_idx ON public.prayer_email_optouts USING btree (email);
CREATE UNIQUE INDEX prayer_email_optouts_uniq ON public.prayer_email_optouts USING btree (email, sender_user_id) NULLS NOT DISTINCT;
CREATE INDEX prayer_encouragements_from_user_created_idx ON public.prayer_encouragements USING btree (from_user_id, created_at DESC);
CREATE INDEX prayer_encouragements_to_idx ON public.prayer_encouragements USING btree (to_user_id, created_at DESC);
CREATE INDEX prayer_encouragements_to_user_created_idx ON public.prayer_encouragements USING btree (to_user_id, created_at DESC);
CREATE INDEX idx_prayer_intercessions_intercessor_id ON public.prayer_intercessions USING btree (intercessor_id);
CREATE INDEX idx_prayer_intercessions_request_id ON public.prayer_intercessions USING btree (request_id);
CREATE INDEX prayer_mutes_muter_idx ON public.prayer_mutes USING btree (muter_id);
CREATE INDEX idx_pnc_recipient ON public.prayer_network_connections USING btree (recipient_id);
CREATE INDEX idx_pnc_requester ON public.prayer_network_connections USING btree (requester_id);
CREATE INDEX idx_pnc_status ON public.prayer_network_connections USING btree (status);
CREATE UNIQUE INDEX idx_pnc_unique_pair ON public.prayer_network_connections USING btree (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX pnc_recipient_status_idx ON public.prayer_network_connections USING btree (recipient_id, status);
CREATE INDEX idx_pni_request_id ON public.prayer_network_intercessions USING btree (request_id);
CREATE INDEX idx_prayer_network_intercessions_user_id ON public.prayer_network_intercessions USING btree (user_id);
CREATE INDEX idx_pnr_user_id ON public.prayer_network_requests USING btree (user_id);
CREATE INDEX idx_pnr_visibility ON public.prayer_network_requests USING btree (visibility);
CREATE INDEX prayer_request_comments_req_idx ON public.prayer_request_comments USING btree (request_id, created_at);
CREATE INDEX idx_prayer_requests_band_id ON public.prayer_requests USING btree (band_id);
CREATE INDEX idx_prayer_requests_user_id ON public.prayer_requests USING btree (user_id);
CREATE INDEX idx_product_variants_product ON public.product_variants USING btree (product_id);
CREATE INDEX idx_profiles_org_id ON public.profiles USING btree (org_id);
CREATE UNIQUE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);
CREATE INDEX profiles_upline_idx ON public.profiles USING btree (upline_user_id) WHERE (upline_user_id IS NOT NULL);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions USING btree (user_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals USING btree (referred_user_id);
CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_user_id);
CREATE UNIQUE INDEX referrals_session_uniq ON public.referrals USING btree (stripe_session_id) WHERE (stripe_session_id IS NOT NULL);
CREATE INDEX idx_registrations_band_id ON public.registrations USING btree (band_id);
CREATE INDEX registrations_band_id_registered_at_idx ON public.registrations USING btree (band_id, registered_at DESC);
CREATE INDEX registrations_registered_at_idx ON public.registrations USING btree (registered_at DESC);
CREATE INDEX registrations_registered_by_idx ON public.registrations USING btree (registered_by) WHERE (registered_by IS NOT NULL);
CREATE INDEX registrations_user_id_idx ON public.registrations USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_shipments_status ON public.subscription_shipments USING btree (status);
CREATE INDEX idx_shipments_subscription_id ON public.subscription_shipments USING btree (subscription_id);
CREATE INDEX idx_shipments_user_id ON public.subscription_shipments USING btree (user_id);
CREATE UNIQUE INDEX uniq_shipments_stripe_invoice ON public.subscription_shipments USING btree (stripe_invoice_id);
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions USING btree (stripe_subscription_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);

-- Views
create or replace view public.prayer_requests_with_counts as
 SELECT pr.id,
    pr.user_id,
    pr.title,
    pr.body,
    pr.visibility,
    pr.status,
    pr.answered_testimony,
    pr.answered_at,
    pr.created_at,
    pr.updated_at,
    count(pi.id) AS total_intercessions,
    count(
        CASE
            WHEN pi.prayed_at >= (now() - '7 days'::interval) THEN 1
            ELSE NULL::integer
        END) AS intercessions_this_week,
    count(
        CASE
            WHEN pi.prayed_at::date = CURRENT_DATE THEN 1
            ELSE NULL::integer
        END) AS intercessions_today
   FROM prayer_requests pr
     LEFT JOIN prayer_intercessions pi ON pi.request_id = pr.id
  GROUP BY pr.id;
alter view public.prayer_requests_with_counts set (security_invoker=on);

create or replace view public.sellable_bands as
 SELECT band_id,
    theme,
    color,
    size,
    status,
    owner_id,
    org_id
   FROM bands b
  WHERE status = 'unregistered'::text AND owner_id IS NULL AND org_id IS NULL AND NOT (EXISTS ( SELECT 1
           FROM registrations r
          WHERE r.band_id = b.band_id));

-- Functions
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count  INTEGER;
  v_now    TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO rate_limit_buckets (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN v_now - rate_limit_buckets.window_start > make_interval(secs => p_window_seconds) THEN 1
      ELSE rate_limit_buckets.count + 1
    END,
    window_start = CASE
      WHEN v_now - rate_limit_buckets.window_start > make_interval(secs => p_window_seconds) THEN v_now
      ELSE rate_limit_buckets.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.downline_of(root uuid, max_depth integer DEFAULT NULL::integer)
 RETURNS TABLE(user_id uuid, depth integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with recursive tree as (
    select p.id as user_id, 1 as depth
      from profiles p
     where p.upline_user_id = root
       and p.id <> root
    union all
    select p.id, t.depth + 1
      from profiles p
      join tree t on p.upline_user_id = t.user_id
     where t.depth < least(coalesce(max_depth, 20), 20)
       and p.id <> root
  )
  select user_id, min(depth) as depth
    from tree
   where max_depth is null or depth <= max_depth
   group by user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_credit(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.gen_connect_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text; i int; attempts int := 0;
begin
  loop
    code := '';
    for i in 1..12 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where connect_code = code);
    attempts := attempts + 1;
    if attempts > 50 then raise exception 'gen_connect_code: could not find a free code'; end if;
  end loop;
  return code;
end; $function$
;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'GIVE-';
  i      int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  end loop;
  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_lineage(org_uuid uuid)
 RETURNS TABLE(band_id text, total_holders bigint, countries bigint, prayers bigint, latest_country text, latest_date timestamp with time zone, first_holder text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only members of the org may read its lineage.
  IF (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()) IS DISTINCT FROM org_uuid THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.band_id,
    COUNT(DISTINCT r.id) as total_holders,
    COUNT(DISTINCT r.country) as countries,
    COUNT(DISTINCT CASE WHEN r.prayer IS NOT NULL THEN r.id END) as prayers,
    (SELECT r2.country FROM registrations r2 WHERE r2.band_id = b.band_id ORDER BY r2.registered_at DESC LIMIT 1) as latest_country,
    (SELECT r2.registered_at FROM registrations r2 WHERE r2.band_id = b.band_id ORDER BY r2.registered_at DESC LIMIT 1) as latest_date,
    (SELECT r2.user_name FROM registrations r2 WHERE r2.band_id = b.band_id ORDER BY r2.registered_at ASC LIMIT 1) as first_holder
  FROM bands b
  LEFT JOIN registrations r ON r.band_id = b.band_id
  WHERE b.org_id = org_uuid
  AND b.status = 'registered'
  GROUP BY b.band_id
  ORDER BY total_holders DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_stats(org_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_bands', (SELECT COUNT(*) FROM bands WHERE org_id = org_uuid AND status = 'registered'),
    'total_bands', (SELECT COUNT(*) FROM bands WHERE org_id = org_uuid),
    'total_prayers', (SELECT COUNT(*) FROM registrations r JOIN bands b ON r.band_id = b.band_id WHERE b.org_id = org_uuid),
    'countries', (SELECT COUNT(DISTINCT country) FROM registrations r JOIN bands b ON r.band_id = b.band_id WHERE b.org_id = org_uuid)
  ) INTO result;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    public.new_referral_code()
  )
  on conflict (id) do nothing;

  if new.email is not null then
    update public.bands
       set upline_user_id = new.id
     where upline_user_id is null
       and upline_email is not null
       and lower(upline_email) = lower(new.email);

    update public.band_handouts
       set upline_user_id = new.id
     where upline_user_id is null
       and upline_email is not null
       and lower(upline_email) = lower(new.email);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.circle_members
     where circle_id = p_circle and user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_band_owner_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.owner_id is distinct from old.owner_id then
    insert into public.band_ownership_events (band_id, old_owner_id, new_owner_id, actor_uid)
    values (new.band_id, old.owner_id, new.owner_id, auth.uid());
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_accounts(keep uuid, drop_ uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  rid record;
  n int;
  moved jsonb := '{}'::jsonb;
begin
  if keep = drop_ then raise exception 'keep and drop are the same account'; end if;
  if not exists (select 1 from auth.users where id = keep) then raise exception 'kept account not found'; end if;
  if not exists (select 1 from auth.users where id = drop_) then raise exception 'dropped account not found'; end if;

  for r in
    select kcu.table_schema, kcu.table_name, kcu.column_name
    from information_schema.referential_constraints rc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = rc.constraint_name and kcu.constraint_schema = rc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = rc.unique_constraint_name and ccu.constraint_schema = rc.unique_constraint_schema
    where kcu.table_schema = 'public'
      and ccu.column_name = 'id'
      and ((ccu.table_schema = 'auth' and ccu.table_name = 'users') or (ccu.table_schema = 'public' and ccu.table_name = 'profiles'))
      and not (kcu.table_name = 'profiles' and kcu.column_name = 'id')
  loop
    n := 0;
    for rid in execute format('select ctid from %I.%I where %I = $1', r.table_schema, r.table_name, r.column_name) using drop_
    loop
      begin
        execute format('update %I.%I set %I = $1 where ctid = $2', r.table_schema, r.table_name, r.column_name) using keep, rid.ctid;
        n := n + 1;
      exception when unique_violation then
        -- The kept account already has this row (same circle, same partner):
        -- the duplicate goes.
        execute format('delete from %I.%I where ctid = $1', r.table_schema, r.table_name) using rid.ctid;
      end;
    end loop;
    if n > 0 then moved := moved || jsonb_build_object(r.table_name || '.' || r.column_name, n); end if;
  end loop;

  -- A sponsorship that now points at itself.
  update public.profiles set upline_user_id = null where id = keep and upline_user_id = keep;
  -- Fill blanks on the kept profile from the dropped one (never overwrite).
  update public.profiles k set
    full_name = coalesce(nullif(k.full_name, ''), d.full_name),
    avatar_icon = coalesce(k.avatar_icon, d.avatar_icon),
    upline_user_id = coalesce(k.upline_user_id, case when d.upline_user_id = keep then null else d.upline_user_id end),
    upline_band_id = coalesce(k.upline_band_id, d.upline_band_id)
  from public.profiles d where k.id = keep and d.id = drop_;

  -- Logins: Google / Apple / Facebook identities follow the person. An email
  -- identity is the account's own and dies with it.
  for rid in select id from auth.identities where user_id = drop_ and provider <> 'email'
  loop
    begin
      update auth.identities set user_id = keep where id = rid.id;
    exception when unique_violation then
      delete from auth.identities where id = rid.id;
    end;
  end loop;

  delete from auth.users where id = drop_;
  return moved;
end
$function$
;

CREATE OR REPLACE FUNCTION public.new_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
begin
  loop
    code := 'GIVE-';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where referral_code = code);
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'new_referral_code: could not find a free code';
    end if;
  end loop;
  return code;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.schema_dump()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare acc text := ''; r record; cols text;
begin
  acc := acc || '-- Prayer Bands: public schema, rendered by public.schema_dump() at ' || now()::text || E'\n';
  acc := acc || E'-- Regenerate with `npm run db:schema` after every migration. Do not hand-edit.\n\n';

  acc := acc || E'-- Applied migrations\n';
  for r in select version, name from supabase_migrations.schema_migrations order by version loop
    acc := acc || '--   ' || r.version || '  ' || coalesce(r.name, '') || E'\n';
  end loop;

  acc := acc || E'\n-- Extensions\n';
  for r in select e.extname, e.extversion, n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname <> 'plpgsql' order by e.extname loop
    acc := acc || format('create extension if not exists %I with schema %I; -- %s', r.extname, r.nspname, r.extversion) || E'\n';
  end loop;

  for r in select t.oid, t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e' order by t.typname loop
    select string_agg(quote_literal(enumlabel), ', ' order by enumsortorder) into cols from pg_enum where enumtypid = r.oid;
    acc := acc || format('create type public.%I as enum (%s);', r.typname, cols) || E'\n';
  end loop;

  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'S' and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'i') order by 1 loop
    acc := acc || format('create sequence if not exists public.%I;', r.relname) || E'\n';
  end loop;

  acc := acc || E'\n-- Tables\n';
  for r in select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname loop
    select string_agg(
      format('  %I %s%s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
        case when a.attidentity = 'a' then ' generated always as identity' when a.attidentity = 'd' then ' generated by default as identity' else '' end,
        case when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(d.adbin, d.adrelid) || ') stored'
             when d.adbin is not null and a.attidentity = '' then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
        case when a.attnotnull then ' not null' else '' end),
      E',\n' order by a.attnum) into cols
    from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped;
    acc := acc || format(E'create table public.%I (\n%s\n);\n', r.relname, cols);
    if obj_description(r.oid, 'pg_class') is not null then
      acc := acc || format('comment on table public.%I is %L;', r.relname, obj_description(r.oid, 'pg_class')) || E'\n';
    end if;
    acc := acc || E'\n';
  end loop;

  acc := acc || E'-- Constraints\n';
  for r in select c.conname, cl.relname, pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace where n.nspname = 'public' and c.contype in ('p', 'u', 'c', 'x', 'f') order by (c.contype = 'f'), cl.relname, c.conname loop
    acc := acc || format('alter table public.%I add constraint %I %s;', r.relname, r.conname, r.def) || E'\n';
  end loop;

  acc := acc || E'\n-- Indexes\n';
  for r in select i.indexdef from pg_indexes i join pg_class c on c.relname = i.indexname join pg_namespace n on n.oid = c.relnamespace and n.nspname = i.schemaname where i.schemaname = 'public' and not exists (select 1 from pg_constraint k where k.conindid = c.oid) order by i.tablename, i.indexname loop
    acc := acc || r.indexdef || ';' || E'\n';
  end loop;

  acc := acc || E'\n-- Views\n';
  for r in select c.oid, c.relname, c.relkind, c.reloptions, pg_get_viewdef(c.oid, true) as def from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('v', 'm') order by c.relname loop
    acc := acc || format(E'create %s public.%I as\n%s\n', case when r.relkind = 'm' then 'materialized view' else 'or replace view' end, r.relname, r.def);
    if r.reloptions is not null then
      acc := acc || format('alter view public.%I set (%s);', r.relname, array_to_string(r.reloptions, ', ')) || E'\n';
    end if;
    acc := acc || E'\n';
  end loop;

  acc := acc || E'-- Functions\n';
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') order by p.proname, p.oid loop
    acc := acc || pg_get_functiondef(r.oid) || E';\n\n';
  end loop;

  acc := acc || E'-- Triggers\n';
  for r in select pg_get_triggerdef(t.oid, true) as def from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal order by c.relname, t.tgname loop
    acc := acc || r.def || E';\n';
  end loop;

  acc := acc || E'\n-- Row level security\n';
  for r in select c.relname, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity order by 1 loop
    acc := acc || format('alter table public.%I enable row level security;', r.relname) || E'\n';
    if r.relforcerowsecurity then acc := acc || format('alter table public.%I force row level security;', r.relname) || E'\n'; end if;
  end loop;
  for r in select * from pg_policies where schemaname = 'public' order by tablename, policyname loop
    acc := acc || format('create policy %I on public.%I as %s for %s to %s%s%s;', r.policyname, r.tablename, lower(r.permissive), lower(r.cmd), array_to_string(r.roles, ', '),
      case when r.qual is not null then ' using (' || r.qual || ')' else '' end,
      case when r.with_check is not null then ' with check (' || r.with_check || ')' else '' end) || E'\n';
  end loop;

  acc := acc || E'\n-- Grants: whole table\n';
  for r in select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privs from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role') group by table_name, grantee order by 1, 2 loop
    acc := acc || format('grant %s on public.%I to %I;', lower(r.privs), r.table_name, r.grantee) || E'\n';
  end loop;
  acc := acc || E'\n-- Grants: per column (only where the whole-table privilege is NOT granted — the column allowlists)\n';
  for r in select cp.table_name, cp.grantee, cp.privilege_type, string_agg(quote_ident(cp.column_name), ', ' order by cp.column_name) as cols
    from information_schema.column_privileges cp
    where cp.table_schema = 'public' and cp.grantee in ('anon', 'authenticated', 'service_role')
      and not exists (select 1 from information_schema.role_table_grants tg where tg.table_schema = cp.table_schema and tg.table_name = cp.table_name and tg.grantee = cp.grantee and tg.privilege_type = cp.privilege_type)
    group by 1, 2, 3 order by 1, 2, 3 loop
    acc := acc || format('grant %s (%s) on public.%I to %I;', lower(r.privilege_type), r.cols, r.table_name, r.grantee) || E'\n';
  end loop;
  acc := acc || E'\n-- Grants: functions\n';
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) as args, g.grantee::regrole::text as grantee
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) g
    where n.nspname = 'public' and g.privilege_type = 'EXECUTE' and g.grantee::regrole::text in ('anon', 'authenticated', 'service_role', '-')
    order by 1, 2, 3 loop
    acc := acc || format('grant execute on function public.%I(%s) to %s;', r.proname, r.args, case when r.grantee = '-' then 'public' else r.grantee end) || E'\n';
  end loop;
  return acc;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_band_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE bands
  SET owner_id = (
    SELECT p.id FROM orders o
    JOIN profiles p ON p.email = o.customer_email
    WHERE o.id = NEW.order_id
  )
  WHERE band_id = NEW.band_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  attempt   INT := 0;
  candidate TEXT;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      candidate := gen_referral_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate);
      attempt := attempt + 1;
      EXIT WHEN attempt >= 8;
    END LOOP;
    NEW.referral_code := candidate;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.stalled_signups()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, age text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select u.id, u.email::text, u.created_at,
    case when now() - u.created_at < interval '1 day' then extract(hour from now() - u.created_at)::int || 'h'
         else extract(day from now() - u.created_at)::int || 'd' end as age
  from auth.users u
  where u.email_confirmed_at is null
    and u.last_sign_in_at is null
    and u.created_at between now() - interval '48 hours' and now() - interval '1 hour'
  order by u.created_at desc
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- Triggers
CREATE TRIGGER on_band_owner_change AFTER UPDATE OF owner_id ON bands FOR EACH ROW EXECUTE FUNCTION log_band_owner_change();
CREATE TRIGGER contact_submissions_updated_at BEFORE UPDATE ON contact_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER faq_entries_updated_at BEFORE UPDATE ON faq_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_order_band_insert AFTER INSERT ON order_bands FOR EACH ROW EXECUTE FUNCTION set_band_owner();
CREATE TRIGGER update_prayer_circles_updated_at BEFORE UPDATE ON prayer_circles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pnc_updated_at BEFORE UPDATE ON prayer_network_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_set_referral_code BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION set_referral_code();
CREATE TRIGGER shipments_updated_at BEFORE UPDATE ON subscription_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row level security
alter table public.announcements enable row level security;
alter table public.band_handouts enable row level security;
alter table public.band_ownership_events enable row level security;
alter table public.band_themes enable row level security;
alter table public.band_transfers enable row level security;
alter table public.bands enable row level security;
alter table public.chain_prayers enable row level security;
alter table public.circle_intercessions enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_prayer_replies enable row level security;
alter table public.circle_prayer_requests enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.faq_entries enable row level security;
alter table public.integrity_alerts enable row level security;
alter table public.journal_lists enable row level security;
alter table public.order_bands enable row level security;
alter table public.orders enable row level security;
alter table public.org_applications enable row level security;
alter table public.org_invites enable row level security;
alter table public.organizations enable row level security;
alter table public.partner_group_members enable row level security;
alter table public.partner_groups enable row level security;
alter table public.prayer_acknowledgments enable row level security;
alter table public.prayer_circles enable row level security;
alter table public.prayer_email_optouts enable row level security;
alter table public.prayer_encouragements enable row level security;
alter table public.prayer_intercessions enable row level security;
alter table public.prayer_mutes enable row level security;
alter table public.prayer_network_connections enable row level security;
alter table public.prayer_network_intercessions enable row level security;
alter table public.prayer_network_requests enable row level security;
alter table public.prayer_request_comments enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.product_variants enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.referrals enable row level security;
alter table public.registrations enable row level security;
alter table public.site_config enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_shipments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.verse_walks enable row level security;
create policy "Authenticated users can insert" on public.band_transfers as permissive for insert to public with check ((auth.uid() = from_user_id));
create policy "Owner can update" on public.band_transfers as permissive for update to public using ((auth.uid() = from_user_id));
create policy "Participants read their own transfers" on public.band_transfers as permissive for select to public using ((auth.uid() = from_user_id));
create policy "Anyone can read bands" on public.bands as permissive for select to public using (true);
create policy "Org admin can insert bands" on public.bands as permissive for insert to public with check ((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.admin_id = auth.uid()))));
create policy "Org admin can update bands" on public.bands as permissive for update to public using ((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.admin_id = auth.uid()))));
create policy "Site admin can update bands" on public.bands as permissive for update to public using (((auth.jwt() ->> 'email'::text) = 'dshipps941@gmail.com'::text)) with check (((auth.jwt() ->> 'email'::text) = 'dshipps941@gmail.com'::text));
create policy "Band holders read that band's chain prayers" on public.chain_prayers as permissive for select to public using (((EXISTS ( SELECT 1
   FROM registrations r
  WHERE ((r.band_id = chain_prayers.band_id) AND (r.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM bands b
  WHERE ((b.band_id = chain_prayers.band_id) AND (b.owner_id = auth.uid()))))));
create policy "Requester reads their own chain prayers" on public.chain_prayers as permissive for select to public using ((requester_user_id = auth.uid()));
create policy "Circle members can intercede" on public.circle_intercessions as permissive for insert to public with check (((auth.uid() = user_id) AND (request_id IN ( SELECT circle_prayer_requests.id
   FROM circle_prayer_requests
  WHERE (circle_prayer_requests.circle_id IN ( SELECT circle_members.circle_id
           FROM circle_members
          WHERE (circle_members.user_id = auth.uid())))))));
create policy "Circle members can view intercessions" on public.circle_intercessions as permissive for select to public using ((request_id IN ( SELECT circle_prayer_requests.id
   FROM circle_prayer_requests
  WHERE (circle_prayer_requests.circle_id IN ( SELECT circle_members.circle_id
           FROM circle_members
          WHERE (circle_members.user_id = auth.uid()))))));
create policy "Users can remove their own intercession" on public.circle_intercessions as permissive for delete to public using ((auth.uid() = user_id));
create policy "Authenticated users can join a circle" on public.circle_members as permissive for insert to public with check ((auth.uid() = user_id));
create policy "Leader can remove members" on public.circle_members as permissive for delete to public using (((user_id = auth.uid()) OR (circle_id IN ( SELECT prayer_circles.id
   FROM prayer_circles
  WHERE (prayer_circles.created_by = auth.uid())))));
create policy "Members can see who is in their circles" on public.circle_members as permissive for select to public using (is_circle_member(circle_id));
create policy "Author or leader can delete a reply" on public.circle_prayer_replies as permissive for delete to authenticated using (((auth.uid() = user_id) OR (request_id IN ( SELECT r.id
   FROM (circle_prayer_requests r
     JOIN prayer_circles c ON ((c.id = r.circle_id)))
  WHERE (c.created_by = auth.uid())))));
create policy "Circle members can reply" on public.circle_prayer_replies as permissive for insert to authenticated with check (((auth.uid() = user_id) AND (request_id IN ( SELECT r.id
   FROM circle_prayer_requests r
  WHERE (r.circle_id IN ( SELECT m.circle_id
           FROM circle_members m
          WHERE (m.user_id = auth.uid())))))));
create policy "Circle members can view replies" on public.circle_prayer_replies as permissive for select to authenticated using ((request_id IN ( SELECT r.id
   FROM circle_prayer_requests r
  WHERE (r.circle_id IN ( SELECT m.circle_id
           FROM circle_members m
          WHERE (m.user_id = auth.uid()))))));
create policy "Circle members can post prayer requests" on public.circle_prayer_requests as permissive for insert to public with check (((auth.uid() = user_id) AND (circle_id IN ( SELECT circle_members.circle_id
   FROM circle_members
  WHERE (circle_members.user_id = auth.uid())))));
create policy "Circle members can view prayer requests" on public.circle_prayer_requests as permissive for select to public using ((circle_id IN ( SELECT circle_members.circle_id
   FROM circle_members
  WHERE (circle_members.user_id = auth.uid()))));
create policy "Owner or leader can delete a prayer request" on public.circle_prayer_requests as permissive for delete to public using (((auth.uid() = user_id) OR (circle_id IN ( SELECT prayer_circles.id
   FROM prayer_circles
  WHERE (prayer_circles.created_by = auth.uid())))));
create policy "Owner or leader can update a prayer request" on public.circle_prayer_requests as permissive for update to public using (((auth.uid() = user_id) OR (circle_id IN ( SELECT prayer_circles.id
   FROM prayer_circles
  WHERE (prayer_circles.created_by = auth.uid())))));
create policy "No public access to contact submissions" on public.contact_submissions as permissive for all to public using (false);
create policy "People read their own credit" on public.credit_ledger as permissive for select to public using ((user_id = auth.uid()));
create policy "Published FAQs are publicly readable" on public.faq_entries as permissive for select to public using ((published = true));
create policy "Owner manages their journal lists" on public.journal_lists as permissive for all to public using ((owner_id = auth.uid())) with check ((owner_id = auth.uid()));
create policy "Org admin can insert orders" on public.orders as permissive for insert to public with check ((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.admin_id = auth.uid()))));
create policy "Org admin can view their orders" on public.orders as permissive for select to public using (((org_id IN ( SELECT organizations.id
   FROM organizations
  WHERE (organizations.admin_id = auth.uid()))) OR (customer_email = ( SELECT profiles.email
   FROM profiles
  WHERE (profiles.id = auth.uid())))));
create policy "Site admin can read orders" on public.orders as permissive for select to public using (((auth.jwt() ->> 'email'::text) = 'dshipps941@gmail.com'::text));
create policy "Site admin can update orders" on public.orders as permissive for update to public using (((auth.jwt() ->> 'email'::text) = 'dshipps941@gmail.com'::text)) with check (((auth.jwt() ->> 'email'::text) = 'dshipps941@gmail.com'::text));
create policy "Service role full access to org_invites" on public.org_invites as permissive for all to public using ((auth.role() = 'service_role'::text));
create policy "Anyone authenticated can read organizations" on public.organizations as permissive for select to public using ((auth.uid() IS NOT NULL));
create policy "Org admin can update" on public.organizations as permissive for update to public using ((admin_id = auth.uid()));
create policy "Org members can read their org" on public.organizations as permissive for select to public using ((id IN ( SELECT profiles.org_id
   FROM profiles
  WHERE (profiles.id = auth.uid()))));
create policy "Owner manages their group members" on public.partner_group_members as permissive for all to public using ((group_id IN ( SELECT partner_groups.id
   FROM partner_groups
  WHERE (partner_groups.owner_id = auth.uid())))) with check ((group_id IN ( SELECT partner_groups.id
   FROM partner_groups
  WHERE (partner_groups.owner_id = auth.uid()))));
create policy "Owner manages their groups" on public.partner_groups as permissive for all to public using ((owner_id = auth.uid())) with check ((owner_id = auth.uid()));
create policy "Band holders can create circles" on public.prayer_circles as permissive for insert to public with check ((auth.uid() = created_by));
create policy "Leader can delete their circle" on public.prayer_circles as permissive for delete to public using ((auth.uid() = created_by));
create policy "Leader can update their circle" on public.prayer_circles as permissive for update to public using ((auth.uid() = created_by));
create policy "View circles" on public.prayer_circles as permissive for select to public using (((is_closed = false) OR (created_by = auth.uid()) OR (id IN ( SELECT circle_members.circle_id
   FROM circle_members
  WHERE (circle_members.user_id = auth.uid())))));
create policy "Intercessions readable for counts" on public.prayer_intercessions as permissive for select to public using (true);
create policy "Read intercessions for visible requests" on public.prayer_intercessions as permissive for select to public using (((request_id IN ( SELECT prayer_requests.id
   FROM prayer_requests
  WHERE (prayer_requests.visibility = 'public'::text))) OR (auth.uid() = intercessor_id) OR (request_id IN ( SELECT prayer_requests.id
   FROM prayer_requests
  WHERE (prayer_requests.user_id = auth.uid())))));
create policy "Owner manages their mutes" on public.prayer_mutes as permissive for all to public using ((muter_id = auth.uid())) with check ((muter_id = auth.uid()));
create policy "Create connection as requester" on public.prayer_network_connections as permissive for insert to public with check ((auth.uid() = requester_id));
create policy "Either party can delete" on public.prayer_network_connections as permissive for delete to public using (((auth.uid() = requester_id) OR (auth.uid() = recipient_id)));
create policy "Recipient can respond" on public.prayer_network_connections as permissive for update to public using ((auth.uid() = recipient_id));
create policy "View own connections" on public.prayer_network_connections as permissive for select to public using (((auth.uid() = requester_id) OR (auth.uid() = recipient_id)));
create policy "Users can manage their own intercessions" on public.prayer_network_intercessions as permissive for all to public using ((auth.uid() = user_id));
create policy "Connected users can view network requests" on public.prayer_network_requests as permissive for select to public using (((user_id IN ( SELECT
        CASE
            WHEN (prayer_network_connections.requester_id = auth.uid()) THEN prayer_network_connections.recipient_id
            ELSE prayer_network_connections.requester_id
        END AS requester_id
   FROM prayer_network_connections
  WHERE (((prayer_network_connections.requester_id = auth.uid()) OR (prayer_network_connections.recipient_id = auth.uid())) AND (prayer_network_connections.status = 'accepted'::text)))) OR (auth.uid() = user_id)));
create policy "Public network requests are readable by anyone" on public.prayer_network_requests as permissive for select to public using ((visibility = 'public'::text));
create policy "Users can manage their own network requests" on public.prayer_network_requests as permissive for all to public using ((auth.uid() = user_id));
create policy "Anyone can view public prayer requests" on public.prayer_requests as permissive for select to public using ((visibility = 'public'::text));
create policy "Public active prayer requests are readable" on public.prayer_requests as permissive for select to public using (((visibility = 'public'::text) AND (status = 'active'::text)));
create policy "Users can manage their own prayer requests" on public.prayer_requests as permissive for all to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Users read their own prayer requests" on public.prayer_requests as permissive for select to public using ((auth.uid() = user_id));
create policy "Users can update own profile" on public.profiles as permissive for update to public using ((id = auth.uid()));
create policy "Users can view own profile" on public.profiles as permissive for select to public using ((id = auth.uid()));
create policy push_subs_delete_own on public.push_subscriptions as permissive for delete to authenticated using ((auth.uid() = user_id));
create policy push_subs_insert_own on public.push_subscriptions as permissive for insert to authenticated with check ((auth.uid() = user_id));
create policy push_subs_select_own on public.push_subscriptions as permissive for select to authenticated using ((auth.uid() = user_id));
create policy push_subs_update_own on public.push_subscriptions as permissive for update to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Service role full access to referrals" on public.referrals as permissive for all to public using ((auth.role() = 'service_role'::text));
create policy "Users can view own referrals" on public.referrals as permissive for select to public using ((referrer_user_id = auth.uid()));
create policy "Anyone can read registrations" on public.registrations as permissive for select to public using (true);
create policy "Plans are publicly readable" on public.subscription_plans as permissive for select to public using (true);
create policy "Service role full access to shipments" on public.subscription_shipments as permissive for all to public using ((auth.role() = 'service_role'::text));
create policy "Users see own shipments" on public.subscription_shipments as permissive for select to public using ((auth.uid() = user_id));
create policy "Service role full access to subscriptions" on public.subscriptions as permissive for all to public using ((auth.role() = 'service_role'::text));
create policy "Users can insert own subscriptions" on public.subscriptions as permissive for insert to public with check ((auth.uid() = user_id));
create policy "Users can update own subscriptions" on public.subscriptions as permissive for update to public using ((auth.uid() = user_id));
create policy "Users see own subscriptions" on public.subscriptions as permissive for select to public using ((auth.uid() = user_id));
create policy "own walk insert" on public.verse_walks as permissive for insert to public with check ((auth.uid() = user_id));
create policy "own walk select" on public.verse_walks as permissive for select to public using ((auth.uid() = user_id));
create policy "own walk update" on public.verse_walks as permissive for update to public using ((auth.uid() = user_id));

-- Grants: whole table
grant delete, insert, references, select, trigger, truncate, update on public.announcements to anon;
grant delete, insert, references, select, trigger, truncate, update on public.announcements to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.announcements to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.band_handouts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.band_handouts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.band_handouts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.band_ownership_events to anon;
grant delete, insert, references, select, trigger, truncate, update on public.band_ownership_events to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.band_ownership_events to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.band_themes to anon;
grant delete, insert, references, select, trigger, truncate, update on public.band_themes to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.band_themes to service_role;
grant delete, insert, references, trigger, truncate, update on public.band_transfers to anon;
grant delete, insert, references, select, trigger, truncate, update on public.band_transfers to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.band_transfers to service_role;
grant delete, insert, references, trigger, truncate, update on public.bands to anon;
grant delete, insert, references, trigger, truncate, update on public.bands to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.bands to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.chain_prayers to anon;
grant delete, insert, references, select, trigger, truncate, update on public.chain_prayers to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.chain_prayers to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.circle_intercessions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.circle_intercessions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.circle_intercessions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.circle_members to anon;
grant delete, insert, references, select, trigger, truncate, update on public.circle_members to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.circle_members to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_replies to anon;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_replies to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_replies to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_requests to anon;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_requests to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.circle_prayer_requests to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.contact_submissions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.contact_submissions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.contact_submissions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.credit_ledger to anon;
grant delete, insert, references, select, trigger, truncate, update on public.credit_ledger to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.credit_ledger to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.faq_entries to anon;
grant delete, insert, references, select, trigger, truncate, update on public.faq_entries to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.faq_entries to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.integrity_alerts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.journal_lists to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.journal_lists to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.order_bands to anon;
grant delete, insert, references, select, trigger, truncate, update on public.order_bands to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.order_bands to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.orders to anon;
grant delete, insert, references, select, trigger, truncate, update on public.orders to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.orders to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.org_applications to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.org_invites to anon;
grant delete, insert, references, select, trigger, truncate, update on public.org_invites to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.org_invites to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.organizations to anon;
grant delete, insert, references, select, trigger, truncate, update on public.organizations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.organizations to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.partner_group_members to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.partner_group_members to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.partner_groups to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.partner_groups to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_acknowledgments to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_acknowledgments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_acknowledgments to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_circles to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_circles to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_circles to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_email_optouts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_email_optouts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_email_optouts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_encouragements to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_encouragements to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_encouragements to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_intercessions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_intercessions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_intercessions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_mutes to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_mutes to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_connections to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_connections to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_connections to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_intercessions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_intercessions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_intercessions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_requests to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_requests to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_network_requests to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_request_comments to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests_with_counts to anon;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests_with_counts to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.prayer_requests_with_counts to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.product_variants to anon;
grant delete, insert, references, select, trigger, truncate, update on public.product_variants to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.product_variants to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.products to anon;
grant delete, insert, references, select, trigger, truncate, update on public.products to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.products to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.profiles to anon;
grant delete, insert, references, select, trigger, truncate, update on public.profiles to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.profiles to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.push_subscriptions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.push_subscriptions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.rate_limit_buckets to anon;
grant delete, insert, references, select, trigger, truncate, update on public.rate_limit_buckets to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.rate_limit_buckets to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.referrals to anon;
grant delete, insert, references, select, trigger, truncate, update on public.referrals to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.referrals to service_role;
grant delete, insert, references, trigger, truncate, update on public.registrations to anon;
grant delete, insert, references, trigger, truncate, update on public.registrations to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.registrations to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.sellable_bands to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.site_config to anon;
grant delete, insert, references, select, trigger, truncate, update on public.site_config to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.site_config to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_plans to anon;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_plans to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_plans to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_shipments to anon;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_shipments to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.subscription_shipments to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to anon;
grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.subscriptions to service_role;
grant delete, insert, references, select, trigger, truncate, update on public.verse_walks to anon;
grant delete, insert, references, select, trigger, truncate, update on public.verse_walks to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public.verse_walks to service_role;

-- Grants: per column (only where the whole-table privilege is NOT granted — the column allowlists)
grant select (band_id, batch, color, created_at, created_date, dedication_note, dedication_recipient, dedication_viewed, id, inside_text, nfc_url, org_id, outside_text, owner_id, status, theme, upline_user_id) on public.bands to anon;
grant select (band_id, batch, color, created_at, created_date, dedication_note, dedication_recipient, dedication_viewed, id, inside_text, nfc_url, org_id, outside_text, owner_id, status, theme, upline_user_id) on public.bands to authenticated;
grant select (band_id, city, country, flagged, flagged_reason, id, latitude, longitude, prayer, registered_at, state, user_id, user_name, verse) on public.registrations to anon;
grant select (band_id, city, country, flagged, flagged_reason, id, latitude, longitude, prayer, registered_at, state, user_id, user_name, verse) on public.registrations to authenticated;

-- Grants: functions
grant execute on function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) to public;
grant execute on function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) to anon;
grant execute on function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) to authenticated;
grant execute on function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer) to service_role;
grant execute on function public.downline_of(root uuid, max_depth integer) to service_role;
grant execute on function public.expire_credit(p_user uuid) to anon;
grant execute on function public.expire_credit(p_user uuid) to authenticated;
grant execute on function public.expire_credit(p_user uuid) to service_role;
grant execute on function public.gen_connect_code() to service_role;
grant execute on function public.gen_referral_code() to public;
grant execute on function public.gen_referral_code() to anon;
grant execute on function public.gen_referral_code() to authenticated;
grant execute on function public.gen_referral_code() to service_role;
grant execute on function public.get_org_lineage(org_uuid uuid) to authenticated;
grant execute on function public.get_org_lineage(org_uuid uuid) to service_role;
grant execute on function public.get_org_stats(org_uuid uuid) to authenticated;
grant execute on function public.get_org_stats(org_uuid uuid) to service_role;
grant execute on function public.handle_new_user() to public;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.is_circle_member(p_circle uuid) to authenticated;
grant execute on function public.is_circle_member(p_circle uuid) to service_role;
grant execute on function public.log_band_owner_change() to public;
grant execute on function public.log_band_owner_change() to anon;
grant execute on function public.log_band_owner_change() to authenticated;
grant execute on function public.log_band_owner_change() to service_role;
grant execute on function public.merge_accounts(keep uuid, drop_ uuid) to service_role;
grant execute on function public.new_referral_code() to anon;
grant execute on function public.new_referral_code() to authenticated;
grant execute on function public.new_referral_code() to service_role;
grant execute on function public.schema_dump() to service_role;
grant execute on function public.set_band_owner() to public;
grant execute on function public.set_band_owner() to anon;
grant execute on function public.set_band_owner() to authenticated;
grant execute on function public.set_band_owner() to service_role;
grant execute on function public.set_referral_code() to public;
grant execute on function public.set_referral_code() to anon;
grant execute on function public.set_referral_code() to authenticated;
grant execute on function public.set_referral_code() to service_role;
grant execute on function public.stalled_signups() to service_role;
grant execute on function public.update_updated_at() to public;
grant execute on function public.update_updated_at() to anon;
grant execute on function public.update_updated_at() to authenticated;
grant execute on function public.update_updated_at() to service_role;
grant execute on function public.update_updated_at_column() to public;
grant execute on function public.update_updated_at_column() to anon;
grant execute on function public.update_updated_at_column() to authenticated;
grant execute on function public.update_updated_at_column() to service_role;
