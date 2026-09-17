import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { bandLabel, themeLabelMap } from '@/lib/band-label'

// Every band the signed-in person can switch between: ones they own, plus ones
// they currently hold (latest registrant). Someone matching bands to outfits
// carries several at once, so the band view needs a way to move between them
// without detouring through /dashboard.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ bands: [] })

  const admin = createServiceClient()

  const [owned, registered, credited] = await Promise.all([
    admin.from('bands').select('band_id, theme, color, created_at').eq('owner_id', user.id),
    admin.from('registrations').select('band_id, registered_at').eq('user_id', user.id).order('registered_at', { ascending: false }),
    // Bands credited to this person as the giver that nobody owns: a purchase
    // (the buyer is upline, never owner, so the recipient can claim it), or a
    // pile an admin handed them.
    admin.from('bands').select('band_id').eq('upline_user_id', user.id).is('owner_id', null),
  ])

  // Of the credited bands, only the untaken ones are still theirs to give.
  // One that already carries a stop has been handed on; it is not in their
  // drawer any more, and listing it made a giver's whole history look like
  // stock.
  const creditedIds = (credited.data ?? []).map(b => b.band_id as string)
  let untaken: string[] = []
  if (creditedIds.length) {
    const { data: stops } = await admin.from('registrations').select('band_id').in('band_id', creditedIds).neq('source', 'wall')
    const taken = new Set((stops ?? []).map(r => r.band_id as string))
    untaken = creditedIds.filter(id => !taken.has(id))
  }

  const ids = new Set<string>()
  const ordered: string[] = []
  // Most recently registered first — that is the band they most likely have on.
  for (const r of registered.data ?? []) {
    if (r.band_id && !ids.has(r.band_id)) { ids.add(r.band_id); ordered.push(r.band_id) }
  }
  for (const b of owned.data ?? []) {
    if (b.band_id && !ids.has(b.band_id)) { ids.add(b.band_id); ordered.push(b.band_id) }
  }
  for (const id of untaken) {
    if (!ids.has(id)) { ids.add(id); ordered.push(id) }
  }
  // "To give away": a band you own but have never put your own name on, or
  // one credited to you that nobody has taken yet — a bulk order still in
  // the box, a pile handed to you. A credited band that already has a stop
  // is not that: it has been given, and it is not yours any more.
  const mine = new Set((registered.data ?? []).map(r => r.band_id as string))
  const giving = new Set([
    ...(owned.data ?? []).map(b => b.band_id as string).filter(id => !mine.has(id)),
    ...untaken,
  ])

  // Bands they hold but do not own are not in `owned`, so fetch styling for
  // everything in the list — otherwise a held band shows as a bare code.
  const { data: styleRows } = ordered.length
    ? await admin.from('bands').select('band_id, theme, color, size').in('band_id', ordered)
    : { data: [] }

  // Built-in theme names live in code; only overridden or custom themes reach
  // band_themes. Merge both, or a stock theme reads as its raw key.
  const { data: themeRows } = await admin.from('band_themes').select('key, label')
  const themeLabels = themeLabelMap(themeRows as { key: string; label: string }[] | null)

  const { data: prof } = await admin.from('profiles').select('default_band_id').eq('id', user.id).maybeSingle()

  const meta = new Map((styleRows ?? []).map(b => [b.band_id as string, b]))
  const bands = ordered.map(id => {
    const b = meta.get(id)
    // Name every band by something human. A themed band carries no colour and
    // a plain band carries no distinctive theme, so whichever exists is the
    // identifying feature — previously only colour was used, which left themed
    // bands showing nothing at all.
    const label = b ? bandLabel(b, themeLabels) : null
    return {
      band_id: id,
      theme: b?.theme ?? null,
      color: b?.color ?? null,
      size: b?.size ?? null,
      label,
      giving: giving.has(id),
    }
  })

  return NextResponse.json({ bands, default_band_id: prof?.default_band_id ?? null })
}
