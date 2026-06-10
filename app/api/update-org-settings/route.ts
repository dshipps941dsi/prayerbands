import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

// Lets a ministry edit its own profile (name, location, website) and theme
// color from the dashboard Settings tab. Any member of the org may edit.
export async function POST(req: NextRequest) {
  // Identify the requester and the org they belong to (by membership, so any
  // invited team member can manage — not just the original owner).
  const { userId, orgId } = await getSessionOrg()
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (!orgId) {
    return NextResponse.json({ error: 'You are not part of an organization.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))

  // Service-key client: the update bypasses owner-only RLS, but we scope it to
  // the org this user belongs to, so they can only edit their own.
  const admin = serviceClient()
  const org = { id: orgId }

  // Build the update from only the fields we allow ministries to change.
  const updates: Record<string, string | null> = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }
  if (typeof body.location === 'string') updates.location = body.location.trim() || null
  if (typeof body.website === 'string') updates.website = body.website.trim() || null
  if (typeof body.color === 'string') {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      return NextResponse.json({ error: 'Color must be a hex value like #1a6b4a.' }, { status: 400 })
    }
    updates.color = body.color.toLowerCase()
  }
  // Logo is set via /api/upload-org-logo; here we only allow clearing it.
  if (body.logo_url === null) updates.logo_url = null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', org.id)
    .select('*')
    .single()

  if (error) {
    console.error('[update-org-settings] update error:', error)
    return NextResponse.json({ error: 'Could not save changes.' }, { status: 500 })
  }

  return NextResponse.json({ org: updated })
}
