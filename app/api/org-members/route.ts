import { NextResponse } from 'next/server'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

// Lists the people who belong to the caller's org, plus any pending email
// invites. Used by the Settings → Team Members panel on the org dashboard.
export async function GET() {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'You are not part of an organization.' }, { status: 403 })

  const admin = serviceClient()

  // The original owner is marked on the org itself.
  const { data: org } = await admin
    .from('organizations')
    .select('admin_id')
    .eq('id', orgId)
    .maybeSingle()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  const members = (profiles || []).map(p => ({
    id: p.id,
    display_name: p.full_name,
    email: p.email,
    created_at: p.created_at,
    is_owner: p.id === org?.admin_id,
    is_you: p.id === userId,
  }))

  const { data: invites } = await admin
    .from('org_invites')
    .select('id, email, display_name, created_at, expires_at')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return NextResponse.json({ members, invites: invites || [] })
}
