import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Register / remove this browser's push subscription for the signed-in person.
// Upsert on endpoint so re-subscribing after a permission reset does not pile
// up rows; the service role is used so an endpoint that once belonged to a
// different account on a shared device simply moves to the current one.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sub = body?.subscription
  const endpoint = String(sub?.endpoint || '')
  const p256dh = String(sub?.keys?.p256dh || '')
  const auth = String(sub?.keys?.auth || '')
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { error } = await svc.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth, user_agent: req.headers.get('user-agent')?.slice(0, 200) || null, failed_at: null },
    { onConflict: 'endpoint' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const endpoint = String(body?.endpoint || '')
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const svc = createServiceClient()
  await svc.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
