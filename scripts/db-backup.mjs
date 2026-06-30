// One-shot logical snapshot of the Supabase tables we touch in the flow-audit
// remediation. Dumps each table to db/backups/<timestamp>/<table>.json using the
// service key (bypasses RLS so we capture everything). Pure insurance — the
// security fixes are non-destructive, but this gives an exact record of the data
// as it stood before we started.
//
//   node scripts/db-backup.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY from .env.local.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Minimal .env.local loader (avoid adding a dependency).
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

const supabase = createClient(url, key)

const TABLES = [
  'bands', 'registrations', 'profiles', 'orders',
  'prayer_circles', 'circle_members', 'circle_prayer_requests', 'circle_intercessions',
  'prayer_network_connections', 'band_transfers', 'org_invites',
  // Orphaned tables being dropped in the 2026-06-30 cleanup — capture first.
  'followers', 'lineage_tree', 'prayer_intercessions',
]

const stamp = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dir = join('db', 'backups', stamp)
mkdirSync(dir, { recursive: true })

let total = 0
for (const t of TABLES) {
  const { data, error } = await supabase.from(t).select('*')
  if (error) { console.log(`  skip ${t}: ${error.message}`); continue }
  writeFileSync(join(dir, `${t}.json`), JSON.stringify(data, null, 2))
  total += data.length
  console.log(`  ${t}: ${data.length} rows`)
}
console.log(`\nSnapshot written to ${dir} (${total} rows total)`)
