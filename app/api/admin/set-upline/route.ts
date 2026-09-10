import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { findAuthUserByEmail } from '@/lib/find-auth-user'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function callerEmail(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

// Attribute bands to the person who put them into circulation.
//
// Deliberately accepts an email rather than requiring an account: during
// seeding, bands are handed to someone long before they ever tap one. The
// address is stored now and the signup trigger resolves it to a user id the
// moment they sign up, so attribution never depends on remembering to come
// back later.
//
// POST { email, band_ids: string[] }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const { email, band_ids } = await req.json()
  const address = String(email || '').trim().toLowerCase()
  const ids: string[] = (Array.isArray(band_ids) ? band_ids : [])
    .map((s: string) => String(s).trim().toUpperCase())
    .filter(Boolean)

  if (!address || ids.length === 0) {
    return NextResponse.json({ error: 'An email and at least one band ID are required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return NextResponse.json({ error: `"${address}" does not look like an email address.` }, { status: 400 })
  }

  const admin = createServiceClient()

  // Resolve to an account if one exists; otherwise the email alone is enough.
  const authUser = await findAuthUserByEmail(admin, address)

  const { data: updated, error } = await admin
    .from('bands')
    .update({ upline_email: address, upline_user_id: authUser?.id ?? null })
    .in('band_id', ids)
    .select('band_id, owner_id')

  if (error) {
    console.error('[set-upline] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const assigned = (updated ?? []).map((b: { band_id: string }) => b.band_id)
  const missing = ids.filter(id => !assigned.includes(id))

  // A band credited after it was already claimed: the holder should sit under
  // the giver the same way they would have if the credit had been there when
  // they tapped (claim-band does this at claim time). First-wins, like there —
  // someone who already has an upline keeps it. Only when the giver has an
  // account; an email-only credit resolves later and there is no id to point at.
  let placed: string[] = []
  if (authUser?.id) {
    const holders = (updated ?? [])
      .filter((b: any) => b.owner_id && b.owner_id !== authUser.id)
      .map((b: any) => ({ owner_id: b.owner_id as string, band_id: b.band_id as string }))
    const seen = new Set<string>()
    for (const h of holders) {
      if (seen.has(h.owner_id)) continue
      seen.add(h.owner_id)
      const { data: p } = await admin
        .from('profiles')
        .update({ upline_user_id: authUser.id, upline_band_id: h.band_id })
        .eq('id', h.owner_id)
        .is('upline_user_id', null)
        .select('full_name')
      if (p && p.length) placed.push(p[0].full_name || h.owner_id)
    }
  }

  return NextResponse.json({
    success: true,
    email: address,
    linked: !!authUser,
    count: assigned.length,
    assigned,
    missing,
    placed,
  })
}
