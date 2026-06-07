-- ============================================
-- Prayer Circles Migration (canonical schema)
-- ============================================
-- This is the source-of-truth schema for the Prayer Circles feature, including
-- the corrected prayer_circles SELECT policy (see db/circles-rls-fix.sql for the
-- patch applied to the already-migrated database).

-- 1. Prayer Circles
CREATE TABLE prayer_circles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qualifying_band_id BIGINT REFERENCES bands(id) ON DELETE SET NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Circle Members
CREATE TABLE circle_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES prayer_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- 3. Circle Prayer Requests
CREATE TABLE circle_prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES prayer_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_text TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Circle Intercessions
CREATE TABLE circle_intercessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES circle_prayer_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_prayer_circles_join_code ON prayer_circles(join_code);
CREATE INDEX idx_prayer_circles_created_by ON prayer_circles(created_by);
CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX idx_circle_prayer_requests_circle_id ON circle_prayer_requests(circle_id);
CREATE INDEX idx_circle_intercessions_request_id ON circle_intercessions(request_id);

-- ============================================
-- Updated_at trigger for prayer_circles
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prayer_circles_updated_at
  BEFORE UPDATE ON prayer_circles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE prayer_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_intercessions ENABLE ROW LEVEL SECURITY;

-- prayer_circles policies
-- Members and the leader can always read their circles; open circles stay
-- publicly look-up-able by join code.
CREATE POLICY "View circles"
  ON prayer_circles FOR SELECT
  USING (
    is_closed = false
    OR created_by = auth.uid()
    OR id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Band holders can create circles"
  ON prayer_circles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Leader can update their circle"
  ON prayer_circles FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Leader can delete their circle"
  ON prayer_circles FOR DELETE
  USING (auth.uid() = created_by);

-- circle_members policies
CREATE POLICY "Members can see who is in their circles"
  ON circle_members FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can join a circle"
  ON circle_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leader can remove members"
  ON circle_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    circle_id IN (
      SELECT id FROM prayer_circles WHERE created_by = auth.uid()
    )
  );

-- circle_prayer_requests policies
CREATE POLICY "Circle members can view prayer requests"
  ON circle_prayer_requests FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Circle members can post prayer requests"
  ON circle_prayer_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    circle_id IN (
      SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner or leader can update a prayer request"
  ON circle_prayer_requests FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    circle_id IN (
      SELECT id FROM prayer_circles WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Owner or leader can delete a prayer request"
  ON circle_prayer_requests FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    circle_id IN (
      SELECT id FROM prayer_circles WHERE created_by = auth.uid()
    )
  );

-- circle_intercessions policies
CREATE POLICY "Circle members can view intercessions"
  ON circle_intercessions FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM circle_prayer_requests
      WHERE circle_id IN (
        SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Circle members can intercede"
  ON circle_intercessions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    request_id IN (
      SELECT id FROM circle_prayer_requests
      WHERE circle_id IN (
        SELECT circle_id FROM circle_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove their own intercession"
  ON circle_intercessions FOR DELETE
  USING (auth.uid() = user_id);
