-- ============================================
-- site_config — editable pricing / shipping (cents)
-- ============================================
create table site_config (
  key text primary key,
  value text not null,
  label text,
  updated_at timestamptz default now()
);

insert into site_config (key, value, label) values
  ('shipping_cost_standard', '599', 'Standard Shipping (cents)'),
  ('shipping_cost_church', '0', 'Church/Org Shipping (cents)'),
  ('band_price_single', '1499', 'Single Band Price (cents)'),
  ('band_price_3pack', '3999', '3-Pack Price (cents)'),
  ('band_price_5pack', '5999', '5-Pack Price (cents)');

-- NOTE: no RLS is enabled here, so the public anon key can read AND write this
-- table. The admin panel edits it directly with the browser client, which works,
-- but means anyone could tamper with prices. Consider enabling RLS and routing
-- writes through a service-role admin API if this becomes a concern.
