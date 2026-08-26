import type { SupabaseClient } from '@supabase/supabase-js'

// Store credit, held as a ledger rather than a balance. Every movement says
// where it came from, so a balance can always be explained — which matters
// because this is money owed to real people.

export type CreditEntry = {
  delta_cents: number
  reason: 'referral' | 'redemption' | 'adjustment' | 'expiry' | 'subscription'
  created_at: string
  note: string | null
}

export const CREDIT_LIFETIME_DAYS = 90

export function creditExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + CREDIT_LIFETIME_DAYS * 86400000).toISOString()
}

export async function creditBalanceCents(admin: SupabaseClient, userId: string): Promise<number> {
  // Sweep anything past its 90 days first, so a balance is never quoted — or
  // spent — after it has lapsed. The sweep writes ledger rows rather than
  // filtering, so the sum below stays the whole truth.
  const { error: sweepError } = await admin.rpc('expire_credit', { p_user: userId })
  if (sweepError) throw new Error('credit: expiry sweep failed — ' + sweepError.message)

  const { data, error } = await admin
    .from('credit_ledger')
    .select('delta_cents')
    .eq('user_id', userId)
  if (error) {
    // Never guess a balance. A read failure must not look like "no credit" and
    // quietly cost someone the discount they had earned.
    throw new Error('credit: could not read balance — ' + error.message)
  }
  return (data ?? []).reduce((sum, r) => sum + Number((r as { delta_cents: number }).delta_cents || 0), 0)
}

// Postgres unique index credit_ledger_once_per_session is the real guard: Stripe
// retries webhooks, and a retry must not pay a second time. A duplicate insert
// comes back as 23505 and is treated as "already done", not as a failure.
const UNIQUE_VIOLATION = '23505'

export async function recordCredit(
  admin: SupabaseClient,
  entry: {
    user_id: string
    delta_cents: number
    reason: CreditEntry['reason']
    order_id?: number | null
    stripe_session_id?: string | null
    note?: string | null
    expires_at?: string | null
  }
): Promise<{ recorded: boolean; duplicate: boolean }> {
  const { error } = await admin.from('credit_ledger').insert({
    user_id: entry.user_id,
    delta_cents: entry.delta_cents,
    reason: entry.reason,
    order_id: entry.order_id ?? null,
    stripe_session_id: entry.stripe_session_id ?? null,
    note: entry.note ?? null,
    expires_at: entry.expires_at ?? null,
  })

  if (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      return { recorded: false, duplicate: true }
    }
    throw new Error('credit: could not record entry — ' + error.message)
  }
  return { recorded: true, duplicate: false }
}

export const formatCredit = (cents: number) =>
  '$' + (Math.max(0, cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
