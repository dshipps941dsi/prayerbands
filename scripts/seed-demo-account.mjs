// Create a self-contained demo account and populate the Prayers experience
// (Partners: Direct + Lineage · Requests: My/Others with audience targeting ·
// Circles) so the whole thing can be shown without touching a personal account.
//
//   node scripts/seed-demo-account.mjs
//
// Idempotent: safe to re-run. Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY
// from .env.local.
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
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const BAND = 'PB-TEST'

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 200) break
  }
  return null
}

async function ensureUser(email, password, full_name) {
  const existing = await findUserByEmail(email)
  if (existing) {
    // Keep the password in sync so the demo login always works.
    await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { full_name } })
    console.log(`  user exists: ${email} (${existing.id})`)
    return existing
  }
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
  if (error) throw error
  console.log(`  created user: ${email} (${data.user.id})`)
  return data.user
}

async function upsertProfile(id, email, full_name) {
  const { error } = await sb.from('profiles').upsert({ id, email, full_name }, { onConflict: 'id' })
  if (error) throw error
}

async function main() {
  console.log('Demo accounts:')
  const test = await ensureUser('test@test.com', 'Test123!', 'Test User')
  const grace = await ensureUser('grace.demo@prayerbands.test', 'Demo123!pass', 'Grace Lee')
  const samuel = await ensureUser('samuel.demo@prayerbands.test', 'Demo123!pass', 'Samuel Otu')
  await upsertProfile(test.id, 'test@test.com', 'Test User')
  await upsertProfile(grace.id, 'grace.demo@prayerbands.test', 'Grace Lee')
  await upsertProfile(samuel.id, 'samuel.demo@prayerbands.test', 'Samuel Otu')

  // ── Band PB-TEST, registered to the demo user ──────────────────────────────
  const { error: bandErr } = await sb.from('bands').upsert({
    band_id: BAND, status: 'registered', theme: 'default', color: null,
    nfc_url: `https://prayerbands.com/r/${BAND}`,
    outside_text: 'PrayerBands.com ✝', inside_text: BAND, owner_id: test.id,
  }, { onConflict: 'band_id' })
  if (bandErr) throw bandErr

  // Lineage: Grace held PB-TEST first, then handed it to Test User.
  await sb.from('registrations').delete().eq('band_id', BAND)
  const { error: regErr } = await sb.from('registrations').insert([
    { band_id: BAND, user_id: grace.id, user_name: 'Grace Lee', prayer: 'Passing this on with love.', registered_at: '2026-06-20T15:00:00Z' },
    { band_id: BAND, user_id: test.id, user_name: 'Test User', prayer: 'Grateful to carry this band.', registered_at: '2026-07-01T15:00:00Z' },
  ])
  if (regErr) throw regErr
  console.log(`Band ${BAND}: Grace Lee → Test User (lineage)`)

  // ── Direct partner: accepted connection Test User <-> Samuel ───────────────
  await sb.from('prayer_network_connections').delete()
    .or(`and(requester_id.eq.${samuel.id},recipient_id.eq.${test.id}),and(requester_id.eq.${test.id},recipient_id.eq.${samuel.id})`)
  const { error: connErr } = await sb.from('prayer_network_connections').insert({
    requester_id: samuel.id, recipient_id: test.id, band_id: BAND, status: 'accepted',
  })
  if (connErr) throw connErr
  console.log('Direct partner: Samuel Otu (accepted connection)')

  // ── Network requests (audience targeting) ──────────────────────────────────
  await sb.from('prayer_network_requests').delete().in('user_id', [grace.id, samuel.id])
  const { error: reqErr } = await sb.from('prayer_network_requests').insert([
    // Samuel is a direct connection → 'network' reaches Test User (Direct badge).
    { user_id: samuel.id, request_text: 'Please pray for my job interview on Monday morning.', visibility: 'private', audience: 'network' },
    // Grace is lineage → a 'lineage'-targeted request reaches Test User (Lineage badge).
    { user_id: grace.id, request_text: 'Pray for our family as we settle into our new home.', visibility: 'private', audience: 'lineage' },
  ])
  if (reqErr) throw reqErr
  console.log('Requests: Samuel (Direct) + Grace (Lineage)')

  // ── Circle with an "others" request ────────────────────────────────────────
  let { data: circle } = await sb.from('prayer_circles').select('id').eq('join_code', 'DEMO01').maybeSingle()
  if (!circle) {
    const { data, error } = await sb.from('prayer_circles')
      .insert({ name: 'Grace’s Prayer Circle', join_code: 'DEMO01', created_by: grace.id, is_closed: false })
      .select('id').single()
    if (error) throw error
    circle = data
  }
  // Members: Grace (leader) + Test User (member).
  await sb.from('circle_members').delete().eq('circle_id', circle.id).in('user_id', [grace.id, test.id])
  await sb.from('circle_members').insert([
    { circle_id: circle.id, user_id: grace.id, role: 'leader' },
    { circle_id: circle.id, user_id: test.id, role: 'member' },
  ])
  await sb.from('circle_prayer_requests').delete().eq('circle_id', circle.id).eq('user_id', grace.id)
  await sb.from('circle_prayer_requests').insert({
    circle_id: circle.id, user_id: grace.id, request_text: 'Praying for my mother’s health this week.', is_answered: false,
  })
  console.log('Circle: Grace’s Prayer Circle (join code DEMO01) with a request')

  // ── Clean the earlier demo rows off the personal account ───────────────────
  const A = '379576ca-8931-4add-ad3a-dc962750068c' // David Shipps (personal)
  const C = 'e382ee48-79b8-455e-8846-b0fa972fb941' // David W (personal)
  const D = 'd85dbbed-9d02-4f50-bc22-29244aa9f047' // David Whit (personal)
  const JACKSON = 'a4299587-f641-4f81-9cc0-40736c2246d3'
  await sb.from('registrations').delete().eq('band_id', 'PB-TEST2').like('prayer', '[demo seed]%')
  await sb.from('prayer_network_requests').delete().like('request_text', '[demo seed]%')
  await sb.from('circle_prayer_requests').delete().like('request_text', '[demo seed]%')
  await sb.from('prayer_network_connections').delete()
    .or(`and(requester_id.eq.${C},recipient_id.eq.${A}),and(requester_id.eq.${A},recipient_id.eq.${C})`)
  await sb.from('circle_members').delete().eq('circle_id', JACKSON).eq('user_id', D)
  console.log('Cleaned earlier [demo seed] rows off the personal account')

  console.log('\n✅ Done. Sign in at /signin with test@test.com / Test123!, then open /band/PB-TEST')
}

main().catch(e => { console.error(e); process.exit(1) })
