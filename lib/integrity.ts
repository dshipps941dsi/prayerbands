import { createServiceClient } from '@/lib/supabase/server'

// The integrity check: the questions we wish someone had been asking the
// afternoon Emily's band went back to Matt. Each check looks for a state the
// product should never be in and describes it in plain words. Nothing here
// changes data; it only reports. The cron runs it and alerts the team the
// first time a finding appears; the admin Bands tab shows the live list.

export type Finding = {
  key: string          // stable id so the same finding alerts once
  kind: 'wrong_account' | 'handoff_on_giver' | 'owner_not_holder' | 'stalled_signup' | 'uncredited_order' | 'buyer_no_account' | 'duplicate_person' | 'stuck_handoff'
  severity: 'high' | 'medium' | 'low'
  band_id?: string
  summary: string
  detail: Record<string, unknown>
}

const first = (s: string | null | undefined) => (s || '').trim().toLowerCase().split(/\s+/)[0] || ''

export async function runIntegrityChecks(): Promise<Finding[]> {
  const svc = createServiceClient()
  const findings: Finding[] = []

  // Latest real stop per band, with the account it sits on and the band's owner.
  const { data: regs } = await svc
    .from('registrations')
    .select('id, band_id, user_name, user_id, registered_by, registered_at, source')
    .neq('source', 'wall')
    .order('registered_at', { ascending: false })
  const latestByBand = new Map<string, any>()
  for (const r of regs || []) if (r.band_id && !latestByBand.has(r.band_id)) latestByBand.set(r.band_id, r)

  const bandIds = [...latestByBand.keys()]
  const { data: bands } = bandIds.length
    ? await svc.from('bands').select('band_id, owner_id, upline_user_id').in('band_id', bandIds)
    : { data: [] as any[] }
  const bandById = new Map((bands || []).map((b: any) => [b.band_id, b]))

  const userIds = new Set<string>()
  for (const r of latestByBand.values()) { if (r.user_id) userIds.add(r.user_id); if (r.registered_by) userIds.add(r.registered_by) }
  for (const b of bands || []) { if (b.owner_id) userIds.add(b.owner_id) }
  const { data: profs } = userIds.size
    ? await svc.from('profiles').select('id, full_name, email').in('id', [...userIds])
    : { data: [] as any[] }
  const prof = new Map((profs || []).map((p: any) => [p.id, p]))
  const who = (id: string | null | undefined) => (id && (prof.get(id)?.full_name || prof.get(id)?.email)) || 'unknown'

  // What each account's owner types as their own name, from every stop they
  // have made. "Nick" typing "Nicholas" once, or a gym-named account whose
  // only stop is its owner, must not read as someone else's band; Jennifer
  // typing "Kathy" when every other stop of hers says "Jennifer" must.
  const namesTypedByAccount = new Map<string, Set<string>>()
  for (const r of regs || []) {
    if (!r.user_id || !r.user_name) continue
    if (!namesTypedByAccount.has(r.user_id)) namesTypedByAccount.set(r.user_id, new Set())
    namesTypedByAccount.get(r.user_id)!.add(first(r.user_name))
  }
  // Candice and Candy, Jennifer and Jenny, Katherine and Kathy: a shared
  // first four letters is the same person; a stranger's name rarely is.
  const looksLikeSamePerson = (a: string, b: string) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4))

  for (const [bandId, r] of latestByBand) {
    const b = bandById.get(bandId)
    const acct = r.user_id ? prof.get(r.user_id) : null
    const isTest = (acct?.email || '').includes('test@') || bandId.startsWith('PB-TEST') || bandId.startsWith('PB-TH-')
    if (isTest) continue

    // 1. The latest stop was typed with one name but sits on an account with
    //    a different one: the "registered on someone else's phone" signature.
    //    Only when the account's owner has typed THEIR OWN name on some other
    //    stop — proof that this account normally registers as itself.
    const typed = first(r.user_name)
    const acctFirst = first(acct?.full_name)
    const ownNames = r.user_id ? namesTypedByAccount.get(r.user_id) : undefined
    const accountKnowsItself = !!ownNames && [...ownNames].some(n => n !== typed && looksLikeSamePerson(n, acctFirst))
    if (acct?.full_name && typed && !looksLikeSamePerson(typed, acctFirst) && accountKnowsItself) {
      findings.push({
        key: `wrong_account:${bandId}:${r.id}`, kind: 'wrong_account', severity: 'high', band_id: bandId,
        summary: `${bandId}: the latest stop says "${r.user_name}" but sits on ${acct.full_name}'s account (${acct.email}).`,
        detail: { typed: r.user_name, account: acct.full_name, email: acct.email, registered_at: r.registered_at },
      })
    }

    // 2. Owner is a different account from the current signed-in holder.
    if (b?.owner_id && r.user_id && b.owner_id !== r.user_id) {
      findings.push({
        key: `owner_not_holder:${bandId}:${r.id}`, kind: 'owner_not_holder', severity: 'medium', band_id: bandId,
        summary: `${bandId}: owned by ${who(b.owner_id)} but currently held by ${who(r.user_id)}.`,
        detail: { owner: who(b.owner_id), holder: who(r.user_id), registered_at: r.registered_at },
      })
    }
  }

  // 3. A completed hand-off whose recipient stop landed on the giver's account.
  const { data: transfers } = await svc
    .from('band_transfers')
    .select('id, band_id, from_user_id, recipient_name, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
  for (const t of transfers || []) {
    const r = latestByBand.get(t.band_id)
    if (!r || !t.from_user_id) continue
    if (r.user_id === t.from_user_id && new Date(r.registered_at) >= new Date(t.created_at)) {
      findings.push({
        key: `handoff_on_giver:${t.id}`, kind: 'handoff_on_giver', severity: 'high', band_id: t.band_id,
        summary: `${t.band_id}: handed to ${t.recipient_name || 'someone'} by ${who(t.from_user_id)}, but the band is back on ${who(t.from_user_id)}'s account.`,
        detail: { recipient: t.recipient_name, giver: who(t.from_user_id), transfer_at: t.created_at, stop_at: r.registered_at },
      })
    }
  }

  // 5. Shipped or packed orders whose bands are credited to nobody — the
  //    Jeff Kondel case before it happens: the buyer will never see them.
  const { data: orders } = await svc
    .from('orders')
    .select('id, customer_email, customer_name, status, assigned_band_ids, order_metadata, created_at')
    .in('status', ['processing', 'shipped'])
    .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
  const orderBandIds = [...new Set((orders || []).flatMap((o: any) => (o.assigned_band_ids || []) as string[]))]
  const { data: orderBands } = orderBandIds.length
    ? await svc.from('bands').select('band_id, owner_id, upline_user_id').in('band_id', orderBandIds)
    : { data: [] as any[] }
  const orderBandById = new Map((orderBands || []).map((b: any) => [b.band_id, b]))
  const { data: allProfs } = await svc.from('profiles').select('id, email, full_name')
  const profByEmail = new Map((allProfs || []).map((p: any) => [String(p.email || '').toLowerCase(), p]))
  const profById = new Map((allProfs || []).map((p: any) => [p.id, p]))
  for (const o of (orders || []) as any[]) {
    const ids = (o.assigned_band_ids || []) as string[]
    if (!ids.length) continue
    const bare = ids.filter(id => { const b = orderBandById.get(id); return b && !b.owner_id && !b.upline_user_id })
    const metaBuyer = String(o.order_metadata?.buyer_user_id || '').trim()
    const hasAccount = (metaBuyer && profById.has(metaBuyer)) || profByEmail.has(String(o.customer_email || '').toLowerCase())
    if (bare.length) {
      findings.push({
        key: `uncredited_order:${o.id}`, kind: 'uncredited_order', severity: 'high',
        summary: `Order #${o.id} (${o.customer_name || o.customer_email}): ${bare.length} band${bare.length === 1 ? '' : 's'} credited to nobody — ${bare.join(', ')}. The buyer will not see them.`,
        detail: { order: o.id, email: o.customer_email, bands: bare, has_account: hasAccount },
      })
    } else if (!hasAccount) {
      // Credited by email at the time, or not at all; either way the buyer
      // has no account under that email today, so the bands sit under nobody.
      findings.push({
        key: `buyer_no_account:${o.id}`, kind: 'buyer_no_account', severity: 'medium',
        summary: `Order #${o.id} (${o.customer_name || 'unknown'}): no account under ${o.customer_email}. If they sign up with another email, their bands will not follow.`,
        detail: { order: o.id, email: o.customer_email },
      })
    }
  }

  // 5b. Subscription shipments whose bands are credited to nobody.
  const { data: ships } = await svc
    .from('subscription_shipments')
    .select('id, user_id, band_ids, status, created_at')
    .in('status', ['processing', 'shipped'])
    .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString())
  const shipBandIds = [...new Set((ships || []).flatMap((s: any) => (s.band_ids || []) as string[]))]
  const { data: shipBands } = shipBandIds.length
    ? await svc.from('bands').select('band_id, owner_id, upline_user_id').in('band_id', shipBandIds)
    : { data: [] as any[] }
  const shipBandById = new Map((shipBands || []).map((b: any) => [b.band_id, b]))
  for (const sh of (ships || []) as any[]) {
    const bare = ((sh.band_ids || []) as string[]).filter(id => { const b = shipBandById.get(id); return b && !b.owner_id && !b.upline_user_id })
    if (!bare.length) continue
    findings.push({
      key: `uncredited_shipment:${sh.id}`, kind: 'uncredited_order', severity: 'high',
      summary: `Subscription shipment for ${profById.get(sh.user_id)?.full_name || profById.get(sh.user_id)?.email || 'a subscriber'}: ${bare.length} band${bare.length === 1 ? '' : 's'} credited to nobody — ${bare.join(', ')}.`,
      detail: { shipment: sh.id, subscriber: sh.user_id, bands: bare },
    })
  }

  // 6. One person, two accounts (same full name, different emails). Credit
  //    and stops split across them — Susan's and Isla's case.
  const byName = new Map<string, any[]>()
  for (const p of (allProfs || []) as any[]) {
    const k = String(p.full_name || '').trim().toLowerCase()
    if (!k || k.split(/\s+/).length < 2) continue
    if ((p.email || '').includes('test@')) continue
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k)!.push(p)
  }
  for (const [name, list] of byName) {
    if (list.length < 2) continue
    findings.push({
      key: `duplicate_person:${list.map((p: any) => p.id).sort().join('+')}`, kind: 'duplicate_person', severity: 'low',
      summary: `${list[0].full_name} has ${list.length} accounts: ${list.map((p: any) => p.email).join(', ')}. Bands and credit may be split between them.`,
      detail: { name, accounts: list.map((p: any) => ({ id: p.id, email: p.email })) },
    })
  }

  // 7. Hand-offs pending for more than a week: the recipient never tapped,
  //    and meanwhile nobody can pass the band on.
  const { data: pending } = await svc
    .from('band_transfers')
    .select('id, band_id, from_user_id, recipient_name, created_at')
    .eq('status', 'pending')
    .lte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
  for (const t of (pending || []) as any[]) {
    if (t.band_id.startsWith('PB-TEST')) continue
    const days = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)
    findings.push({
      key: `stuck_handoff:${t.id}`, kind: 'stuck_handoff', severity: 'medium', band_id: t.band_id,
      summary: `${t.band_id}: handed to ${t.recipient_name || 'someone'} by ${who(t.from_user_id)} ${days} days ago and never tapped. Nobody can pass it on until it is accepted or cancelled.`,
      detail: { recipient: t.recipient_name, giver: who(t.from_user_id), transfer_at: t.created_at, days },
    })
  }

  // 4. Sign-ups that asked for a code and never entered it (last 48h, >1h old).
  const { data: stalled } = await svc.rpc('stalled_signups', {}).then(r => r, () => ({ data: null as any }))
  for (const s of (stalled || []) as any[]) {
    findings.push({
      key: `stalled_signup:${s.id}`, kind: 'stalled_signup', severity: 'low',
      summary: `${s.email} asked for a sign-in code ${s.age} ago and never entered it.`,
      detail: { email: s.email, created_at: s.created_at },
    })
  }

  return findings
}
