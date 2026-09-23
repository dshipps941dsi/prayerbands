import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/team'
import { createServiceClient } from '@/lib/supabase/server'

// Read-only view of the circles for the admin: every circle with its leader
// and counts, a stream of what happened across all circles (joins, topics,
// prayers written, taps of Pray), and one circle's whole room. Nothing here
// writes. Circles are private to their members; this is the operator's window
// during launch, the same way the activity feed is for bands.

async function names(admin: ReturnType<typeof createServiceClient>, ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))]
  if (!uniq.length) return new Map<string, { name: string; email: string | null }>()
  const { data } = await admin.from('profiles').select('id, full_name, email').in('id', uniq)
  return new Map((data ?? []).map((p: any) => [p.id as string, { name: (p.full_name || p.email || 'Someone') as string, email: (p.email ?? null) as string | null }]))
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = createServiceClient()
  const id = req.nextUrl.searchParams.get('id')

  // ── One circle, the whole room ────────────────────────────────────────
  if (id) {
    const { data: circle } = await admin.from('prayer_circles').select('id, name, description, join_code, created_by, is_closed, created_at').eq('id', id).maybeSingle()
    if (!circle) return NextResponse.json({ error: 'No such circle.' }, { status: 404 })
    const [{ data: members }, { data: topics }] = await Promise.all([
      admin.from('circle_members').select('user_id, role, joined_at').eq('circle_id', id).order('joined_at'),
      admin.from('circle_prayer_requests').select('id, user_id, title, kind, request_text, is_answered, answered_at, created_at').eq('circle_id', id).order('created_at', { ascending: false }),
    ])
    const topicIds = (topics ?? []).map((t: any) => t.id)
    const [{ data: replies }, { data: inters }] = topicIds.length
      ? await Promise.all([
          admin.from('circle_prayer_replies').select('id, request_id, user_id, body, created_at').in('request_id', topicIds).order('created_at'),
          admin.from('circle_intercessions').select('request_id, user_id, created_at').in('request_id', topicIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }]
    const people = await names(admin, [
      (circle as any).created_by,
      ...(members ?? []).map((m: any) => m.user_id),
      ...(topics ?? []).map((t: any) => t.user_id),
      ...(replies ?? []).map((r: any) => r.user_id),
      ...(inters ?? []).map((i: any) => i.user_id),
    ])
    const who = (uid: string) => people.get(uid)?.name ?? 'Someone'
    const repliesByTopic = new Map<string, any[]>()
    for (const r of (replies ?? []) as any[]) { if (!repliesByTopic.has(r.request_id)) repliesByTopic.set(r.request_id, []); repliesByTopic.get(r.request_id)!.push({ id: r.id, who: who(r.user_id), body: r.body, at: r.created_at }) }
    const prayedByTopic = new Map<string, string[]>()
    for (const i of (inters ?? []) as any[]) { if (!prayedByTopic.has(i.request_id)) prayedByTopic.set(i.request_id, []); prayedByTopic.get(i.request_id)!.push(who(i.user_id)) }
    return NextResponse.json({
      circle: { ...circle, leader: who((circle as any).created_by) },
      members: (members ?? []).map((m: any) => ({ user_id: m.user_id, who: who(m.user_id), email: people.get(m.user_id)?.email ?? null, role: m.role, joined_at: m.joined_at })),
      topics: (topics ?? []).map((t: any) => ({
        id: t.id, who: who(t.user_id), title: t.title, kind: t.kind, text: t.request_text, answered: !!t.is_answered, answered_at: t.answered_at, at: t.created_at,
        prayed: prayedByTopic.get(t.id) ?? [], replies: repliesByTopic.get(t.id) ?? [],
      })),
    })
  }

  // ── All circles, plus a stream of recent activity across them ─────────
  const [{ data: circles }, { data: members }, { data: topics }, { data: replies }, { data: inters }] = await Promise.all([
    admin.from('prayer_circles').select('id, name, description, join_code, created_by, is_closed, created_at').order('created_at', { ascending: false }),
    admin.from('circle_members').select('circle_id, user_id, role, joined_at').order('joined_at', { ascending: false }),
    admin.from('circle_prayer_requests').select('id, circle_id, user_id, title, kind, request_text, is_answered, created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('circle_prayer_replies').select('id, request_id, user_id, body, created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('circle_intercessions').select('request_id, user_id, created_at').order('created_at', { ascending: false }).limit(300),
  ])
  const topicById = new Map((topics ?? []).map((t: any) => [t.id as string, t]))
  const circleById = new Map((circles ?? []).map((c: any) => [c.id as string, c]))
  const people = await names(admin, [
    ...(circles ?? []).map((c: any) => c.created_by),
    ...(members ?? []).map((m: any) => m.user_id),
    ...(topics ?? []).map((t: any) => t.user_id),
    ...(replies ?? []).map((r: any) => r.user_id),
    ...(inters ?? []).map((i: any) => i.user_id),
  ])
  const who = (uid: string) => people.get(uid)?.name ?? 'Someone'
  const circleName = (cid: string) => circleById.get(cid)?.name ?? 'a circle'

  const list = (circles ?? []).map((c: any) => {
    const ms = (members ?? []).filter((m: any) => m.circle_id === c.id)
    const ts = (topics ?? []).filter((t: any) => t.circle_id === c.id)
    const last = [ms[0]?.joined_at, ts[0]?.created_at].filter(Boolean).sort().at(-1) ?? c.created_at
    return {
      id: c.id, name: c.name, description: c.description, join_code: c.join_code, is_closed: !!c.is_closed, created_at: c.created_at,
      leader: who(c.created_by), members: ms.length, co_leaders: ms.filter((m: any) => m.role === 'co_leader').length, topics: ts.length, last_activity: last,
    }
  })

  type Ev = { at: string; circle_id: string; circle: string; kind: 'joined' | 'topic' | 'prayer' | 'prayed' | 'answered'; who: string; detail: string | null }
  const events: Ev[] = []
  for (const m of (members ?? []) as any[]) {
    const c = circleById.get(m.circle_id)
    if (c && m.user_id === c.created_by) continue // the leader creating it is not a "join"
    events.push({ at: m.joined_at, circle_id: m.circle_id, circle: circleName(m.circle_id), kind: 'joined', who: who(m.user_id), detail: m.role === 'co_leader' ? 'co-leader' : null })
  }
  for (const t of (topics ?? []) as any[]) {
    events.push({ at: t.created_at, circle_id: t.circle_id, circle: circleName(t.circle_id), kind: 'topic', who: who(t.user_id), detail: t.title || String(t.request_text || '').slice(0, 120) })
    if (t.is_answered) events.push({ at: t.answered_at || t.created_at, circle_id: t.circle_id, circle: circleName(t.circle_id), kind: 'answered', who: who(t.user_id), detail: t.title || null })
  }
  for (const r of (replies ?? []) as any[]) {
    const t = topicById.get(r.request_id); if (!t) continue
    events.push({ at: r.created_at, circle_id: t.circle_id, circle: circleName(t.circle_id), kind: 'prayer', who: who(r.user_id), detail: `under “${t.title || String(t.request_text || '').slice(0, 60)}”: ${String(r.body).slice(0, 140)}` })
  }
  for (const i of (inters ?? []) as any[]) {
    const t = topicById.get(i.request_id); if (!t) continue
    events.push({ at: i.created_at, circle_id: t.circle_id, circle: circleName(t.circle_id), kind: 'prayed', who: who(i.user_id), detail: t.title || String(t.request_text || '').slice(0, 60) })
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1))
  return NextResponse.json({ circles: list, events: events.slice(0, 150) })
}
