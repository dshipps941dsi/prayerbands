import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/org-auth'

// Public lookup so the /accept-invite page can show who's inviting and to which
// church before the recipient sets a password. Only returns non-sensitive info,
// and only for a still-valid token.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const admin = serviceClient()
  const { data: invite } = await admin
    .from('org_invites')
    .select('email, display_name, status, expires_at, org_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'invalid' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: invite.status }, { status: 410 })
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const { data: org } = await admin
    .from('organizations')
    .select('name, logo_url, color')
    .eq('id', invite.org_id)
    .maybeSingle()

  return NextResponse.json({
    email: invite.email,
    display_name: invite.display_name,
    org: { name: org?.name || 'a ministry', logo_url: org?.logo_url || null, color: org?.color || '#1a6b4a' },
  })
}
