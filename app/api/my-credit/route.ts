import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { creditBalanceCents } from '@/lib/credit'

// GET /api/my-credit — what the signed-in person has earned from referrals,
// what they have spent, and who they have brought in.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ balance_cents: 0, earned_cents: 0, referrals: 0, entries: [], code: null })
  }

  const admin = createServiceClient()

  const [{ data: entries }, { data: profile }, { count: referralCount }] = await Promise.all([
    admin
      .from('credit_ledger')
      .select('delta_cents, reason, note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('profiles').select('referral_code').eq('id', user.id).maybeSingle(),
    admin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_user_id', user.id)
      .eq('status', 'earned'),
  ])

  const balance = await creditBalanceCents(admin, user.id)
  const earned = (entries ?? [])
    .filter((e: any) => e.reason === 'referral')
    .reduce((s: number, e: any) => s + Number(e.delta_cents || 0), 0)

  return NextResponse.json({
    balance_cents: balance,
    earned_cents: earned,
    referrals: referralCount ?? 0,
    code: profile?.referral_code ?? null,
    entries: entries ?? [],
  })
}
