import { createClient, createServiceClient } from '@/lib/supabase/server'

// ── Team access ────────────────────────────────────────────────────────────
// One source of truth for admin / fulfillment gating, replacing the old
// per-file `email === 'dshipps941@gmail.com'` checks.
//
//   • 'admin'       — full Control Centre
//   • 'fulfillment' — the /fulfill packing/shipping pages only
//
// Bootstrap admins (ADMIN_EMAILS env, comma-separated) ALWAYS resolve to
// 'admin', so the owner can never be locked out even if the DB row is wrong.

export type TeamRole = 'admin' | 'fulfillment'

const BOOTSTRAP_ADMINS = (process.env.ADMIN_EMAILS || 'dshipps941@gmail.com')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

// Resolve the signed-in caller's team role, or null if they're not on the team.
export async function getTeamRole(): Promise<{ user: any; email: string; role: TeamRole } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!user || !email) return null
  if (BOOTSTRAP_ADMINS.includes(email)) return { user, email, role: 'admin' }
  const admin = createServiceClient()
  const { data } = await admin.from('profiles').select('team_role').eq('id', user.id).maybeSingle()
  const role = (data as { team_role?: string } | null)?.team_role
  if (role === 'admin' || role === 'fulfillment') return { user, email, role }
  return null
}

// The user object if the caller is a full admin, else null. (Drop-in for the
// old `isAdmin()`/`return user?.email === ADMIN_EMAIL ? user : null` checks.)
export async function adminUser(): Promise<any | null> {
  const t = await getTeamRole()
  return t && t.role === 'admin' ? t.user : null
}

// Boolean form for the many `if (!(await isAdmin())) return 401` gates.
export async function isAdmin(): Promise<boolean> {
  return !!(await adminUser())
}

// Admin OR fulfillment — for the /fulfill pages and their APIs.
export async function fulfillmentUser(): Promise<any | null> {
  const t = await getTeamRole()
  return t ? t.user : null   // any team role (admin or fulfillment) qualifies
}
export async function isFulfillment(): Promise<boolean> {
  return !!(await fulfillmentUser())
}

// ── Minimal-diff helpers for the existing per-file checks ──────────────────
// Given an ALREADY-fetched auth user, is it an admin (bootstrap or DB role)?
// Lets old checks migrate with a one-line swap: `user?.email === ADMIN_EMAIL`
// becomes `await isTeamAdmin(user)`.
export async function isTeamAdmin(user: { id?: string; email?: string | null } | null | undefined): Promise<boolean> {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  if (BOOTSTRAP_ADMINS.includes(email)) return true
  if (!user?.id) return false
  const admin = createServiceClient()
  const { data } = await admin.from('profiles').select('team_role').eq('id', user.id).maybeSingle()
  return (data as { team_role?: string } | null)?.team_role === 'admin'
}

// Admin OR fulfillment — for the /fulfill pages and their APIs.
export async function isTeamMember(user: { id?: string; email?: string | null } | null | undefined): Promise<boolean> {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  if (BOOTSTRAP_ADMINS.includes(email)) return true
  if (!user?.id) return false
  const admin = createServiceClient()
  const { data } = await admin.from('profiles').select('team_role').eq('id', user.id).maybeSingle()
  const role = (data as { team_role?: string } | null)?.team_role
  return role === 'admin' || role === 'fulfillment'
}
