import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// "Give $2, Get $2" referral promo — surfaced as an inbox notification (not a
// banner over the daily moment). Shows while now < PROMO_END_MS; ts is fixed at
// the start so it reads as NEW once, then settles into the feed.
// When the gift message started appearing in the inbox.
const DEDICATION_INBOX_SINCE = '2026-09-15T11:30:00.000Z'
const PROMO_START = '2026-08-27T00:00:00Z'
const PROMO_END_MS = Date.parse('2026-10-27T00:00:00Z')

// Notifications are DERIVED — there's no notifications table. We assemble a
// recent feed from the events a band owner cares about: their bands being
// registered/prayed over, their orders shipping, and subscription bands
// shipping. Unread = anything newer than profiles.notifications_last_seen.

async function resolveUser() {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user
}

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

export async function GET(req: NextRequest) {
  const user = await resolveUser()
  if (!user) return NextResponse.json({ notifications: [], unread: 0 }, { status: 401 })

  const viewAs = req.nextUrl.searchParams.get('viewAs')
  const effectiveId = viewAs && user.email === ADMIN_EMAIL ? viewAs : user.id
  const admin = svc()

  // Recency window (days). Default 7; "Load more" widens it. 0 = all time.
  const days = parseInt(req.nextUrl.searchParams.get('days') || '7', 10)
  const since = new Date(days > 0 ? Date.now() - days * 86400000 : 0).toISOString()

  // Whose email do we match orders against? (self, or the viewed-as account)
  let email = user.email
  if (effectiveId !== user.id) {
    const { data: p } = await admin.from('profiles').select('email').eq('id', effectiveId).maybeSingle()
    email = p?.email || email
  }

  const items: any[] = []

  // Three waves instead of ~25 sequential round trips. Everything in a wave
  // depends only on the wave before it; the badge on every signed-in band
  // open used to wait for all of them one after another.
  const isUS = (c: unknown) => /^(us|usa|united states)$/i.test(String(c || ''))

  // ── Wave 1: everything keyed on the viewer alone ──────────────────────────
  const [
    { data: bands }, { data: giftBands }, { data: orders }, { data: subs }, { data: prs },
    { data: mems }, { data: myReqs }, { data: conns }, { data: pend }, { data: accepted }, { data: encs }, { data: anns }, { data: profile }, { data: myStops },
  ] = await Promise.all([
    admin.from('bands').select('band_id').eq('owner_id', effectiveId),
    admin.from('bands').select('band_id').eq('upline_user_id', effectiveId).neq('owner_id', effectiveId),
    email
      ? admin.from('orders').select('id, status, tracking_number, created_at').eq('customer_email', email)
          .in('status', ['processing', 'shipped']).gte('created_at', since).order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as any[] }),
    admin.from('subscriptions').select('id').eq('user_id', effectiveId),
    admin.from('prayer_requests_with_counts').select('id, title, body, total_intercessions, created_at, user_id')
      .eq('visibility', 'public').eq('status', 'active').neq('user_id', effectiveId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(6),
    admin.from('circle_members').select('circle_id').eq('user_id', effectiveId),
    admin.from('prayer_network_requests').select('id').eq('user_id', effectiveId),
    admin.from('prayer_network_connections').select('requester_id, recipient_id').eq('status', 'accepted')
      .or(`requester_id.eq.${effectiveId},recipient_id.eq.${effectiveId}`),
    admin.from('prayer_network_connections').select('id, requester_id, created_at')
      .eq('recipient_id', effectiveId).eq('status', 'pending').gte('created_at', since)
      .order('created_at', { ascending: false }).limit(20),
    admin.from('prayer_network_connections').select('id, recipient_id, updated_at')
      .eq('requester_id', effectiveId).eq('status', 'accepted').gte('updated_at', since)
      .order('updated_at', { ascending: false }).limit(20),
    admin.from('prayer_encouragements').select('id, from_user_id, note, created_at')
      .eq('to_user_id', effectiveId).gte('created_at', since).order('created_at', { ascending: false }).limit(20),
    admin.from('announcements').select('id, title, body, cta_label, cta_href, created_at')
      .eq('active', true).or(`target_user_id.is.null,target_user_id.eq.${effectiveId}`)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    admin.from('profiles').select('notifications_last_seen, dismissed_notifications, referral_code').eq('id', effectiveId).maybeSingle(),
    // Every band this person has ever held — the ripple below follows them on.
    admin.from('registrations').select('band_id, registered_at').eq('user_id', effectiveId).neq('source', 'wall'),
  ])

  const bandIds = (bands || []).map((b: any) => b.band_id)
  const giftIds = (giftBands || []).map((b: any) => b.band_id)
  const subIds = (subs || []).map((s: any) => s.id)
  const circleIds = [...new Set((mems || []).map((m: any) => m.circle_id))]
  const myReqIds = (myReqs || []).map((r: any) => r.id)
  const partnerIds = [...new Set((conns || []).map((c: any) => c.requester_id === effectiveId ? c.recipient_id : c.requester_id))]
  // Bands I held and passed on (not the ones I still own — those are covered
  // as band events). Keyed to my latest stop so only what happened after me
  // counts.
  const owned = new Set(bandIds)
  const heldCutoff = new Map<string, string>()
  for (const s of myStops || []) {
    if (owned.has(s.band_id)) continue
    const prev = heldCutoff.get(s.band_id)
    if (!prev || s.registered_at > prev) heldCutoff.set(s.band_id, s.registered_at)
  }
  const heldIds = [...heldCutoff.keys()]
  const myStopIds = [...new Set((myStops || []).map((s: any) => s.band_id))]

  // ── Wave 2: keyed on wave-1 ids ───────────────────────────────────────────
  const none = Promise.resolve({ data: [] as any[] })
  const [{ data: regs }, { data: giftRegs }, { data: ships }, { data: circles }, { data: creqs }, { data: replies }, { data: shared }, { data: heldRegs }, { data: dedBands }] = await Promise.all([
    bandIds.length
      ? admin.from('registrations').select('id, band_id, user_name, city, country, prayer, registered_at')
          .in('band_id', bandIds).gte('registered_at', since).order('registered_at', { ascending: false }).limit(40)
      : none,
    giftIds.length
      ? admin.from('registrations').select('id, band_id, user_name, city, state, country, registered_at')
          .in('band_id', giftIds).order('registered_at', { ascending: true }).limit(500)
      : none,
    subIds.length
      ? admin.from('subscription_shipments').select('id, status, tracking_number, created_at')
          .in('subscription_id', subIds).eq('status', 'shipped').gte('created_at', since).order('created_at', { ascending: false }).limit(20)
      : none,
    circleIds.length ? admin.from('prayer_circles').select('id, name').in('id', circleIds) : none,
    circleIds.length
      ? admin.from('circle_prayer_requests').select('id, circle_id, user_id, request_text, created_at')
          .in('circle_id', circleIds).neq('user_id', effectiveId).gte('created_at', since).order('created_at', { ascending: false }).limit(60)
      : none,
    myReqIds.length
      ? admin.from('prayer_request_comments').select('id, user_id, body, created_at')
          .in('request_id', myReqIds).neq('user_id', effectiveId).gte('created_at', since).order('created_at', { ascending: false }).limit(30)
      : none,
    partnerIds.length
      ? admin.from('prayer_network_requests').select('id, user_id, request_text, audience, created_at')
          .in('user_id', partnerIds).eq('is_answered', false).neq('visibility', 'public')
          .not('excluded_user_ids', 'cs', `{${effectiveId}}`).gte('created_at', since).order('created_at', { ascending: false }).limit(40)
      : none,
    heldIds.length
      ? admin.from('registrations').select('id, band_id, user_id, user_name, city, state, country, registered_at')
          .in('band_id', heldIds).neq('source', 'wall').order('registered_at', { ascending: true }).limit(400)
      : none,
    // Bands I hold that came with a gift message.
    myStopIds.length
      ? admin.from('bands').select('band_id, dedication_note, dedication_recipient, upline_user_id').in('band_id', myStopIds).not('dedication_note', 'is', null)
      : none,
  ])
  const dedIds = (dedBands || []).map((b: any) => b.band_id)

  // ── Wave 3: group membership for group-audience requests, and ONE name lookup ──
  const groupReqs = (shared || []).filter((r: any) => typeof r.audience === 'string' && r.audience.startsWith('group:'))
  const gids = [...new Set(groupReqs.map((r: any) => r.audience.slice(6)))]
  const nameIds = [
    ...(replies || []).map((r: any) => r.user_id),
    ...(shared || []).map((r: any) => r.user_id),
    ...(pend || []).map((c: any) => c.requester_id),
    ...(accepted || []).map((c: any) => c.recipient_id),
    ...(encs || []).map((e: any) => e.from_user_id),
    ...(dedBands || []).map((b: any) => b.upline_user_id),
  ].filter(Boolean)
  const [{ data: mem }, { data: nameRows }, { data: dedFirst }] = await Promise.all([
    gids.length ? admin.from('partner_group_members').select('group_id').eq('member_id', effectiveId).in('group_id', gids) : none,
    nameIds.length ? admin.from('profiles').select('id, full_name, email').in('id', [...new Set(nameIds)]) : none,
    // Who opened each dedicated band first — the message belongs to them.
    dedIds.length ? admin.from('registrations').select('band_id, user_id, registered_at').in('band_id', dedIds).neq('source', 'wall').order('registered_at', { ascending: true }).limit(500) : none,
  ])
  const inGroups = new Set<string>((mem || []).map((m: any) => m.group_id))
  const names: Record<string, string> = {}
  for (const p of nameRows || []) names[(p as any).id] = (p as any).full_name || ((p as any).email ? (p as any).email.split('@')[0] : 'Someone')

  // ── Build the feed ────────────────────────────────────────────────────────

  // 1. Band events — registrations on the owner's bands.
  for (const r of regs || []) {
    const who = r.user_name || 'Someone'
    const where = [r.city, r.country].filter(Boolean).join(', ')
    if (r.prayer) {
      items.push({ id: `prayer-${r.id}`, type: 'prayer', icon: '🙏', ts: r.registered_at, band_id: r.band_id,
        title: `${who} left a prayer on ${r.band_id}`, detail: r.prayer })
    } else {
      items.push({ id: `reg-${r.id}`, type: 'registration', icon: '✦', ts: r.registered_at, band_id: r.band_id,
        title: `${r.band_id} reached ${who}`, detail: where ? `in ${where}` : '' })
    }
  }

  // 0. The message that came with the band. It shows once on the first tap and
  // was gone; here it stays, dated to that first tap, so the moment can be
  // revisited — and it is the first thing a new person finds in the inbox.
  // Only for the person who opened the band first; later holders were not
  // the ones it was written for. Not subject to the 30-day window.
  {
    const firstBy = new Map<string, any>()
    for (const r of dedFirst || []) if (!firstBy.has(r.band_id)) firstBy.set(r.band_id, r)
    for (const b of dedBands || []) {
      const first = firstBy.get(b.band_id)
      if (!first || first.user_id !== effectiveId) continue
      const giver = b.upline_user_id ? names[b.upline_user_id] : null
      // Messages from before this existed in the inbox are dated to the day
      // it arrived, so they count as new once and light the badge for the
      // people who already had one; the first-tap date is kept in the text.
      const backfilled = first.registered_at < DEDICATION_INBOX_SINCE
      const opened = new Date(first.registered_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      items.push({ id: `ded-${b.band_id}`, type: 'dedication', icon: '💌', ts: backfilled ? DEDICATION_INBOX_SINCE : first.registered_at, band_id: b.band_id,
        title: `A message came with your band${giver ? ` from ${giver}` : ''}`,
        detail: `${b.dedication_recipient ? `For ${b.dedication_recipient} — ` : ''}${b.dedication_note}${backfilled ? ` (You first opened it on ${opened}.)` : ''}` })
    }
  }

  // 1c. The ripple — a band I once held reached someone new further down the
  // chain. Owning it is not required: once you have passed a band on, every
  // person it reaches after you is part of your ripple. Not emailed; the bell
  // is the right weight for it.
  {
    const sinceMe = new Map<string, number>()
    for (const r of heldRegs || []) {
      const cutoff = heldCutoff.get(r.band_id)
      if (!cutoff || r.registered_at <= cutoff || r.user_id === effectiveId) continue
      const n = (sinceMe.get(r.band_id) || 0) + 1
      sinceMe.set(r.band_id, n)
      if (new Date(r.registered_at) < new Date(since)) continue
      const who = r.user_name || 'Someone'
      const where = [r.city, r.state, isUS(r.country) ? null : r.country].filter(Boolean).join(', ')
      items.push({ id: `ripple-${r.id}`, type: 'ripple', icon: '🌍', ts: r.registered_at, band_id: r.band_id,
        title: `Your ripple reached ${who}`,
        detail: `${r.band_id}, the band you passed on, ${where ? `is now in ${where}` : 'reached its next person'}. ${n === 1 ? 'The first hands after yours.' : `${n} people have carried it since you.`}` })
    }
  }

  // 1b. Gifts received — bands I gave (upline = me, not owned by me): the FIRST
  // registration of each is "<name> received your gift band".
  {
    const firstByBand = new Map<string, any>()
    for (const r of giftRegs || []) if (!firstByBand.has(r.band_id)) firstByBand.set(r.band_id, r)
    for (const r of Array.from(firstByBand.values())) {
      if (new Date(r.registered_at) < new Date(since)) continue
      const who = r.user_name || 'Someone'
      const where = [r.city, r.state, isUS(r.country) ? null : r.country].filter(Boolean).join(', ')
      items.push({ id: `gift-${r.id}`, type: 'gift_received', icon: '🎁', ts: r.registered_at, band_id: r.band_id,
        title: `${who} received your gift band`, detail: where ? `Claimed in ${where} — your Prayer Band is traveling with them.` : 'They claimed it — your Prayer Band is traveling with them.' })
    }
  }

  // 2. Orders — being fulfilled or shipped.
  for (const o of orders || []) {
    if (o.status === 'shipped') {
      items.push({ id: `order-ship-${o.id}`, type: 'order', icon: '📦', ts: o.created_at,
        title: `Your order #${o.id} shipped`, detail: o.tracking_number ? `Tracking: ${o.tracking_number}` : 'On its way to you.' })
    } else {
      items.push({ id: `order-proc-${o.id}`, type: 'order', icon: '📦', ts: o.created_at,
        title: `Your order #${o.id} is being prepared`, detail: 'We’re getting your bands ready.' })
    }
  }

  // 3. Subscription shipments — shipped.
  for (const s of ships || []) {
    items.push({ id: `sub-ship-${s.id}`, type: 'shipment', icon: '🔁', ts: s.created_at,
      title: 'Your subscription band shipped', detail: s.tracking_number ? `Tracking: ${s.tracking_number}` : 'On its way to you.' })
  }

  // 4. A few recent public prayer requests you can pray for (quick-pray action).
  for (const r of prs || []) {
    items.push({ id: `pr-${r.id}`, type: 'prayer_request', icon: '🙏', ts: r.created_at, requestId: r.id,
      title: r.title || 'Someone asked for prayer', detail: r.body || '', intercessions: r.total_intercessions || 0 })
  }

  // 5. New prayer requests in circles you belong to — ONE summary per circle.
  {
    const nameById: Record<string, string> = Object.fromEntries((circles || []).map((c: any) => [c.id, c.name]))
    const byCircle = new Map<string, any[]>()
    for (const r of creqs || []) {
      if (!byCircle.has(r.circle_id)) byCircle.set(r.circle_id, [])
      byCircle.get(r.circle_id)!.push(r)
    }
    for (const [cid, list] of Array.from(byCircle.entries())) {
      const latest = list[0]
      const count = list.length
      const name = nameById[cid] || 'your circle'
      // id includes the latest request so dismissing hides the current batch;
      // a newer request changes the id and the summary resurfaces.
      items.push({ id: `cgrp-${cid}-${latest.id}`, type: 'circle_request', icon: '✦', ts: latest.created_at, circleId: cid,
        title: count === 1 ? `New prayer request in ${name}` : `${count} new prayer requests in ${name}`,
        detail: count === 1 ? (latest.request_text || '') : '' })
    }
  }

  // 6. Replies to your shared prayers (private to you).
  for (const r of replies || []) {
    items.push({ id: `reply-${r.id}`, type: 'reply', icon: '💬', ts: r.created_at,
      title: `${names[r.user_id] || 'Someone'} replied to your prayer`, detail: r.body })
  }

  // 7. Prayer requests a partner shared with you (network / group — never wall
  // or private). Group-audience requests only reach you if you're in the group.
  {
    const reaching = (shared || []).filter((r: any) => {
      const a = r.audience || 'network'
      if (a === 'private') return false
      if (a.startsWith('group:')) return inGroups.has(a.slice(6))
      return true
    }).slice(0, 8)
    for (const r of reaching) {
      items.push({ id: `netreq-${r.id}`, type: 'network_request', icon: '🙏', ts: r.created_at,
        title: `${names[r.user_id] || 'A partner'} asked for prayer`, detail: r.request_text })
    }
  }

  // 8. Pending connection requests — someone wants to be your prayer partner.
  for (const c of pend || []) {
    items.push({ id: `conn-${c.id}`, type: 'connection', icon: '🤝', ts: c.created_at,
      title: `${names[c.requester_id] || 'Someone'} wants to connect in prayer`, detail: 'Open Partners to accept.' })
  }

  // 8b. Accepted — the person you asked said yes.
  for (const c of accepted || []) {
    items.push({ id: `conn-acc-${c.id}`, type: 'connection', icon: '🤝', ts: c.updated_at,
      title: `${names[c.recipient_id] || 'Your partner'} accepted your prayer partner request`, detail: 'Open Partners to send them a prayer.' })
  }

  // 9. "Someone prayed for you" — peer encouragements.
  for (const e of encs || []) {
    items.push({ id: `enc-${e.id}`, type: 'encouragement', icon: '🙏', ts: e.created_at,
      title: `${names[e.from_user_id] || 'Someone'} prayed for you`, detail: e.note || '' })
  }

  // 10. Announcements — team messages sent through the app. A broadcast
  // (target_user_id null) reaches everyone; a targeted one only its recipient.
  for (const a of anns || []) {
    items.push({ id: `ann-${a.id}`, type: 'announcement', icon: '📣', ts: a.created_at,
      title: a.title, detail: a.body || '',
      ...(a.cta_href ? { ctaHref: a.cta_href, ctaLabel: a.cta_label || 'Open' } : {}) })
  }

  const dismissed = new Set(Array.isArray(profile?.dismissed_notifications) ? profile.dismissed_notifications : [])

  // 9. Give $2, Get $2 promo — one gentle inbox nudge with a share action.
  if (Date.now() < PROMO_END_MS && profile?.referral_code) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://prayerbands.com'
    const link = `${site}/?ref=${profile.referral_code}`
    items.push({
      id: 'promo-g2g2', type: 'promo', icon: '🎁', ts: PROMO_START,
      title: 'Give $2, Get $2',
      detail: 'Share Prayer Bands — your friend gets $2 off their first band, and you get $2 in store credit when they order.',
      shareUrl: link,
      shareText: `Join me in prayer with your first Prayer Band 🙏 Here's $2 off to begin — tap: ${link}`,
    })
  }

  const visible = items.filter(n => !dismissed.has(n.id))
  visible.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  const trimmed = visible.slice(0, 40)

  const lastSeen = profile?.notifications_last_seen ? new Date(profile.notifications_last_seen).getTime() : 0
  // Count unread over everything visible, not just the trimmed page, so the badge
  // doesn't under-report when there are more than 40 items.
  const unread = visible.filter(n => new Date(n.ts).getTime() > lastSeen).length

  return NextResponse.json({ notifications: trimmed, unread, days, lastSeen })
}

// POST { action: 'dismiss', id } — hide one notification (self only).
// POST (no action) — mark the inbox seen, resetting the unread badge.
export async function POST(req: NextRequest) {
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = svc()
  const body = await req.json().catch(() => ({}))

  if (body.action === 'dismiss' && body.id) {
    const { data: prof } = await admin.from('profiles').select('dismissed_notifications').eq('id', user.id).maybeSingle()
    const cur: string[] = Array.isArray(prof?.dismissed_notifications) ? prof!.dismissed_notifications : []
    if (!cur.includes(body.id)) cur.push(body.id)
    const next = cur.slice(-500) // cap growth — older dismissals age out of the feed anyway
    const { error } = await admin.from('profiles').update({ dismissed_notifications: next }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await admin.from('profiles').update({ notifications_last_seen: new Date().toISOString() }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
