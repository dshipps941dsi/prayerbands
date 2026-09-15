import { sendEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isTeamAdmin } from '@/lib/team'
import { runIntegrityChecks, type Finding } from '@/lib/integrity'
import { sendPush } from '@/lib/push'
import { escapeHtml } from '@/lib/escape-html'

// Runs the integrity check. Two callers:
//   - Vercel Cron (Authorization: Bearer CRON_SECRET) — records findings,
//     alerts the team about NEW ones (push + email), clears ones that went away.
//   - A signed-in team admin (the admin Bands tab) — returns the live list.
export const dynamic = 'force-dynamic'

async function callerIsCron(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  const cron = await callerIsCron(req)
  if (!cron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!(await isTeamAdmin(user))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const findings = await runIntegrityChecks()
  const svc = createServiceClient()
  const now = new Date().toISOString()

  // Reconcile against what has been seen before.
  const { data: known } = await svc.from('integrity_alerts').select('key, notified_at, resolved_at')
  const knownByKey = new Map((known || []).map((k: any) => [k.key, k]))
  const fresh: Finding[] = []
  for (const f of findings) {
    const k = knownByKey.get(f.key)
    if (!k || k.resolved_at) fresh.push(f)
    await svc.from('integrity_alerts').upsert({ key: f.key, kind: f.kind, detail: { ...f.detail, summary: f.summary, severity: f.severity, band_id: f.band_id ?? null }, last_seen: now, resolved_at: null }, { onConflict: 'key' })
  }
  const liveKeys = new Set(findings.map(f => f.key))
  const cleared = (known || []).filter((k: any) => !k.resolved_at && !liveKeys.has(k.key)).map((k: any) => k.key)
  if (cleared.length) await svc.from('integrity_alerts').update({ resolved_at: now }).in('key', cleared)

  // Alert the team about what is new, once.
  let notified = 0
  const toNotify = cron ? fresh.filter(f => f.severity !== 'low' || !knownByKey.get(f.key)) : []
  if (toNotify.length) {
    const { data: admins } = await svc.from('profiles').select('id, email, full_name').eq('team_role', 'admin')
    const ids = (admins || []).map((a: any) => a.id)
    const high = toNotify.filter(f => f.severity === 'high').length
    await sendPush(ids, {
      title: high ? `${high} band${high === 1 ? '' : 's'} on the wrong account` : `${toNotify.length} thing${toNotify.length === 1 ? '' : 's'} to check`,
      body: toNotify[0].summary.slice(0, 140),
      url: '/admin',
      tag: 'integrity',
    })
    const emails = (admins || []).map((a: any) => a.email).filter(Boolean)
    if (emails.length && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const rows = toNotify.map(f => `<li style="margin:0 0 10px"><strong style="color:${f.severity === 'high' ? '#B4441F' : '#0d3d6e'}">${f.severity.toUpperCase()}</strong> &middot; ${escapeHtml(f.summary)}</li>`).join('')
      await sendEmail({
        from: 'Prayer Bands <bands@prayerbands.com>',
        to: emails,
        subject: `Integrity check: ${toNotify.length} new finding${toNotify.length === 1 ? '' : 's'}`,
        html: `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;color:#2A3344"><h2 style="margin:0 0 12px;color:#0d3d6e">Things that should not be true</h2><p style="font-size:14px;line-height:1.6;margin:0 0 16px">Found by the daily check. Each of these is a band or account in a state the product should never produce. Open Admin &rarr; Bands to see the live list and fix them.</p><ul style="padding-left:18px;font-size:14px;line-height:1.5">${rows}</ul><p style="font-size:12px;color:#6b7280;margin-top:20px">You get one email per new finding; cleared findings stop appearing.</p></div>`,
      }).catch(() => {})
    }
    await svc.from('integrity_alerts').update({ notified_at: now }).in('key', toNotify.map(f => f.key))
    notified = toNotify.length
  }

  return NextResponse.json({ ran_at: now, findings, new: fresh.length, cleared: cleared.length, notified })
}
