import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPush } from '@/lib/push'

// A hand-off that has sat a week: the recipient never tapped. Nudge the
// giver once — a push, and the inbox shows it live (see my-notifications)
// — so they either ask the person to tap or cancel it. Runs from the
// nightly job. Needs band_transfers.reminded_at; until that column exists
// this does nothing and says so.
export async function sendHandoffReminders(svc: SupabaseClient): Promise<{ sent: number; skipped?: string }> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: stale, error } = await svc
    .from('band_transfers')
    .select('id, band_id, from_user_id, recipient_name, created_at')
    .eq('status', 'pending')
    .lte('created_at', weekAgo)
    .is('reminded_at', null)
  if (error) return { sent: 0, skipped: error.code === '42703' ? 'reminded_at column missing — run the migration' : error.message }

  let sent = 0
  for (const t of (stale || []) as any[]) {
    if (!t.from_user_id || String(t.band_id).startsWith('PB-TEST')) continue
    const days = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)
    const who = t.recipient_name || 'the person you passed it to'
    await sendPush(t.from_user_id, {
      title: `${who} hasn’t tapped ${t.band_id} yet`,
      body: `You passed it on ${days} days ago. If they have the band, ask them to tap it. If plans changed, you can cancel.`,
      url: `/band/${t.band_id}`,
      tag: `handoff-wait-${t.id}`,
    })
    await svc.from('band_transfers').update({ reminded_at: new Date().toISOString() }).eq('id', t.id)
    sent++
  }
  return { sent }
}
