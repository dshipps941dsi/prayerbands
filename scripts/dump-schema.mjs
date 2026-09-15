// Writes the live public schema to supabase/schema.sql so it lives in git.
//
//   npm run db:schema
//
// Calls public.schema_dump() (service role only) with the keys in .env.local.
// Run it after every migration and commit the result. The file is a rendering
// of the live database — tables, constraints, indexes, views, functions,
// triggers, RLS policies, grants — not a migration to apply blindly.
import { readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()] })
)
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env.local'); process.exit(1) }

const res = await fetch(`${url}/rest/v1/rpc/schema_dump`, {
  method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: '{}',
})
if (!res.ok) { console.error('schema_dump failed:', res.status, await res.text()); process.exit(1) }
const sql = JSON.parse(await res.text())
const out = new URL('../supabase/schema.sql', import.meta.url)
writeFileSync(out, sql.endsWith('\n') ? sql : sql + '\n')
console.log(`wrote supabase/schema.sql (${sql.length.toLocaleString()} chars, ${sql.split('\n').length.toLocaleString()} lines)`)
