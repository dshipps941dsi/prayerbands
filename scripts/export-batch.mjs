// Rebuild a supplier CSV for a past production batch straight from the database.
// The generator (admin → Generate IDs) only downloads the CSV to the browser and
// keeps nothing server-side, but every band is seeded with its `batch` tag — so
// any batch's file can be regenerated identically, on demand.
//
//   node scripts/export-batch.mjs <batch> [outPath]
//   node scripts/export-batch.mjs PB-BATCH-2026-06-16
//
// Columns match the generator exactly:
//   sequence,band_id,theme,color,size,nfc_url,outside_text,inside_text
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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

const batch = process.argv[2]
if (!batch) { console.error('Usage: node scripts/export-batch.mjs <batch> [outPath]'); process.exit(1) }

const supabase = createClient(url, key)

function csvField(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Page past the 1000-row cap so large batches export in full.
const bands = []
const PAGE = 1000
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from('bands')
    .select('band_id, theme, color, size, nfc_url, outside_text, inside_text, created_at')
    .eq('batch', batch)
    .order('created_at', { ascending: true })
    .order('band_id', { ascending: true })
    .range(from, from + PAGE - 1)
  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) break
  bands.push(...data)
  if (data.length < PAGE) break
}

if (!bands.length) { console.error(`No bands found for batch "${batch}".`); process.exit(1) }

const header = ['sequence', 'band_id', 'theme', 'color', 'size', 'nfc_url', 'outside_text', 'inside_text']
const lines = [header.join(',')]
bands.forEach((b, i) => {
  lines.push([i + 1, csvField(b.band_id), csvField(b.theme), csvField(b.color || ''), csvField(b.size || ''), csvField(b.nfc_url), csvField(b.outside_text), csvField(b.inside_text)].join(','))
})

const outPath = process.argv[3] || join('db', 'exports', `${batch}_${bands.length}-bands.csv`)
mkdirSync(join('db', 'exports'), { recursive: true })
writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log(`Wrote ${bands.length} bands to ${outPath}`)
