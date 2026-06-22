import type { SupabaseClient } from '@supabase/supabase-js'

export type VerseWalk = { total: number; run: number; returning: boolean }
type Raw = { total: number; run: number; last_seen: string | null }

const WELCOME_BACK_DAYS = 3 // gap after which the greeting says "Welcome back"
const localKey = (bandId: string) => `pbVerse_${bandId}`

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

function advance(prev: Raw, t: string) {
  if (prev.last_seen === t) return { row: prev, returning: false, changed: false }
  const gap = prev.last_seen ? dayDiff(prev.last_seen, t) : null
  const run = gap === 1 ? prev.run + 1 : 1 // consecutive → +1; else gentle reset
  const total = prev.total + 1 // never decreases
  return { row: { total, run, last_seen: t } as Raw, returning: gap !== null && gap >= WELCOME_BACK_DAYS, changed: true }
}

function readLocal(bandId: string): Raw {
  try {
    const s = JSON.parse(localStorage.getItem(localKey(bandId)) || '{}')
    return { total: s.total ?? 0, run: s.run ?? 0, last_seen: s.last_seen ?? null }
  } catch {
    return { total: 0, run: 0, last_seen: null }
  }
}

// Call once when the Home tab / verse is shown.
export async function recordVerseView(opts: {
  bandId: string
  userId?: string | null
  supabase?: SupabaseClient | null
}): Promise<VerseWalk> {
  if (typeof window === 'undefined') return { total: 0, run: 0, returning: false }
  const t = today()

  // accountless → localStorage only
  if (!opts.userId || !opts.supabase) {
    const { row, returning, changed } = advance(readLocal(opts.bandId), t)
    if (changed) { try { localStorage.setItem(localKey(opts.bandId), JSON.stringify(row)) } catch {} }
    return { total: row.total, run: row.run, returning }
  }

  // signed-in → Supabase, cross-device
  const { supabase, userId, bandId } = opts
  const { data } = await supabase.from('verse_walks')
    .select('total, run, last_seen').eq('user_id', userId).maybeSingle()
  let base: Raw = data
    ? { total: data.total ?? 0, run: data.run ?? 0, last_seen: data.last_seen ?? null }
    : { total: 0, run: 0, last_seen: null }

  // one-time merge of a walk earned while logged out — keep the higher values
  const local = readLocal(bandId)
  const merged = local.total > base.total || local.run > base.run
  if (merged) base = {
    total: Math.max(base.total, local.total),
    run: Math.max(base.run, local.run),
    last_seen: [base.last_seen, local.last_seen].filter(Boolean).sort().pop() ?? null,
  }

  const { row, returning, changed } = advance(base, t)
  if (changed || merged) {
    await supabase.from('verse_walks').upsert({
      user_id: userId, total: row.total, run: row.run,
      last_seen: row.last_seen, updated_at: new Date().toISOString(),
    })
  }
  try { localStorage.removeItem(localKey(bandId)) } catch {} // safely in the DB now
  return { total: row.total, run: row.run, returning }
}
