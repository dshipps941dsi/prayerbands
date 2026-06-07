-- ============================================
-- Additional store pricing keys (cents) — custom band + church packs.
-- Run after the original site_config seed.
-- ============================================
-- Defaults below match the store's previous on-screen prices so nothing visibly
-- changes; edit them anytime in Admin → Pricing & Shipping.
-- NOTE: custom bands previously charged STRIPE_CUSTOM_PRICE_ID. Checkout now uses
-- band_price_custom instead — confirm this value is correct for your custom band.

insert into site_config (key, value, label) values
  ('band_price_custom', '1000', 'Custom Band Price (cents)'),
  ('pack_price_50',  '22500', 'Starter Pack — 50 Bands (cents)'),
  ('pack_price_100', '42500', 'Community Pack — 100 Bands (cents)'),
  ('pack_price_200', '80000', 'Mission Pack — 200 Bands (cents)')
on conflict (key) do nothing;
