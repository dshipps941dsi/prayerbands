import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Team messaging: a note that drops into a person's inbox (or everyone's).
// The classic use is "I prayed for you" to one member who registered.
//   GET  ?search=<q>  -> up to 8 matching people to send to
//   GET               -> the most recent messages sent (with recipient name)
//   POST { title, body, targetUserId?, ctaLabel?, ctaHref? } -> send one
//   PATCH { id, active } -> retract / restore a sent message
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isTeamAdmin(user))) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const svc = createServiceClient()

  const search = (req.nextUrl.searchParams.get('search') || '').trim()
  if (search) {
    const safe = search.replace(/[%,()]/g, '')
    const { data } = await svc
      .from('profiles')
      .select('id, full_name, email')
      .or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
      .order('full_name', { ascending: true })
      .limit(8)
    return NextResponse.json({ people: data || [] })
  }

  const { data: anns } = await svc
    .from('announcements')
    .select('id, title, body, cta_label, cta_href, target_user_id, active, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  const targetIds = [...new Set((anns || []).map(a => a.target_user_id).filter(Boolean))] as string[]
  const names: Record<string, string> = {}
  if (targetIds.length) {
    const { data: profs } = await svc.from('profiles').select('id, full_name, email').in('id', targetIds)
    for (const p of profs || []) names[p.id] = p.full_name || (p.email ? p.email.split('@')[0] : 'Someone')
  }
  const list = (anns || []).map(a => ({ ...a, recipient: a.target_user_id ? (names[a.target_user_id] || 'Someone') : 'Everyone' }))
  return NextResponse.json({ announcements: list })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  const message = String(body.body || '').trim()
  const targetUserId = body.targetUserId ? String(body.targetUserId) : null
  const ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim() : null
  const ctaHref = body.ctaHref ? String(body.ctaHref).trim() : null
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 })

  const svc = createServiceClient()
  // Guard the recipient id: it must be a real profile, or the message would be
  // sent into the void with no one able to see it.
  if (targetUserId) {
    const { data: p } = await svc.from('profiles').select('id').eq('id', targetUserId).maybeSingle()
    if (!p) return NextResponse.json({ error: 'That recipient was not found.' }, { status: 400 })
  }

  const { data, error } = await svc.from('announcements').insert({
    title, body: message, target_user_id: targetUserId,
    cta_label: ctaLabel, cta_href: ctaHref, created_by: user.id,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const svc = createServiceClient()
  const { error } = await svc.from('announcements').update({ active: !!body.active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
