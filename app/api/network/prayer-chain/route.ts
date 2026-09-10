import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// The viewer's side of "I prayed for you": what they have sent and what has
// come back, newest first, plus the last time they prayed for each person so
// the Partners list can say "prayed 2d ago" beside a name. The received half
// already reaches the inbox; it is repeated here so both directions read as
// one chain in one place.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const [{ data: sent }, { data: received }] = await Promise.all([
    svc.from('prayer_encouragements').select('id, to_user_id, note, created_at')
      .eq('from_user_id', user.id).order('created_at', { ascending: false }).limit(60),
    svc.from('prayer_encouragements').select('id, from_user_id, note, created_at')
      .eq('to_user_id', user.id).order('created_at', { ascending: false }).limit(60),
  ])

  const ids = new Set<string>()
  for (const s of sent || []) ids.add(s.to_user_id)
  for (const r of received || []) ids.add(r.from_user_id)
  const names: Record<string, string> = {}
  const avatars: Record<string, any> = {}
  if (ids.size) {
    const { data: profs } = await svc.from('profiles')
      .select('id, full_name, avatar_icon, avatar_initials, avatar_font')
      .in('id', [...ids])
    for (const p of profs || []) {
      names[p.id] = p.full_name || 'Someone'
      avatars[p.id] = { icon: p.avatar_icon ?? null, initials: p.avatar_initials ?? null, font: p.avatar_font ?? null }
    }
  }

  const lastSentByUser: Record<string, string> = {}
  for (const s of sent || []) if (!lastSentByUser[s.to_user_id]) lastSentByUser[s.to_user_id] = s.created_at

  return NextResponse.json({
    sent: (sent || []).map(s => ({ id: s.id, user_id: s.to_user_id, name: names[s.to_user_id] || 'Someone', avatar: avatars[s.to_user_id], note: s.note || '', at: s.created_at })),
    received: (received || []).map(r => ({ id: r.id, user_id: r.from_user_id, name: names[r.from_user_id] || 'Someone', avatar: avatars[r.from_user_id], note: r.note || '', at: r.created_at })),
    lastSentByUser,
  })
}
