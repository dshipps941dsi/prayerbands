import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// Sales analytics for the admin dashboard. All-time figures plus a date-range
// window (?days=7|30|90, or 'all'). Read-only aggregation over orders (+ the
// products catalog for names, subscriptions for MRR). Service role bypasses RLS.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createServiceClient()

  const daysParam = req.nextUrl.searchParams.get('days')
  const days = daysParam && daysParam !== 'all' ? Math.max(1, parseInt(daysParam) || 30) : null
  const since = days ? new Date(Date.now() - days * 86_400_000) : null

  const { data: orderRows } = await admin
    .from('orders')
    .select('id, status, payment_status, amount_total, created_at, order_metadata')
    .order('created_at', { ascending: true })

  const { data: products } = await admin.from('products').select('slug, name, price_cents')
  const nameBySlug = new Map((products ?? []).map((p: any) => [p.slug, p.name]))
  const priceBySlug = new Map((products ?? []).map((p: any) => [p.slug, p.price_cents]))

  // Only money that actually arrived counts, and refunds come back off.
  // An order keeps its amount_total after a refund (that is what Stripe
  // charged); the refunds themselves are logged on order_metadata.refunds by
  // the refund endpoint. A cancelled order therefore nets to zero here and
  // its bands are not "sold" — which is what the dashboard was getting wrong.
  const refundedOf = (o: any): number => {
    const r = o.order_metadata?.refunds
    return Array.isArray(r) ? r.reduce((s: number, x: any) => s + (Number(x?.amount) || 0), 0) : 0
  }
  const netOf = (o: any): number => Math.max(0, (o.amount_total || 0) - refundedOf(o))

  const paid = (orderRows ?? []).filter(o => o.payment_status === 'paid')
  const all = paid.filter(o => o.status !== 'cancelled')
  const inWindow = (o: any) => !since || new Date(o.created_at) >= since
  const periodOrders = all.filter(inWindow)
  const periodRefunded = paid.filter(inWindow).reduce((s, o) => s + refundedOf(o), 0)
  const allRefunded = paid.reduce((s, o) => s + refundedOf(o), 0)

  const sum = (arr: any[]) => arr.reduce((s, o) => s + netOf(o), 0)
  const bandsOf = (arr: any[]) => arr.reduce((s, o) => s + (parseInt(o.order_metadata?.quantity) || 0), 0)

  // Top sellers (units) within the window — parse each order's saved cart.
  const units: Record<string, number> = {}
  for (const o of periodOrders) {
    let items: any[] = []
    try { items = JSON.parse(o.order_metadata?.items || '[]') } catch { /* ignore */ }
    for (const it of items) {
      if (!it?.id) continue
      units[it.id] = (units[it.id] || 0) + (Number(it.qty) || 0)
    }
  }
  const topSellers = Object.entries(units)
    .map(([slug, qty]) => ({ slug, name: nameBySlug.get(slug) || slug, units: qty, estRevenueCents: (priceBySlug.get(slug) || 0) * qty }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 10)

  // Referral-attributed orders within the window, and who sent them.
  const refOrders = periodOrders.filter(o => o.order_metadata?.referrer_user_id)
  const byRef = new Map<string, { orders: number; revenueCents: number; bands: number }>()
  for (const o of refOrders) {
    const id = String(o.order_metadata.referrer_user_id)
    const cur = byRef.get(id) || { orders: 0, revenueCents: 0, bands: 0 }
    cur.orders++; cur.revenueCents += netOf(o); cur.bands += parseInt(o.order_metadata?.quantity) || 0
    byRef.set(id, cur)
  }
  let topReferrers: any[] = []
  if (byRef.size) {
    const { data: profs } = await admin
      .from('profiles').select('id, full_name, email, referral_code').in('id', [...byRef.keys()])
    const profById = new Map((profs ?? []).map((p: any) => [p.id, p]))
    topReferrers = [...byRef.entries()]
      .map(([id, r]) => {
        const p = profById.get(id)
        return { id, name: p?.full_name || p?.email || 'Unknown', email: p?.email || '', code: p?.referral_code || '', ...r }
      })
      .sort((a, b) => b.revenueCents - a.revenueCents || b.orders - a.orders)
      .slice(0, 10)
  }

  // Revenue series — daily buckets for a window, monthly for all-time.
  const monthly = !days
  const buckets: Record<string, number> = {}
  for (const o of periodOrders) {
    const d = new Date(o.created_at)
    const key = monthly
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : d.toISOString().slice(0, 10)
    buckets[key] = (buckets[key] || 0) + netOf(o)
  }
  // Fill the whole window with a continuous axis so no-sale days/months still
  // appear — a series of only the days that had orders reads as sparse/broken.
  const pad = (n: number) => String(n).padStart(2, '0')
  const keys: string[] = []
  if (monthly) {
    const first = all.length ? new Date(all[0].created_at) : new Date()
    let y = first.getFullYear(), m = first.getMonth()
    const now = new Date()
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      keys.push(`${y}-${pad(m + 1)}`)
      m++; if (m > 11) { m = 0; y++ }
    }
  } else {
    const today = new Date()
    for (let i = days! - 1; i >= 0; i--) {
      keys.push(new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10))
    }
  }
  const series = keys.map(label => ({ label, cents: buckets[label] || 0 }))

  // Subscriptions → active count + MRR (each plan normalised to monthly).
  const { data: subs } = await admin
    .from('subscriptions')
    .select('status, subscription_plans(total_price, interval_months)')
    .eq('status', 'active')
  let activeSubs = 0
  let mrr = 0
  for (const s of subs ?? []) {
    const plan = (s as any).subscription_plans
    if (!plan) continue
    activeSubs++
    mrr += Number(plan.total_price) / (Number(plan.interval_months) || 1)
  }

  return NextResponse.json({
    days: days || 'all',
    allTime: { revenueCents: sum(all), orders: all.length, bands: bandsOf(all), refundedCents: allRefunded },
    period: {
      revenueCents: sum(periodOrders),
      orders: periodOrders.length,
      bands: bandsOf(periodOrders),
      aovCents: periodOrders.length ? Math.round(sum(periodOrders) / periodOrders.length) : 0,
      refundedCents: periodRefunded,
    },
    topSellers,
    referrals: { orders: refOrders.length, revenueCents: sum(refOrders) },
    topReferrers,
    subscriptions: { active: activeSubs, mrrCents: Math.round(mrr * 100) },
    series,
  })
}
