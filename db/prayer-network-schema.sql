-- ============================================
-- Prayer Network — connections between band holders
-- ============================================
-- A connection is requested by the person who taps someone else's band
-- (requester) toward the band's holder (recipient). Statuses: pending,
-- accepted, declined. Declined connections are deleted by the API (so a pair
-- can reconnect later); the 'declined' status is kept in the CHECK for safety.

CREATE TABLE prayer_network_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  band_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

CREATE INDEX idx_pnc_requester ON prayer_network_connections(requester_id);
CREATE INDEX idx_pnc_recipient ON prayer_network_connections(recipient_id);
CREATE INDEX idx_pnc_status ON prayer_network_connections(status);

-- updated_at trigger (function already created by the circles migration; CREATE
-- OR REPLACE keeps this file runnable on its own).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pnc_updated_at ON prayer_network_connections;
CREATE TRIGGER update_pnc_updated_at
  BEFORE UPDATE ON prayer_network_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE prayer_network_connections ENABLE ROW LEVEL SECURITY;

-- Either party can read a connection they're part of.
CREATE POLICY "View own connections"
  ON prayer_network_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- You can only create a connection where you are the requester.
CREATE POLICY "Create connection as requester"
  ON prayer_network_connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Only the recipient can update (accept).
CREATE POLICY "Recipient can respond"
  ON prayer_network_connections FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Either party can delete (decline / disconnect).
CREATE POLICY "Either party can delete"
  ON prayer_network_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
