import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// "Give $2, Get $2" referral promo — surfaced as an inbox notification (not a
// banner over the daily moment). Shows while now < PROMO_END_MS; ts is fixed at
// the start so it reads as NEW once, then settles into the feed.
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

  // 1. Band events — registrations on the owner's bands.
  const { data: bands } = await admin.from('bands').select('band_id').eq('owner_id', effectiveId)
  const bandIds = (bands || []).map((b: any) => b.band_id)
  if (bandIds.length) {
    const { data: regs } = await admin
      .from('registrations')
      .select('id, band_id, user_name, city, country, prayer, registered_at')
      .in('band_id', bandIds)
      .gte('registered_at', since)
      .order('registered_at', { ascending: false })
      .limit(40)
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
  }

  // 2. Orders — being fulfilled or shipped.
  if (email) {
    const { data: orders } = await admin
      .from('orders')
      .select('id, status, tracking_number, created_at')
      .eq('customer_email', email)
      .in('status', ['processing', 'shipped'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    for (const o of orders || []) {
      if (o.status === 'shipped') {
        items.push({ id: `order-ship-${o.id}`, type: 'order', icon: '📦', ts: o.created_at,
          title: `Your order #${o.id} shipped`, detail: o.tracking_number ? `Tracking: ${o.tracking_number}` : 'On its way to you.' })
      } else {
        items.push({ id: `order-proc-${o.id}`, type: 'order', icon: '📦', ts: o.created_at,
          title: `Your order #${o.id} is being prepared`, detail: 'We’re getting your bands ready.' })
      }
    }
  }

  // 3. Subscription shipments — shipped.
  const { data: subs } = await admin.from('subscriptions').select('id').eq('user_id', effectiveId)
  const subIds = (subs || []).map((s: any) => s.id)
  if (subIds.length) {
    const { data: ships } = await admin
      .from('subscription_shipments')
      .select('id, status, tracking_number, created_at')
      .in('subscription_id', subIds)
      .eq('status', 'shipped')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    for (const s of ships || []) {
      items.push({ id: `sub-ship-${s.id}`, type: 'shipment', icon: '🔁', ts: s.created_at,
        title: 'Your subscription band shipped', detail: s.tracking_number ? `Tracking: ${s.tracking_number}` : 'On its way to you.' })
    }
  }

  // Community items (prayer requests + circles) can be high-volume, so circle
  // activity is grouped per circle and public requests are capped — otherwise a
  // busy circle would bury the user's own band/order notifications.

  // 4. A few recent public prayer requests you can pray for (quick-pray action).
  const { data: prs } = await admin
    .from('prayer_requests_with_counts')
    .select('id, title, body, total_intercessions, created_at, user_id')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .neq('user_id', effectiveId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(6)
  for (const r of prs || []) {
    items.push({ id: `pr-${r.id}`, type: 'prayer_request', icon: '🙏', ts: r.created_at, requestId: r.id,
      title: r.title || 'Someone asked for prayer', detail: r.body || '', intercessions: r.total_intercessions || 0 })
  }

  // 5. New prayer requests in circles you belong to — grouped into ONE summary
  // per circle (deep-links to the circle), so a popular circle = one line.
  const { data: mems } = await admin.from('circle_members').select('circle_id').eq('user_id', effectiveId)
  const circleIds = [...new Set((mems || []).map((m: any) => m.circle_id))]
  if (circleIds.length) {
    const { data: circles } = await admin.from('prayer_circles').select('id, name').in('id', circleIds)
    const nameById: Record<string, string> = Object.fromEntries((circles || []).map((c: any) => [c.id, c.name]))
    const { data: creqs } = await admin
      .from('circle_prayer_requests')
      .select('id, circle_id, user_id, request_text, created_at')
      .in('circle_id', circleIds)
      .neq('user_id', effectiveId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(60)
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

  // Name resolver for the person-driven items below.
  const namesFor = async (ids: string[]): Promise<Record<string, string>> => {
    const uniq = [...new Set(ids)].filter(Boolean)
    if (!uniq.length) return {}
    const { data } = await admin.from('profiles').select('id, full_name, email').in('id', uniq)
    const out: Record<string, string> = {}
    for (const p of data || []) out[(p as any).id] = (p as any).full_name || ((p as any).email ? (p as any).email.split('@')[0] : 'Someone')
    return out
  }

  // 6. Replies to your shared prayers (private to you).
  {
    const { data: myReqs } = await admin.from('prayer_network_requests').select('id').eq('user_id', effectiveId)
    const myReqIds = (myReqs || []).map((r: any) => r.id)
    if (myReqIds.length) {
      const { data: replies } = await admin
        .from('prayer_request_comments')
        .select('id, user_id, body, created_at')
        .in('request_id', myReqIds)
        .neq('user_id', effectiveId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30)
      const names = await namesFor((replies || []).map((r: any) => r.user_id))
      for (const r of replies || []) {
        items.push({ id: `reply-${r.id}`, type: 'reply', icon: '💬', ts: r.created_at,
          title: `${names[r.user_id] || 'Someone'} replied to your prayer`, detail: r.body })
      }
    }
  }

  // 7. Prayer requests a partner shared with you (network / group — never wall
  // or private). Group-audience requests only reach you if you're in the group.
  {
    const { data: conns } = await admin.from('prayer_network_connections')
      .select('requester_id, recipient_id').eq('status', 'accepted')
      .or(`requester_id.eq.${effectiveId},recipient_id.eq.${effectiveId}`)
    const partnerIds = [...new Set((conns || []).map((c: any) => c.requester_id === effectiveId ? c.recipient_id : c.requester_id))]
    if (partnerIds.length) {
      const { data: shared } = await admin.from('prayer_network_requests')
        .select('id, user_id, request_text, audience, created_at')
        .in('user_id', partnerIds)
        .eq('is_answered', false)
        .neq('visibility', 'public')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(40)
      const groupReqs = (shared || []).filter((r: any) => typeof r.audience === 'string' && r.audience.startsWith('group:'))
      const inGroups = new Set<string>()
      if (groupReqs.length) {
        const gids = [...new Set(groupReqs.map((r: any) => r.audience.slice(6)))]
        const { data: mem } = await admin.from('partner_group_members').select('group_id').eq('member_id', effectiveId).in('group_id', gids)
        ;(mem || []).forEach((m: any) => inGroups.add(m.group_id))
      }
      const reaching = (shared || []).filter((r: any) => {
        const a = r.audience || 'network'
        if (a === 'private') return false
        if (a.startsWith('group:')) return inGroups.has(a.slice(6))
        return true
      }).slice(0, 8)
      const names = await namesFor(reaching.map((r: any) => r.user_id))
      for (const r of reaching) {
        items.push({ id: `netreq-${r.id}`, type: 'network_request', icon: '🙏', ts: r.created_at,
          title: `${names[r.user_id] || 'A partner'} asked for prayer`, detail: r.request_text })
      }
    }
  }

  // 8. Pending connection requests — someone wants to be your prayer partner.
  {
    const { data: pend } = await admin.from('prayer_network_connections')
      .select('id, requester_id, created_at')
      .eq('recipient_id', effectiveId).eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    const names = await namesFor((pend || []).map((c: any) => c.requester_id))
    for (const c of pend || []) {
      items.push({ id: `conn-${c.id}`, type: 'connection', icon: '🤝', ts: c.created_at,
        title: `${names[c.requester_id] || 'Someone'} wants to connect in prayer`, detail: 'Open Partners to accept.' })
    }
  }

  const { data: profile } = await admin.from('profiles').select('notifications_last_seen, dismissed_notifications, referral_code').eq('id', effectiveId).maybeSingle()
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
