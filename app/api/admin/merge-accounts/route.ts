import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/team'
import { createServiceClient } from '@/lib/supabase/server'

// One person, two accounts. GET previews both; POST merges the dropped
// account into the kept one through public.merge_accounts() (see
// supabase/migrations/…merge_accounts…). Admin only.
//
// GET  ?keep=<email>&drop=<email>          — what each account holds
// POST { keep_email, drop_email, confirm }  — do it

type Summary = { id: string; email: string; name: string | null; created_at: string; stops: number; owned: number; credited: number; circles: number; partners: number; journal: number; push: number; sponsored: number; is_admin: boolean }

async function summarise(admin: ReturnType<typeof createServiceClient>, email: string): Promise<Summary | null> {
  const { data: p } = await admin.from('profiles').select('id, email, full_name, created_at, team_role').ilike('email', email.trim()).maybeSingle()
  if (!p) return null
  const id = p.id as string
  const count = async (table: string, col: string) => {
    const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, id)
    return count ?? 0
  }
  const [stops, owned, credited, circles, journal, push, sponsored] = await Promise.all([
    count('registrations', 'user_id'), count('bands', 'owner_id'), count('bands', 'upline_user_id'),
    count('circle_members', 'user_id'), count('prayer_network_requests', 'user_id'), count('push_subscriptions', 'user_id'),
    count('profiles', 'upline_user_id'),
  ])
  const { count: partners } = await admin.from('prayer_network_connections').select('*', { count: 'exact', head: true })
    .eq('status', 'accepted').or(`requester_id.eq.${id},recipient_id.eq.${id}`)
  return { id, email: p.email, name: p.full_name ?? null, created_at: p.created_at, stops, owned, credited, circles, partners: partners ?? 0, journal, push, sponsored, is_admin: !!p.team_role }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const keep = req.nextUrl.searchParams.get('keep') || ''
  const drop = req.nextUrl.searchParams.get('drop') || ''
  if (!keep || !drop) return NextResponse.json({ error: 'Both emails are required.' }, { status: 400 })
  const admin = createServiceClient()
  const [k, d] = await Promise.all([summarise(admin, keep), summarise(admin, drop)])
  if (!k) return NextResponse.json({ error: `No account under ${keep}.` }, { status: 404 })
  if (!d) return NextResponse.json({ error: `No account under ${drop}.` }, { status: 404 })
  if (k.id === d.id) return NextResponse.json({ error: 'Those are the same account.' }, { status: 400 })
  return NextResponse.json({ keep: k, drop: d })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const keepEmail = String(body.keep_email || '').trim()
  const dropEmail = String(body.drop_email || '').trim()
  if (!keepEmail || !dropEmail) return NextResponse.json({ error: 'Both emails are required.' }, { status: 400 })
  if (body.confirm !== true) return NextResponse.json({ error: 'Confirm the merge first.' }, { status: 400 })

  const admin = createServiceClient()
  const [k, d] = await Promise.all([summarise(admin, keepEmail), summarise(admin, dropEmail)])
  if (!k || !d) return NextResponse.json({ error: 'One of those accounts was not found.' }, { status: 404 })
  if (k.id === d.id) return NextResponse.json({ error: 'Those are the same account.' }, { status: 400 })
  if (d.is_admin) return NextResponse.json({ error: 'The account being dropped is a team account. Remove its role first.' }, { status: 400 })

  const { data, error } = await admin.rpc('merge_accounts', { keep: k.id, drop_: d.id })
  if (error) {
    // 42883: the function is not there yet (migration pending).
    if (error.code === '42883' || /merge_accounts/.test(error.message)) {
      return NextResponse.json({ error: 'The merge function is not installed yet. Run the merge_accounts migration in the SQL editor.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, kept: k.email, dropped: d.email, moved: data ?? {} })
}
