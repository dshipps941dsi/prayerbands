import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { bandIdCandidate, bandIdFilter } from '@/lib/band-id'

// TODO(stage 2): replace with a profiles.role check.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function adminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL ? user : null
}

// GET /api/admin/band-lookup?id=PB-UNVBS
//
// The packing and give-away screens used to read `bands` straight from the
// browser. That depends on the anon/authenticated column grants, and `size` was
// never granted after the size importer added it — so every lookup came back
// "permission denied for table bands", which the page could only report as
// "not a known band" about a band sitting in your hand.
//
// Going through the server sidesteps the grant list entirely, and keeps working
// when the next column is added.
export async function GET(req: NextRequest) {
  const user = await adminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('id') || ''
  const candidate = bandIdCandidate(raw)
  if (!candidate) {
    return NextResponse.json({ error: `Could not read a band id from "${raw.trim().slice(0, 30)}".` }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: matches, error } = await admin
    .from('bands')
    .select('band_id, theme, color, size, status, owner_id, org_id')
    .or(bandIdFilter(candidate))
    .limit(3)

  if (error) return NextResponse.json({ error: 'Could not look that band up.' }, { status: 500 })

  if (matches && matches.length > 1) {
    return NextResponse.json({
      candidate,
      ambiguous: matches.map((m: any) => m.band_id),
      error: `${candidate} matches ${matches.map((m: any) => m.band_id).join(' and ')} — type the full id.`,
    }, { status: 409 })
  }

  const m = matches && matches.length === 1 ? (matches[0] as any) : null

  return NextResponse.json({
    candidate,
    match: m && {
      band_id: m.band_id,
      theme: m.theme,
      color: m.color,
      size: m.size,
      status: m.status,
      has_owner: !!m.owner_id,
      // Lets the give-away screen treat a band you are holding back yourself as
      // still yours to give, without shipping owner ids to the browser.
      owner_is_you: m.owner_id === user.id,
      has_org: !!m.org_id,
    },
  })
}
