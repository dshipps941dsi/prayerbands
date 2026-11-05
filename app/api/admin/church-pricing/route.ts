import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { loadChurchTiers } from '@/lib/church-pricing-load'
import { CHURCH_TIERS_KEY, validateChurchTiers, normalizeChurchTiers } from '@/lib/church-pricing'

// Admin editor for church quantity pricing (Admin > Pricing). The tiers are
// one JSON value in site_config; the church checkout reads the same value.

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// GET -> { tiers, saved }. saved is false while the built-in prices are in use.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { tiers, saved } = await loadChurchTiers(createServiceClient())
    return NextResponse.json({ tiers, saved })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not load church pricing.' }, { status: 500 })
  }
}

// POST { tiers: [{ min, cents }] } -> { tiers, saved: true }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const checked = validateChurchTiers(body?.tiers)
  if ('error' in checked) return NextResponse.json({ error: checked.error }, { status: 400 })
  const value = JSON.stringify(checked.tiers)

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('site_config')
    .upsert(
      { key: CHURCH_TIERS_KEY, value, label: 'Church quantity pricing (per band, by order size)', updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    .select('value')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Read back what was stored. A write that reports success but stores
  // nothing must not look saved: these prices are what churches get charged.
  let stored: unknown = null
  try { stored = JSON.parse((data as { value?: string } | null)?.value as string) } catch { stored = null }
  const back = normalizeChurchTiers(stored)
  if (!back || JSON.stringify(back) !== value) {
    return NextResponse.json({ error: 'The prices did not save. Nothing has changed.' }, { status: 500 })
  }
  return NextResponse.json({ tiers: back, saved: true })
}
