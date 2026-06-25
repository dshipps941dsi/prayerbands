import { NextResponse } from 'next/server'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

// Returns the signed-in user's own org. Previously took a ?uid= param and would
// hand back ANY user's org by id (IDOR) — now the user is resolved from the
// session, so a caller can only ever see their own organization.
export async function GET() {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 404 })

  const admin = serviceClient()
  const { data: org, error } = await admin
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error || !org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  return NextResponse.json({ profile: { org_id: orgId, organizations: org } })
}
