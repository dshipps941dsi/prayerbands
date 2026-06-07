-- ============================================
-- Prayer Network — shared prayer requests + intercessions
-- ============================================
-- Run AFTER db/prayer-network-schema.sql (this references prayer_network_connections).
-- Requests a user shares with their accepted connections, and the intercessions
-- (who is praying) on each.

CREATE TABLE prayer_network_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_text TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pnr_user_id ON prayer_network_requests(user_id);

ALTER TABLE prayer_network_requests ENABLE ROW LEVEL SECURITY;

-- Owners fully manage their own requests.
CREATE POLICY "Users can manage their own network requests"
  ON prayer_network_requests FOR ALL
  USING (auth.uid() = user_id);

-- Accepted connections (and the owner) can read a request.
CREATE POLICY "Connected users can view network requests"
  ON prayer_network_requests FOR SELECT
  USING (
    user_id IN (
      SELECT CASE
        WHEN requester_id = auth.uid() THEN recipient_id
        ELSE requester_id
      END
      FROM prayer_network_connections
      WHERE (requester_id = auth.uid() OR recipient_id = auth.uid())
        AND status = 'accepted'
    )
    OR auth.uid() = user_id
  );

CREATE TABLE prayer_network_intercessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES prayer_network_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

CREATE INDEX idx_pni_request_id ON prayer_network_intercessions(request_id);

ALTER TABLE prayer_network_intercessions ENABLE ROW LEVEL SECURITY;

-- A user manages only their own intercessions (insert/delete/select self).
-- Aggregate counts for display are read server-side with the service role.
CREATE POLICY "Users can manage their own intercessions"
  ON prayer_network_intercessions FOR ALL
  USING (auth.uid() = user_id);
