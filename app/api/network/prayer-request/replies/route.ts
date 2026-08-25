import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requestReachesUser, nameFromProfile } from '@/lib/network'
import { checkRateLimit } from '@/lib/rate-limit'

// Private replies to a shared prayer. A reply goes only to the requester —
// not a public thread. Others can send one (if the requester allowed replies
// and the request reached them); only the requester reads them all.
//
// GET  ?request_id=  -> requester: all replies (named). Replier: their own only.
// POST { request_id, body }

async function loadRequest(admin: ReturnType<typeof createServiceClient>, request_id: string) {
  const { data } = await admin
    .from('prayer_network_requests')
    .select('id, user_id, audience, allow_comments')
    .eq('id', request_id)
    .maybeSingle()
  return data as { id: string; user_id: string; audience: string | null; allow_comments: boolean } | null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request_id = req.nextUrl.searchParams.get('request_id') || ''
  if (!request_id) return NextResponse.json({ error: 'request_id is required' }, { status: 400 })

  const admin = createServiceClient()
  const request = await loadRequest(admin, request_id)
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isRequester = request.user_id === user.id
  // Requester sees every reply; anyone else sees only their own.
  const query = admin
    .from('prayer_request_comments')
    .select('id, user_id, body, created_at')
    .eq('request_id', request_id)
    .order('created_at', { ascending: true })
  const { data: rows } = isRequester ? await query : await query.eq('user_id', user.id)

  const list = rows ?? []
  // Name the authors (only meaningful for the requester's full view).
  const ids = Array.from(new Set(list.map((r: { user_id: string }) => r.user_id)))
  const names: Record<string, string> = {}
  if (isRequester && ids.length) {
    const { data: profs } = await admin.from('profiles').select('id, full_name, email').in('id', ids)
    for (const p of profs ?? []) names[(p as { id: string }).id] = nameFromProfile(p)
  }

  return NextResponse.json({
    allow_comments: !!request.allow_comments,
    is_requester: isRequester,
    replies: list.map((r: { id: string; user_id: string; body: string; created_at: string }) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author: isRequester ? (names[r.user_id] || 'Someone') : 'You',
      mine: r.user_id === user.id,
    })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const request_id = String(b.request_id || '')
  const body = String(b.body || '').trim().slice(0, 1000)
  if (!request_id || !body) return NextResponse.json({ error: 'request_id and body are required' }, { status: 400 })

  // Keep one person from flooding a requester with replies.
  if (!(await checkRateLimit(`reply:user:${user.id}`, 30, 3600))) {
    return NextResponse.json({ error: 'You’ve sent a lot of replies recently. Please wait a bit.' }, { status: 429 })
  }

  const admin = createServiceClient()
  const request = await loadRequest(admin, request_id)
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (request.user_id === user.id) {
    return NextResponse.json({ error: 'This is your own prayer.' }, { status: 400 })
  }
  if (!request.allow_comments) {
    return NextResponse.json({ error: 'Replies are not open on this prayer.' }, { status: 403 })
  }
  if (!(await requestReachesUser(admin, user.id, request.user_id, request.audience))) {
    return NextResponse.json({ error: 'You cannot reply to this prayer.' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('prayer_request_comments')
    .insert({ request_id, user_id: user.id, body })
    .select('id, created_at')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Could not send your reply.' }, { status: 500 })

  return NextResponse.json({ reply: { id: data.id, body, created_at: data.created_at, author: 'You', mine: true } })
}
