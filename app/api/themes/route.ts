import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public: returns admin-created / overridden themes as a map keyed by theme key.
// The client (lib/themes.ts loadThemes) merges these over the built-in themes,
// so this only needs to return what lives in the DB. Returns an empty map if the
// table doesn't exist yet or anything fails — built-ins still cover everything.
export async function GET() {
  try {
    const admin = createServiceClient()
    const { data, error } = await admin
      .from('band_themes')
      .select('key, label, data')
      .order('sort_order', { ascending: true })

    if (error || !data) return NextResponse.json({ themes: {} })

    const themes: Record<string, any> = {}
    for (const row of data) {
      themes[row.key] = { label: row.label, ...(row.data || {}) }
    }
    return NextResponse.json({ themes })
  } catch {
    return NextResponse.json({ themes: {} })
  }
}
