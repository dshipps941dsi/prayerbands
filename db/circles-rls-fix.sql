-- ============================================
-- Prayer Circles — RLS fix (run on existing DB)
-- ============================================
-- The original prayer_circles SELECT policy only allowed `is_closed = false`.
-- That single rule governs every read of the table, which caused two bugs:
--   1. Closing a circle (PATCH is_closed=true) returned HTTP 500 — the
--      .update().select() uses SQL RETURNING, and the now-closed row failed the
--      SELECT policy, so PostgREST raised an error (the update still committed).
--   2. Members/leaders got 404 when viewing a closed circle.
--
-- This replaces it so members and the leader can always read their own circles,
-- while open circles stay publicly look-up-able by join code.

DROP POLICY IF EXISTS "Anyone can look up a circle by join code" ON prayer_circles;
DROP POLICY IF EXISTS "View circles" ON prayer_circles;

CREATE POLICY "View circles"
  ON prayer_circles FOR SELECT
  USING (
    is_closed = false
    OR created_by = auth.uid()
    OR id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid())
  );
