import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// GET /api/admin/batches
//   → { batches: [{ batch, total, created, themes[], colors[] }] }  (summary list)
// GET /api/admin/batches?batch=PB-BATCH-2026-06-16
//   → { batch, total, bands: [{ band_id, theme, color, nfc_url, outside_text, inside_text }] }
// Lets the admin re-download the exact supplier CSV for any past production run —
// the generator keeps nothing server-side, but every band carries its `batch` tag.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const batch = req.nextUrl.searchParams.get('batch')

  // Single batch → full rows for CSV rebuild, in a stable order.
  if (batch) {
    const bands: any[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('bands')
        .select('band_id, theme, color, size, nfc_url, outside_text, inside_text, created_at')
        .eq('batch', batch)
        .order('created_at', { ascending: true })
        .order('band_id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break
      bands.push(...data)
      if (data.length < PAGE) break
    }
    if (!bands.length) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 })
    return NextResponse.json({
      batch,
      total: bands.length,
      bands: bands.map(b => ({ band_id: b.band_id, theme: b.theme, color: b.color || '', size: b.size || '', nfc_url: b.nfc_url, outside_text: b.outside_text, inside_text: b.inside_text })),
    })
  }

  // No batch → summarize every batch. Page through all tagged rows and aggregate.
  type Agg = { batch: string; total: number; created: string; themes: Set<string>; colors: Set<string>; sizes: Record<string, number> }
  const map = new Map<string, Agg>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('bands')
      .select('batch, theme, color, size, created_at')
      .not('batch', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    for (const b of data) {
      let e = map.get(b.batch)
      if (!e) { e = { batch: b.batch, total: 0, created: b.created_at, themes: new Set(), colors: new Set(), sizes: {} }; map.set(b.batch, e) }
      e.total++
      if (b.created_at && b.created_at < e.created) e.created = b.created_at
      if (b.theme) e.themes.add(b.theme)
      if (b.color) e.colors.add(b.color)
      if (b.size) e.sizes[b.size] = (e.sizes[b.size] || 0) + 1
    }
    if (data.length < PAGE) break
  }

  const batches = [...map.values()]
    .map(e => ({ batch: e.batch, total: e.total, created: e.created, themes: [...e.themes].sort(), colors: [...e.colors].sort(), sizes: e.sizes }))
    .sort((a, b) => (a.created < b.created ? 1 : -1))

  return NextResponse.json({ batches })
}
