import { createServiceClient } from '@/lib/supabase/server'

// The integrity check: the questions we wish someone had been asking the
// afternoon Emily's band went back to Matt. Each check looks for a state the
// product should never be in and describes it in plain words. Nothing here
// changes data; it only reports. The cron runs it and alerts the team the
// first time a finding appears; the admin Bands tab shows the live list.

export type Finding = {
  key: string          // stable id so the same finding alerts once
  kind: 'wrong_account' | 'handoff_on_giver' | 'owner_not_holder' | 'stalled_signup'
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

  for (const [bandId, r] of latestByBand) {
    const b = bandById.get(bandId)
    const acct = r.user_id ? prof.get(r.user_id) : null
    const isTest = (acct?.email || '').includes('test@') || bandId.startsWith('PB-TEST') || bandId.startsWith('PB-TH-')
    if (isTest) continue

    // 1. The latest stop was typed with one name but sits on an account with
    //    a different one: the "registered on someone else's phone" signature.
    if (acct?.full_name && first(r.user_name) && first(r.user_name) !== first(acct.full_name)
        && !first(acct.full_name).startsWith(first(r.user_name)) && !first(r.user_name).startsWith(first(acct.full_name))) {
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
