-- ============================================================
-- Product catalog (Phase 1) — multiple band designs + per-size stock.
-- ============================================================
-- Run in the Supabase SQL editor. Re-runnable (idempotent).
-- The store, checkout, and admin all read products from here.

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,            -- cart id / catalog key (e.g. 'standard', 'beach')
  name          text not null,
  description   text default '',
  category      text not null default 'band',    -- 'band' (individual, sized) | 'pack' (bulk)
  theme         text default 'default',          -- theme key from lib/themes.ts
  color         text default '#C8A96E',          -- card accent color
  icon          text default '✝',
  tag           text,                            -- small badge, e.g. 'Most Popular'
  price_cents   int  not null default 0,
  bands_per_unit int not null default 1,         -- packs: 50/100/200; bands: 1
  features      jsonb default '[]'::jsonb,       -- array of strings
  sizes         jsonb default '[]'::jsonb,       -- e.g. ["S","M","L"]
  has_sizes     boolean default false,
  multi_discount boolean default false,          -- auto 3+/5+ per-band discount applies
  image_urls    jsonb default '[]'::jsonb,       -- array of image paths/urls
  active        boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table if not exists product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  size        text not null default '',          -- '', 'S', 'M', 'L'
  stock       int  not null default 0,           -- manual count
  backorder   boolean not null default false,    -- sellable at 0 stock
  unique (product_id, size)
);

create index if not exists idx_product_variants_product on product_variants(product_id);

-- ── Seed the current products (prices pulled from existing site_config) ──
insert into products (slug, name, description, category, theme, color, icon, tag, price_cents, bands_per_unit, features, sizes, has_sizes, multi_discount, sort_order) values
  ('standard', 'Standard Band', 'A wristband laser-engraved with a unique PB-XXXXX ID and NFC chip. Ready to carry a prayer.', 'band', 'default', '#C8A96E', '✝', 'Most Popular',
    coalesce((select value::int from site_config where key='band_price_single'), 1499), 1,
    '["Unique PB-XXXXX ID","NFC chip enabled","Laser-engraved","Full journey tracking"]'::jsonb, '["S","M","L"]'::jsonb, true, true, 1),
  ('custom', 'Custom Band', 'Everything in Standard, plus your choice of color, a custom scripture verse, and a personal message engraved.', 'band', 'default', '#7BAE8E', '✦', 'Personalized',
    coalesce((select value::int from site_config where key='band_price_custom'), 1000), 1,
    '["Everything in Standard","Choose band color","Custom scripture verse","Personal message","Gift-ready packaging"]'::jsonb, '["S","M","L"]'::jsonb, true, false, 2),
  ('pack-50', 'Starter Pack', 'Perfect for small groups, house churches, or personal outreach.', 'pack', 'default', '#7BAE8E', '✝', null,
    coalesce((select value::int from site_config where key='pack_price_50'), 22500), 50,
    '["Custom ministry prefix","Ministry dashboard","NFC + laser-engraved","Journey tracking","Bulk reorder pricing"]'::jsonb, '[]'::jsonb, false, false, 3),
  ('pack-100', 'Community Pack', 'Ideal for congregation-wide initiatives and mission trips.', 'pack', 'default', '#C8A96E', '✝', 'Most Popular',
    coalesce((select value::int from site_config where key='pack_price_100'), 42500), 100,
    '["Custom ministry prefix","Ministry dashboard","NFC + laser-engraved","Journey tracking","Bulk reorder pricing"]'::jsonb, '[]'::jsonb, false, false, 4),
  ('pack-200', 'Mission Pack', 'For conferences, large outreaches, and denominational orders.', 'pack', 'default', '#7B8FAE', '✝', null,
    coalesce((select value::int from site_config where key='pack_price_200'), 80000), 200,
    '["Custom ministry prefix","Ministry dashboard","NFC + laser-engraved","Journey tracking","Bulk reorder pricing"]'::jsonb, '[]'::jsonb, false, false, 5)
on conflict (slug) do nothing;

-- ── Seed variants: S/M/L for sized products, one blank variant otherwise ──
insert into product_variants (product_id, size)
select p.id, s.size
from products p
cross join (values ('S'), ('M'), ('L')) as s(size)
where p.has_sizes = true
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size)
select p.id, ''
from products p
where p.has_sizes = false
on conflict (product_id, size) do nothing;
