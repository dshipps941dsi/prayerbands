// Set the size (S/M/L) on inventory bands from a supplier CSV. Reads the
// `band_id` and `size` columns (the same columns the batch generator exports)
// and updates bands.size in the DB, grouped by size for efficiency.
//
//   node scripts/import-band-sizes.mjs <path-to.csv>
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1) }

const path = process.argv[2]
if (!path) { console.error('Usage: node scripts/import-band-sizes.mjs <path-to.csv>'); process.exit(1) }

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const rows = readFileSync(path, 'utf8').split(/\r?\n/).filter(l => l.trim())
const header = rows[0].split(',').map(h => h.trim().toLowerCase())
const bandIdx = header.indexOf('band_id')
const sizeIdx = header.indexOf('size')
if (bandIdx < 0 || sizeIdx < 0) { console.error('CSV must have band_id and size columns'); process.exit(1) }

const bySize = { S: [], M: [], L: [] }
const invalid = []
for (const line of rows.slice(1)) {
  const cols = line.split(',')
  const band_id = (cols[bandIdx] || '').trim().toUpperCase()
  const size = (cols[sizeIdx] || '').trim().toUpperCase()
  if (!band_id) continue
  if (!['S', 'M', 'L'].includes(size)) { invalid.push({ band_id, size }); continue }
  bySize[size].push(band_id)
}

let updated = 0
const notFound = []
for (const size of ['S', 'M', 'L']) {
  const ids = bySize[size]
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    const { data, error } = await sb.from('bands').update({ size }).in('band_id', chunk).select('band_id')
    if (error) { console.error(error.message); process.exit(1) }
    updated += (data ?? []).length
    const found = new Set((data ?? []).map(b => b.band_id))
    chunk.forEach(id => { if (!found.has(id)) notFound.push(id) })
  }
}

console.log(`Updated ${updated} bands — S:${bySize.S.length} M:${bySize.M.length} L:${bySize.L.length}`)
if (invalid.length) console.log(`Skipped ${invalid.length} row(s) with a blank/invalid size (need S, M, or L)`)
if (notFound.length) console.log(`Not found in DB (${notFound.length}): ${notFound.slice(0, 20).join(', ')}${notFound.length > 20 ? '…' : ''}`)
