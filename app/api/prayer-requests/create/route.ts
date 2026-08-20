import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/prayer-requests/create  { title, body, visibility }
// Create a prayer request owned by the signed-in user. (Ported from the legacy
// Pages Router handler; the author is now derived from the session rather than
// trusted from the request body.)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, body, visibility, band_id } = await req.json().catch(() => ({}))
  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  // 'private' is a prayer written on your own band page: readable by its
  // author and nobody else. The band page used to insert it straight from the
  // browser, where the value was rejected and the error discarded.
  const vis = ['network', 'public', 'both', 'private'].includes(visibility) ? visibility : 'network'
  const band = typeof band_id === 'string' && band_id.trim() ? band_id.trim().toUpperCase() : null

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('prayer_requests')
    .insert({ user_id: user.id, title: title.trim(), body: body ?? null, visibility: vis, band_id: band, status: 'active' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}
