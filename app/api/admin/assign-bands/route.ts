import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

// POST { email, band_ids: string[] }
// Bulk-link a set of bands to a personal account (sets bands.owner_id).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, band_ids } = await req.json()
  const ids: string[] = (Array.isArray(band_ids) ? band_ids : [])
    .map((s: string) => String(s).trim().toUpperCase())
    .filter(Boolean)

  if (!email || ids.length === 0) {
    return NextResponse.json({ error: 'email and at least one band_id are required' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Resolve the target account by email.
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email.trim())
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 })
  }

  const { data: updated, error } = await admin
    .from('bands')
    .update({ owner_id: profile.id })
    .in('band_id', ids)
    .select('band_id')

  if (error) {
    console.error('[assign-bands] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const assigned = (updated ?? []).map((b: { band_id: string }) => b.band_id)
  const missing = ids.filter((id) => !assigned.includes(id))

  return NextResponse.json({ success: true, count: assigned.length, assigned, missing })
}
