-- ─────────────────────────────────────────────
-- Referral program
-- ─────────────────────────────────────────────
-- Every profile gets a unique referral_code (GIVE-XXXXXX). New shoppers who arrive
-- with ?ref=<code> get a discount at checkout, and we record the referral.
--
-- Profiles are created by a DB trigger on sign-up, so generation is handled at
-- the DB level here (a BEFORE INSERT trigger) to cover ALL signup paths; the TS
-- helper lib/referral.ts mirrors the same algorithm for explicit inserts.
--
-- Run this in your Supabase SQL editor (live project; also test if you use one).

-- 1. referral_code column + uniqueness
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- 2. Code generator — unambiguous alphabet (no I/O/0/1), "GIVE-" prefix, distinct from band IDs.
CREATE OR REPLACE FUNCTION gen_referral_code() RETURNS TEXT AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'GIVE-';
  i      INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-fill referral_code on insert (covers trigger-created profiles too).
CREATE OR REPLACE FUNCTION set_referral_code() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_referral_code ON profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_referral_code();

-- 4. Backfill existing profiles (retry per-row on the off chance of a collision).
DO $$
DECLARE
  r RECORD;
  c TEXT;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      c := gen_referral_code();
      BEGIN
        UPDATE profiles SET referral_code = c WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- collision, try another code
      END;
    END LOOP;
  END LOOP;
END $$;

-- 5. referrals — one row per referred checkout session.
CREATE TABLE IF NOT EXISTS referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);

-- All access goes through service-key API routes, so lock the table down.
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to referrals" ON referrals;
CREATE POLICY "Service role full access to referrals"
  ON referrals FOR ALL
  USING (auth.role() = 'service_role');
