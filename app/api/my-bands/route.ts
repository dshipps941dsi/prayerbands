import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BUILTIN_THEMES } from '@/lib/themes'

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

  // Bands they hold but do not own are not in `owned`, so fetch styling for
  // everything in the list — otherwise a held band shows as a bare code.
  const { data: styleRows } = ordered.length
    ? await admin.from('bands').select('band_id, theme, color, size').in('band_id', ordered)
    : { data: [] }

  // Built-in theme names live in code; only overridden or custom themes reach
  // band_themes. Merge both, or a stock theme reads as its raw key.
  const { data: themeRows } = await admin.from('band_themes').select('key, label')
  const themeLabels = new Map<string, string>(
    Object.entries(BUILTIN_THEMES).map(([key, t]) => [key, t.label])
  )
  for (const t of themeRows ?? []) themeLabels.set(t.key as string, t.label as string)

  const meta = new Map((styleRows ?? []).map(b => [b.band_id as string, b]))
  const bands = ordered.map(id => {
    const b = meta.get(id)
    // Name every band by something human. A themed band carries no colour and
    // a plain band carries no distinctive theme, so whichever exists is the
    // identifying feature — previously only colour was used, which left themed
    // bands showing nothing at all.
    const themeName = b?.theme && b.theme !== 'default' ? (themeLabels.get(b.theme) ?? b.theme) : null
    const label = themeName ?? b?.color ?? null
    return {
      band_id: id,
      theme: b?.theme ?? null,
      color: b?.color ?? null,
      size: b?.size ?? null,
      label,
    }
  })

  return NextResponse.json({ bands })
}
