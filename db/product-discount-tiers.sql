-- ============================================================
-- Multi-buy discount tiers — moved onto the products catalog.
-- ============================================================
-- Makes `products` the single source of truth for one-time-purchase pricing.
-- Tiers are stored as PERCENT off the product's own base price, so when you
-- change the base price the 3+/5+ discounts follow automatically — no more
-- drift between Admin → Products and Admin → Pricing & Shipping.
--
-- Shape: [{ "min_qty": 3, "percent": 11 }, { "min_qty": 5, "percent": 20 }]
--
-- After this runs, the band_price_3pack / band_price_5pack keys in site_config
-- are no longer read by the store or checkout (safe to leave or delete).
--
-- Run in the Supabase SQL editor. Re-runnable.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Seed tiers on multi_discount products from the existing site_config totals,
-- expressed as a percentage of each product's current base price, so on-screen
-- prices stay (within rounding) what they are today.
UPDATE products p
SET discount_tiers = jsonb_build_array(
  jsonb_build_object('min_qty', 3, 'percent',
    GREATEST(0, round((1 - (((SELECT value::numeric FROM site_config WHERE key = 'band_price_3pack') / 3.0) / p.price_cents)) * 100))::int),
  jsonb_build_object('min_qty', 5, 'percent',
    GREATEST(0, round((1 - (((SELECT value::numeric FROM site_config WHERE key = 'band_price_5pack') / 5.0) / p.price_cents)) * 100))::int)
)
WHERE p.multi_discount = true
  AND p.price_cents > 0
  AND EXISTS (SELECT 1 FROM site_config WHERE key = 'band_price_3pack')
  AND EXISTS (SELECT 1 FROM site_config WHERE key = 'band_price_5pack');

-- Fallback default for any multi_discount product still without tiers
-- (e.g. the site_config keys were absent).
UPDATE products
SET discount_tiers = '[{"min_qty":3,"percent":11},{"min_qty":5,"percent":20}]'::jsonb
WHERE multi_discount = true
  AND (discount_tiers IS NULL OR discount_tiers = '[]'::jsonb);
