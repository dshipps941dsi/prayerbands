import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { bandLabel, themeLabelMap } from '@/lib/band-label'
import { bandStanding, type StandingStop } from '@/lib/band-standing'
import { likeLiteral } from '@/lib/like'

// Every band the signed-in person can switch between: ones they own, plus ones
// they currently hold (latest registrant). Someone matching bands to outfits
// carries several at once, so the band view needs a way to move between them
// without detouring through /dashboard.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ bands: [] })

  const admin = createServiceClient()

  // Every band this person might have standing in: ones attached to their
  // account, ones they have registered, and ones credited to them as the
  // giver. Which of those actually belong in the list is decided per band by
  // the one rule (lib/band-standing) — the same rule the band page applies.
  const email = user.email || ''
  const [owned, registered, credited, byEmail, myOrders] = await Promise.all([
    admin.from('bands').select('band_id').eq('owner_id', user.id),
    admin.from('registrations').select('band_id, registered_at').eq('user_id', user.id).order('registered_at', { ascending: false }),
    admin.from('bands').select('band_id').eq('upline_user_id', user.id).is('owner_id', null),
    // Credited by email before this account existed (an order placed as a
    // guest, then a sign-up under the same address).
    email ? admin.from('bands').select('band_id').ilike('upline_email', likeLiteral(email)).is('upline_user_id', null).is('owner_id', null) : Promise.resolve({ data: [] as any[] }),
    email ? admin.from('orders').select('assigned_band_ids').ilike('customer_email', likeLiteral(email)).in('status', ['processing', 'shipped']) : Promise.resolve({ data: [] as any[] }),
  ])
  const ids = new Set<string>()
  const candidates: string[] = []
  // Most recently registered first — that is the band they most likely have on.
  for (const r of registered.data ?? []) if (r.band_id && !ids.has(r.band_id)) { ids.add(r.band_id); candidates.push(r.band_id) }
  for (const b of owned.data ?? []) if (b.band_id && !ids.has(b.band_id)) { ids.add(b.band_id); candidates.push(b.band_id) }
  for (const b of credited.data ?? []) if (b.band_id && !ids.has(b.band_id)) { ids.add(b.band_id); candidates.push(b.band_id) }
  const viaEmail = new Set<string>((byEmail.data ?? []).map((b: any) => b.band_id as string))
  for (const o of (myOrders.data ?? []) as any[]) for (const id of (o.assigned_band_ids || []) as string[]) viaEmail.add(id)
  for (const id of viaEmail) if (!ids.has(id)) { ids.add(id); candidates.push(id) }

  const [{ data: styleRows }, { data: stopRows }] = candidates.length
    ? await Promise.all([
        admin.from('bands').select('band_id, owner_id, upline_user_id, status, theme, color, size, dedication_recipient').in('band_id', candidates),
        admin.from('registrations').select('band_id, user_id, registered_by, user_name, registered_at, source').in('band_id', candidates),
      ])
    : [{ data: [] }, { data: [] }]
  const stopsByBand = new Map<string, StandingStop[]>()
  for (const s of (stopRows ?? []) as any[]) {
    if (!stopsByBand.has(s.band_id)) stopsByBand.set(s.band_id, [])
    stopsByBand.get(s.band_id)!.push(s)
  }
  const rowById = new Map(((styleRows ?? []) as any[]).map(b => [b.band_id as string, b]))
  const standings = new Map(candidates.map(id => {
    const b = rowById.get(id)
    return [id, b ? bandStanding({ band: { band_id: id, owner_id: b.owner_id ?? null, upline_user_id: b.upline_user_id ?? null, status: b.status ?? null }, stops: stopsByBand.get(id) ?? [], viewerId: user.id, orderedByViewer: viaEmail.has(id) }) : null]
  }))
  // In the list: bands they hold, own, or have in the drawer to give. A band
  // credited to them that someone else has taken is not theirs any more.
  const ordered = candidates.filter(id => {
    const st = standings.get(id)
    return !!st && (st.role === 'holder' || st.role === 'owner' || st.role === 'giver_stock' || (st.role === 'giver_given' && rowById.get(id)?.owner_id === user.id) || st.role === 'helper' && rowById.get(id)?.owner_id === user.id)
  })
  const giving = new Set(ordered.filter(id => standings.get(id)?.giving))

  // Built-in theme names live in code; only overridden or custom themes reach
  // band_themes. Merge both, or a stock theme reads as its raw key.
  const { data: themeRows } = await admin.from('band_themes').select('key, label')
  const themeLabels = themeLabelMap(themeRows as { key: string; label: string }[] | null)

  const { data: prof } = await admin.from('profiles').select('default_band_id').eq('id', user.id).maybeSingle()

  const bands = ordered.map(id => {
    const b = rowById.get(id)
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
      // A gift already addressed to someone: "for Sarah", not "to give away".
      for_name: giving.has(id) ? (b?.dedication_recipient ?? null) : null,
    }
  })

  return NextResponse.json({ bands, default_band_id: prof?.default_band_id ?? null })
}
