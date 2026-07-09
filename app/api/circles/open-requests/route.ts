import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nameFromProfile } from '@/lib/network'

// GET /api/circles/open-requests
// Open (unanswered) prayer requests across every circle the viewer belongs to,
// authored by *other* members — this feeds the "Others' Requests → Circles"
// list. Each carries its circle name, author, pray count, and whether the
// viewer has already prayed. Service role: these tables have recursive RLS.
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient()

    const { data: memberships } = await admin
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', user.id)
    const circleIds = [...new Set((memberships ?? []).map((m: any) => m.circle_id))]
    if (!circleIds.length) return NextResponse.json({ requests: [] })

    const { data: circles } = await admin
      .from('prayer_circles')
      .select('id, name, is_closed')
      .in('id', circleIds)
    const circleName: Record<string, string> = {}
    const openCircleIds: string[] = []
    ;(circles ?? []).forEach((c: any) => {
      circleName[c.id] = c.name
      if (!c.is_closed) openCircleIds.push(c.id)
    })
    if (!openCircleIds.length) return NextResponse.json({ requests: [] })

    const { data: reqs } = await admin
      .from('circle_prayer_requests')
      .select('id, circle_id, user_id, request_text, created_at')
      .in('circle_id', openCircleIds)
      .eq('is_answered', false)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
    const list = (reqs ?? []) as any[]
    if (!list.length) return NextResponse.json({ requests: [] })

    const reqIds = list.map(r => r.id)
    const { data: inters } = await admin
      .from('circle_intercessions')
      .select('request_id, user_id')
      .in('request_id', reqIds)
    const countByReq: Record<string, number> = {}
    const mineByReq: Record<string, boolean> = {}
    ;(inters ?? []).forEach((i: any) => {
      countByReq[i.request_id] = (countByReq[i.request_id] ?? 0) + 1
      if (i.user_id === user.id) mineByReq[i.request_id] = true
    })

    const authorIds = [...new Set(list.map(r => r.user_id).filter(Boolean))]
    const nameById: Record<string, string> = {}
    if (authorIds.length) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds)
      ;(profs ?? []).forEach((p: any) => { nameById[p.id] = nameFromProfile(p) })
    }

    const requests = list.map(r => ({
      id: r.id,
      circle_id: r.circle_id,
      circle_name: circleName[r.circle_id] ?? 'A circle',
      request_text: r.request_text,
      author: r.user_id ? (nameById[r.user_id] ?? 'A member') : 'A member',
      created_at: r.created_at,
      intercession_count: countByReq[r.id] ?? 0,
      i_prayed: mineByReq[r.id] ?? false,
    }))

    return NextResponse.json({ requests })
  } catch (err) {
    console.error('Circle open-requests error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
