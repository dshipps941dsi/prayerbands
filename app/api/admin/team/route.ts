import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/team'

// Team management — admin only. GET lists members with a role; POST sets or
// clears a person's role by email (they must already have an account).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = createServiceClient()
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, team_role')
    .not('team_role', 'is', null)
    .order('team_role', { ascending: true })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const role: unknown = body.role  // 'admin' | 'fulfillment' | null (removes)
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (role !== null && role !== 'admin' && role !== 'fulfillment') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  const admin = createServiceClient()
  const { data: prof } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (!prof) return NextResponse.json({ error: 'No account found for that email — they need to sign in once first.' }, { status: 404 })
  const { error } = await admin.from('profiles').update({ team_role: role }).eq('id', prof.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
