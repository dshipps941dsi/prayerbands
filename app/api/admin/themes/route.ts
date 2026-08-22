import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BUILTIN_THEMES, BUILTIN_THEME_KEYS, mergeThemes, resolveThemeKey } from '@/lib/themes'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

const builtinKeys = new Set(BUILTIN_THEME_KEYS)

// Split a stored/edited theme object into { label, data } for the DB row.
function toRow(key: string, label: string, theme: any, sortOrder: number) {
  const data = { ...theme }
  delete data.label
  delete data.key
  delete data.builtin
  delete data.override
  delete data.sort_order
  return {
    key,
    label,
    data,
    is_builtin: builtinKeys.has(key),
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  }
}

// GET — full editable list: built-ins (with any DB override applied) + custom themes.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createServiceClient()
  const { data: rows } = await admin.from('band_themes').select('*')
  const byKey = new Map<string, any>((rows || []).map((r: any) => [r.key, r]))

  const list: any[] = []
  // Built-ins first, in code order, merged with any DB override.
  BUILTIN_THEME_KEYS.forEach((key, i) => {
    const row = byKey.get(key)
    const theme = row ? { label: row.label, ...(row.data || {}) } : (BUILTIN_THEMES as any)[key]
    list.push({ key, builtin: true, override: !!row, sort_order: row?.sort_order ?? i, ...theme })
  })
  // Custom themes (DB rows that aren't built-ins).
  for (const r of rows || []) {
    if (builtinKeys.has(r.key)) continue
    list.push({ key: r.key, builtin: false, override: false, sort_order: r.sort_order ?? 100, label: r.label, ...(r.data || {}) })
  }

  // How many bands each theme actually styles, resolved exactly the way the
  // band page resolves it. A theme keyed to nothing is the failure this table
  // kept producing quietly: "Pink" matched no band because colour bands are
  // stored as theme 'default', and "Gray" matched none because the bands are
  // engraved "Light Grey". Both saved happily and styled nothing.
  // The registry on the server holds built-ins only — loadThemes() is a client
  // call — so merge the DB themes in first or every colour band would resolve
  // back to 'default' and each custom theme would report zero.
  const dbThemes: Record<string, any> = {}
  for (const r of rows || []) dbThemes[r.key] = { label: r.label, ...(r.data || {}) }
  mergeThemes(dbThemes as any)

  const { data: bandRows } = await admin.from('bands').select('theme, color')
  const counts = new Map<string, number>()
  for (const b of bandRows || []) {
    const key = resolveThemeKey((b as any).theme, (b as any).color)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  for (const t of list) t.bands = counts.get(t.key) ?? 0

  return NextResponse.json({ themes: list })
}

// POST — create or update a theme (upsert by key).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const key = String(body.key || '').trim().toLowerCase()
  const label = String(body.label || '').trim()

  if (!key || !/^[a-z0-9-]+$/.test(key)) {
    return NextResponse.json({ error: 'Key must be lowercase letters, numbers, and hyphens only.' }, { status: 400 })
  }
  if (!label) return NextResponse.json({ error: 'Label is required.' }, { status: 400 })
  if (!body.theme || typeof body.theme !== 'object') {
    return NextResponse.json({ error: 'Theme data is required.' }, { status: 400 })
  }
  // Guard: don't let a NEW custom theme silently shadow a built-in key.
  if (!body.allowBuiltin && builtinKeys.has(key) && !body.isOverride) {
    return NextResponse.json({ error: `"${key}" is a built-in theme key. Edit the built-in instead.` }, { status: 400 })
  }

  const admin = createServiceClient()
  const row = toRow(key, label, body.theme, Math.round(Number(body.sort_order) || 100))
  const { error } = await admin.from('band_themes').upsert(row, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove a custom theme, or reset a built-in to its code default
// (deletes the override row; the built-in still exists in code).
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = (req.nextUrl.searchParams.get('key') || '').trim().toLowerCase()
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
  const admin = createServiceClient()
  const { error } = await admin.from('band_themes').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
