import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/set-default-band { bandId }
// Pin the band the installed app opens to (/my-band honors it). Pass the band
// you already default to, to clear it (toggle off). You can only pin a band you
// own or currently hold.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bandId } = await req.json().catch(() => ({}))
  const admin = createServiceClient()

  const { data: prof } = await admin.from('profiles').select('default_band_id').eq('id', user.id).maybeSingle()
  const current = prof?.default_band_id || null

  // Toggle off if they pinned the one already set (or sent nothing).
  if (!bandId || bandId === current) {
    await admin.from('profiles').update({ default_band_id: null }).eq('id', user.id)
    return NextResponse.json({ ok: true, default_band_id: null })
  }

  // Must be a band they hold or own.
  const [{ data: held }, { data: owned }] = await Promise.all([
    admin.from('registrations').select('band_id').eq('user_id', user.id).eq('band_id', bandId).limit(1).maybeSingle(),
    admin.from('bands').select('band_id').eq('owner_id', user.id).eq('band_id', bandId).limit(1).maybeSingle(),
  ])
  if (!held?.band_id && !owned?.band_id) {
    return NextResponse.json({ error: "That isn't one of your bands." }, { status: 403 })
  }

  await admin.from('profiles').update({ default_band_id: bandId }).eq('id', user.id)
  return NextResponse.json({ ok: true, default_band_id: bandId })
}
