-- ─────────────────────────────────────────────
-- Org team invites
-- ─────────────────────────────────────────────
-- A church/ministry org can have multiple users. Every user is simply a row in
-- `profiles` with `org_id` set to the org. This table backs the email-invite
-- flow that adds those extra users: the admin enters an email, we store a
-- pending invite with a one-time token, and email a link to /accept-invite.
-- When the recipient sets a password, their profile is created with org_id and
-- the invite is marked accepted.
--
-- Run this in your Supabase SQL editor (live project; also test if you use one).

CREATE TABLE IF NOT EXISTS org_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  invited_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org   ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);

-- One live (pending) invite per email per org. Re-inviting the same address
-- refreshes the existing pending row instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_pending_email
  ON org_invites(org_id, lower(email))
  WHERE status = 'pending';

-- All access goes through the service-key API routes, so lock the table down.
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to org_invites" ON org_invites;
CREATE POLICY "Service role full access to org_invites"
  ON org_invites FOR ALL
  USING (auth.role() = 'service_role');
