import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Every band the signed-in person can switch between: ones they own, plus ones
// they currently hold (latest registrant). Someone matching bands to outfits
// carries several at once, so the band view needs a way to move between them
// without detouring through /dashboard.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ bands: [] })

  const admin = createServiceClient()

  const [owned, registered] = await Promise.all([
    admin.from('bands').select('band_id, theme, color, created_at').eq('owner_id', user.id),
    admin.from('registrations').select('band_id, registered_at').eq('user_id', user.id).order('registered_at', { ascending: false }),
  ])

  const ids = new Set<string>()
  const ordered: string[] = []
  // Most recently registered first — that is the band they most likely have on.
  for (const r of registered.data ?? []) {
    if (r.band_id && !ids.has(r.band_id)) { ids.add(r.band_id); ordered.push(r.band_id) }
  }
  for (const b of owned.data ?? []) {
    if (b.band_id && !ids.has(b.band_id)) { ids.add(b.band_id); ordered.push(b.band_id) }
  }

  const meta = new Map((owned.data ?? []).map(b => [b.band_id, b]))
  const bands = ordered.map(id => ({
    band_id: id,
    theme: meta.get(id)?.theme ?? null,
    color: meta.get(id)?.color ?? null,
  }))

  return NextResponse.json({ bands })
}
