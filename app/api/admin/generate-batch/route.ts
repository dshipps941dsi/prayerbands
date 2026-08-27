import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'
// Confusable-free alphabet (no 0/O/1/I) so printed IDs are easy to read/type.
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_TOTAL = 2000

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

function genId(existing: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let id = 'PB-'
    for (let i = 0; i < 5; i++) id += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
    if (!existing.has(id)) { existing.add(id); return id }
  }
  throw new Error('Could not generate a unique ID — try a smaller batch.')
}

// Generate a production batch of unowned (general-inventory) band IDs across
// one or more themes, seed them into Supabase, and return the rows so the admin
// can download a single supplier CSV.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const SIZES = new Set(['S', 'M', 'L'])
  // Each item is a theme (e.g. 'baseball') OR a solid color (e.g. 'Black'), for a
  // given size (S/M/L, optional). One design split across sizes arrives as
  // several items sharing a theme/color but differing in size.
  const clean = (Array.isArray(body.items) ? body.items : [])
    .map((it: any) => {
      const size = String(it.size || '').trim().toUpperCase()
      return {
        theme: String(it.theme || '').trim(),
        color: String(it.color || '').trim(),
        size: SIZES.has(size) ? size : '',
        quantity: Math.max(0, Math.round(Number(it.quantity) || 0)),
      }
    })
    .filter((it: { theme: string; color: string; size: string; quantity: number }) => (it.theme || it.color) && it.quantity > 0)

  if (!clean.length) return NextResponse.json({ error: 'Add at least one theme or color with a quantity.' }, { status: 400 })
  const total = clean.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0)
  if (total > MAX_TOTAL) return NextResponse.json({ error: `Total ${total} exceeds the ${MAX_TOTAL}-per-batch limit.` }, { status: 400 })

  const admin = createServiceClient()

  // Build the full set of existing band IDs (paginated past the 1000-row cap) so
  // generated IDs never collide with what's already in the system.
  const existing = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from('bands').select('band_id').range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    for (const b of data) existing.add(b.band_id)
    if (data.length < PAGE) break
  }

  // Unique per run: date + a short time-based suffix so two batches generated on
  // the same day never collapse into one tag (each stays separately re-downloadable).
  const now = new Date()
  const suffix = now.toISOString().slice(11, 19).replace(/:/g, '') // HHMMSS (UTC)
  const batch = `PB-BATCH-${now.toISOString().slice(0, 10)}-${suffix}`
  const rows: any[] = []
  for (const it of clean) {
    for (let i = 0; i < it.quantity; i++) {
      const id = genId(existing)
      rows.push({
        band_id: id,
        // Solid-color rows are the classic ('default') design in a physical color.
        theme: it.theme || 'default',
        color: it.color || null,
        size: it.size || null,
        status: 'unregistered',
        nfc_url: `https://prayerbands.com/r/${id}`,
        outside_text: 'PrayerBands.com ✝',
        inside_text: id,
        batch,
      })
    }
  }

  // Insert in chunks to stay well within request limits.
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await admin.from('bands').insert(rows.slice(i, i + CHUNK))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    batch,
    total: rows.length,
    bands: rows.map(r => ({ band_id: r.band_id, theme: r.theme, color: r.color || '', size: r.size || '', nfc_url: r.nfc_url, outside_text: r.outside_text, inside_text: r.inside_text })),
  })
}
