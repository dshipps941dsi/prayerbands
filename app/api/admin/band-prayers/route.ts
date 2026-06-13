import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// GET ?bandId=PB-XXXX  -> every prayer/registration for that band (incl. hidden)
// GET ?flagged=true    -> all flagged prayers (moderation queue)
// GET ?search=term     -> prayers matching text / name / city / band id (no band ID needed)
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = svc()

  const bandId = req.nextUrl.searchParams.get('bandId')
  if (bandId) {
    const { data } = await admin
      .from('registrations')
      .select('id, band_id, user_name, city, country, prayer, flagged, registered_at')
      .eq('band_id', bandId.trim())
      .order('registered_at', { ascending: false })
    return NextResponse.json({ prayers: data || [] })
  }

  const search = (req.nextUrl.searchParams.get('search') || '').trim()
  if (search) {
    // Find a wall prayer without its band ID — match across prayer text, name,
    // city, or band id. Strip PostgREST-significant chars so the term is literal.
    const safe = search.replace(/[%,()]/g, ' ').trim()
    const like = `%${safe}%`
    const { data } = await admin
      .from('registrations')
      .select('id, band_id, user_name, city, country, prayer, flagged, registered_at')
      .or(`prayer.ilike.${like},user_name.ilike.${like},city.ilike.${like},band_id.ilike.${like}`)
      .order('registered_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ prayers: data || [] })
  }

  if (req.nextUrl.searchParams.get('flagged')) {
    const { data } = await admin
      .from('registrations')
      .select('id, user_name, band_id, prayer, flagged_reason, created_at')
      .eq('flagged', true)
      .order('created_at', { ascending: false })
    return NextResponse.json({ prayers: data || [] })
  }

  return NextResponse.json({ error: 'Specify bandId, search, or flagged' }, { status: 400 })
}

// POST { action: 'remove' | 'delete' | 'approve', id }
//  remove  -> clear prayer text + hide from wall (keeps the journey stop)
//  delete  -> remove the registration row entirely
//  approve -> unflag (restore to wall)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { action, id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = svc()
  let error = null

  if (action === 'remove') {
    ({ error } = await admin.from('registrations').update({ prayer: null, flagged: true }).eq('id', id))
  } else if (action === 'delete') {
    ({ error } = await admin.from('registrations').delete().eq('id', id))
  } else if (action === 'approve') {
    ({ error } = await admin.from('registrations').update({ flagged: false, flagged_reason: null }).eq('id', id))
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (error) {
    console.error('[admin/band-prayers]', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
