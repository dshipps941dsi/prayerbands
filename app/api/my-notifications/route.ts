import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

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
      .order('created_at', { ascending: false })
      .limit(20)
    for (const s of ships || []) {
      items.push({ id: `sub-ship-${s.id}`, type: 'shipment', icon: '🔁', ts: s.created_at,
        title: 'Your subscription band shipped', detail: s.tracking_number ? `Tracking: ${s.tracking_number}` : 'On its way to you.' })
    }
  }

  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  const trimmed = items.slice(0, 40)

  const { data: profile } = await admin.from('profiles').select('notifications_last_seen').eq('id', effectiveId).maybeSingle()
  const lastSeen = profile?.notifications_last_seen ? new Date(profile.notifications_last_seen).getTime() : 0
  const unread = trimmed.filter(n => new Date(n.ts).getTime() > lastSeen).length

  return NextResponse.json({ notifications: trimmed, unread })
}

// Mark the inbox as seen (resets the unread badge). Self only.
export async function POST() {
  const user = await resolveUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const admin = svc()
  const { error } = await admin.from('profiles').update({ notifications_last_seen: new Date().toISOString() }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
