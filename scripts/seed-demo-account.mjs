// Create a self-contained demo account and populate the full Prayers experience
// so the whole thing can be shown without touching a personal account:
//   • Partners: Direct + Lineage + a pending request to accept
//   • Requests: My (incl. an answered one) / Others' with audience targeting
//   • Circles: a circle with an open request
//   • Journeys: two bands, each travelling through multiple cities (map shows many)
//   • Journal: an active + an answered entry on the band home
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
const BAND2 = 'PB-TESTB'

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
    await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { full_name } })
    console.log(`  user exists: ${email}`)
    return existing
  }
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })
  if (error) throw error
  console.log(`  created user: ${email}`)
  return data.user
}

async function upsertProfile(id, email, full_name) {
  const { error } = await sb.from('profiles').upsert({ id, email, full_name }, { onConflict: 'id' })
  if (error) throw error
}

async function upsertBand(band_id, owner_id) {
  const { error } = await sb.from('bands').upsert({
    band_id, status: 'registered', theme: 'default', color: null,
    nfc_url: `https://prayerbands.com/r/${band_id}`,
    outside_text: 'PrayerBands.com ✝', inside_text: band_id, owner_id,
  }, { onConflict: 'band_id' })
  if (error) throw error
}

async function reseedRegistrations(band_id, rows) {
  await sb.from('registrations').delete().eq('band_id', band_id)
  const { error } = await sb.from('registrations').insert(rows.map(r => ({ band_id, ...r })))
  if (error) throw error
}

async function main() {
  console.log('Demo accounts:')
  const test = await ensureUser('test@test.com', 'Test123!', 'Test User')
  const grace = await ensureUser('grace.demo@prayerbands.test', 'Demo123!pass', 'Grace Lee')
  const samuel = await ensureUser('samuel.demo@prayerbands.test', 'Demo123!pass', 'Samuel Otu')
  const elijah = await ensureUser('elijah.demo@prayerbands.test', 'Demo123!pass', 'Elijah Brooks')
  const naomi = await ensureUser('naomi.demo@prayerbands.test', 'Demo123!pass', 'Naomi Reed')
  await upsertProfile(test.id, 'test@test.com', 'Test User')
  await upsertProfile(grace.id, 'grace.demo@prayerbands.test', 'Grace Lee')
  await upsertProfile(samuel.id, 'samuel.demo@prayerbands.test', 'Samuel Otu')
  await upsertProfile(elijah.id, 'elijah.demo@prayerbands.test', 'Elijah Brooks')
  await upsertProfile(naomi.id, 'naomi.demo@prayerbands.test', 'Naomi Reed')

  // ── Band 1 (PB-TEST): Dallas → Phoenix → Denver → Nashville ────────────────
  // Account-holders Grace (first) and Test User (last) form the lineage; the two
  // middle holders are accountless travellers that enrich the map.
  await upsertBand(BAND, test.id)
  await reseedRegistrations(BAND, [
    { user_id: grace.id, user_name: 'Grace Lee', city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.797, prayer: 'Passing this on with love — carry it well.', registered_at: '2026-06-18T15:00:00Z' },
    { user_id: null, user_name: 'Miguel Santos', city: 'Phoenix', state: 'AZ', country: 'USA', latitude: 33.4484, longitude: -112.074, prayer: 'Prayed for my family this morning.', registered_at: '2026-06-23T15:00:00Z' },
    { user_id: null, user_name: 'Aria Bennett', city: 'Denver', state: 'CO', country: 'USA', latitude: 39.7392, longitude: -104.9903, prayer: 'A good reminder to slow down and pray.', registered_at: '2026-06-27T15:00:00Z' },
    { user_id: test.id, user_name: 'Test User', city: 'Nashville', state: 'TN', country: 'USA', latitude: 36.1627, longitude: -86.7816, prayer: 'Honored to carry this band forward.', registered_at: '2026-07-02T15:00:00Z' },
  ])

  // ── Band 2 (PB-TESTB): Seattle → Portland → Austin ─────────────────────────
  // Lineage parent here is Elijah, giving Test User a second lineage partner.
  await upsertBand(BAND2, test.id)
  await reseedRegistrations(BAND2, [
    { user_id: elijah.id, user_name: 'Elijah Brooks', city: 'Seattle', state: 'WA', country: 'USA', latitude: 47.6062, longitude: -122.3321, prayer: 'May this travel far and wide.', registered_at: '2026-06-14T15:00:00Z' },
    { user_id: null, user_name: 'Hannah Cole', city: 'Portland', state: 'OR', country: 'USA', latitude: 45.5152, longitude: -122.6784, prayer: 'Prayed for peace over my city.', registered_at: '2026-06-21T15:00:00Z' },
    { user_id: test.id, user_name: 'Test User', city: 'Austin', state: 'TX', country: 'USA', latitude: 30.2672, longitude: -97.7431, prayer: 'A second band, a second blessing.', registered_at: '2026-07-01T15:00:00Z' },
  ])
  console.log(`Bands: ${BAND} (4 cities, lineage Grace) + ${BAND2} (3 cities, lineage Elijah)`)

  // ── Connections: Samuel (accepted, Direct) + Naomi (pending, to accept) ────
  const pairFilter = (a, b) => `and(requester_id.eq.${a},recipient_id.eq.${b}),and(requester_id.eq.${b},recipient_id.eq.${a})`
  await sb.from('prayer_network_connections').delete().or(pairFilter(samuel.id, test.id))
  await sb.from('prayer_network_connections').delete().or(pairFilter(naomi.id, test.id))
  const { error: connErr } = await sb.from('prayer_network_connections').insert([
    { requester_id: samuel.id, recipient_id: test.id, band_id: BAND, status: 'accepted' },
    { requester_id: naomi.id, recipient_id: test.id, band_id: BAND, status: 'pending' },
  ])
  if (connErr) throw connErr
  console.log('Connections: Samuel (Direct, accepted) + Naomi (pending — accept demo)')

  // ── Network requests + pray counts ─────────────────────────────────────────
  await sb.from('prayer_network_intercessions').delete().in('user_id', [grace.id, samuel.id, elijah.id, naomi.id, test.id])
  await sb.from('prayer_network_requests').delete().in('user_id', [grace.id, samuel.id, elijah.id, test.id])
  const { data: reqs, error: reqErr } = await sb.from('prayer_network_requests').insert([
    { user_id: samuel.id, request_text: 'Please pray for my job interview on Monday morning.', visibility: 'private', audience: 'network' },
    { user_id: grace.id, request_text: 'Pray for our family as we settle into our new home.', visibility: 'private', audience: 'lineage' },
    { user_id: elijah.id, request_text: 'Please pray for my daughter’s university exams this week.', visibility: 'private', audience: 'lineage' },
    { user_id: test.id, request_text: 'Praying for wisdom on a big decision this week.', visibility: 'private', audience: 'network' },
    { user_id: test.id, request_text: 'Thank you all — my job search ended with a wonderful offer!', visibility: 'private', audience: 'network', is_answered: true, answered_at: '2026-07-05T12:00:00Z' },
  ]).select('id, user_id, is_answered')
  if (reqErr) throw reqErr
  const samuelReq = reqs.find(r => r.user_id === samuel.id)
  const graceReq = reqs.find(r => r.user_id === grace.id)
  // A few people already praying, so counts aren't all zero.
  const inter = []
  if (samuelReq) [grace.id, elijah.id, naomi.id].forEach(uid => inter.push({ request_id: samuelReq.id, user_id: uid }))
  if (graceReq) inter.push({ request_id: graceReq.id, user_id: elijah.id })
  if (inter.length) { const { error } = await sb.from('prayer_network_intercessions').insert(inter); if (error) throw error }
  console.log('Requests: Samuel (Direct), Grace + Elijah (Lineage), Test (active + answered)')

  // ── Circle with an open request ────────────────────────────────────────────
  let { data: circle } = await sb.from('prayer_circles').select('id').eq('join_code', 'DEMO01').maybeSingle()
  if (!circle) {
    const { data, error } = await sb.from('prayer_circles')
      .insert({ name: 'Grace’s Prayer Circle', join_code: 'DEMO01', created_by: grace.id, is_closed: false })
      .select('id').single()
    if (error) throw error
    circle = data
  }
  await sb.from('circle_members').delete().eq('circle_id', circle.id).in('user_id', [grace.id, test.id])
  await sb.from('circle_members').insert([
    { circle_id: circle.id, user_id: grace.id, role: 'leader' },
    { circle_id: circle.id, user_id: test.id, role: 'member' },
  ])
  await sb.from('circle_prayer_requests').delete().eq('circle_id', circle.id).eq('user_id', grace.id)
  await sb.from('circle_prayer_requests').insert({ circle_id: circle.id, user_id: grace.id, request_text: 'Praying for my mother’s health this week.', is_answered: false })
  console.log('Circle: Grace’s Prayer Circle (join code DEMO01) with a request')

  // ── Prayer Journal on the band home (active + answered) ────────────────────
  await sb.from('prayer_requests').delete().eq('user_id', test.id).in('band_id', [BAND, BAND2])
  const { error: journalErr } = await sb.from('prayer_requests').insert([
    { user_id: test.id, band_id: BAND, title: 'Wisdom for a big decision', body: 'Seeking clarity on a possible job change.', status: 'active', visibility: 'network' },
    { user_id: test.id, band_id: BAND, title: 'Healing for a dear friend', body: 'My friend has been in the hospital.', status: 'answered', answered_testimony: 'She recovered fully — praise God!', answered_at: '2026-07-06T12:00:00Z', visibility: 'network' },
  ])
  if (journalErr) throw journalErr
  console.log('Journal: 1 active + 1 answered entry on PB-TEST')

  // ── Clean the older [demo seed] rows off the personal account ──────────────
  const A = '379576ca-8931-4add-ad3a-dc962750068c' // David Shipps
  const C = 'e382ee48-79b8-455e-8846-b0fa972fb941' // David W
  const D = 'd85dbbed-9d02-4f50-bc22-29244aa9f047' // David Whit
  const JACKSON = 'a4299587-f641-4f81-9cc0-40736c2246d3'
  await sb.from('registrations').delete().eq('band_id', 'PB-TEST2').like('prayer', '[demo seed]%')
  await sb.from('prayer_network_requests').delete().like('request_text', '[demo seed]%')
  await sb.from('circle_prayer_requests').delete().like('request_text', '[demo seed]%')
  await sb.from('prayer_network_connections').delete().or(pairFilter(C, A))
  await sb.from('circle_members').delete().eq('circle_id', JACKSON).eq('user_id', D)
  console.log('Cleaned older [demo seed] rows off the personal account')

  console.log('\n✅ Done. Sign in at /signin with test@test.com / Test123!')
  console.log('   Bands: /band/PB-TEST  and  /band/PB-TESTB')
}

main().catch(e => { console.error(e); process.exit(1) })
