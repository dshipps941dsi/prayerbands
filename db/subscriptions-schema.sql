-- ─────────────────────────────────────────────
-- PrayerBands Subscriptions Schema
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────

-- 1. SUBSCRIPTION PLANS (static config table)
--    Defines the 3 plans — easy to update pricing later
-- ─────────────────────────────────────────────
CREATE TABLE subscription_plans (
  id                TEXT PRIMARY KEY,           -- 'monthly' | 'quarterly' | 'bundle'
  name              TEXT NOT NULL,
  bands_per_cycle   INT NOT NULL DEFAULT 1,
  interval_months   INT NOT NULL DEFAULT 1,     -- 1 = monthly, 3 = quarterly
  band_price        NUMERIC(10,2) NOT NULL,     -- discounted per-band price
  shipping_price    NUMERIC(10,2) NOT NULL DEFAULT 2.99,
  total_price       NUMERIC(10,2) NOT NULL,     -- band_price * bands + shipping
  discount_percent  INT NOT NULL DEFAULT 0,
  stripe_price_id   TEXT,                       -- filled after Stripe setup
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 3 plans
INSERT INTO subscription_plans
  (id, name, bands_per_cycle, interval_months, band_price, shipping_price, total_price, discount_percent)
VALUES
  ('monthly',   'Monthly Sender',   1, 1, 4.00, 2.99,  6.99, 20),
  ('quarterly', 'Quarterly Sender', 1, 3, 4.50, 2.99,  7.49, 10),
  ('bundle',    'Bundle Sender',    3, 1, 3.75, 2.99, 14.24, 25);


-- 2. SUBSCRIPTIONS (one row per active subscriber)
-- ─────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id               TEXT NOT NULL REFERENCES subscription_plans(id),

  -- Stripe
  stripe_subscription_id  TEXT UNIQUE,
  stripe_customer_id      TEXT,

  -- Status
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','paused','cancelled','past_due')),

  -- Band preference
  band_color            TEXT NOT NULL DEFAULT 'sky',

  -- Shipping address (captured at checkout)
  shipping_name         TEXT,
  shipping_line1        TEXT,
  shipping_line2        TEXT,
  shipping_city         TEXT,
  shipping_state        TEXT,
  shipping_zip          TEXT,
  shipping_country      TEXT DEFAULT 'US',

  -- Cycle tracking
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  next_ship_date        TIMESTAMPTZ,

  -- Metadata
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);


-- 3. SUBSCRIPTION SHIPMENTS (one row per shipment triggered)
--    Created when invoice.payment_succeeded fires
-- ─────────────────────────────────────────────
CREATE TABLE subscription_shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id),

  -- Fulfillment
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','shipped','delivered','failed')),
  bands_quantity    INT NOT NULL DEFAULT 1,
  band_color        TEXT NOT NULL,

  -- Shipping
  shipping_name     TEXT,
  shipping_line1    TEXT,
  shipping_line2    TEXT,
  shipping_city     TEXT,
  shipping_state    TEXT,
  shipping_zip      TEXT,
  shipping_country  TEXT DEFAULT 'US',
  tracking_number   TEXT,
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,

  -- Stripe invoice reference
  stripe_invoice_id TEXT,

  -- Band IDs assigned to this shipment (populated when fulfilling)
  band_ids          TEXT[],

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipments_subscription_id ON subscription_shipments(subscription_id);
CREATE INDEX idx_shipments_user_id ON subscription_shipments(user_id);
CREATE INDEX idx_shipments_status ON subscription_shipments(status);


-- 4. AUTO-UPDATE updated_at TRIGGERS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON subscription_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Plans are public to read
CREATE POLICY "Plans are publicly readable"
  ON subscription_plans FOR SELECT
  USING (true);

-- Users can only see their own subscriptions
CREATE POLICY "Users see own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can see their own shipments
CREATE POLICY "Users see own shipments"
  ON subscription_shipments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (webhooks) can do everything
CREATE POLICY "Service role full access to subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to shipments"
  ON subscription_shipments FOR ALL
  USING (auth.role() = 'service_role');
