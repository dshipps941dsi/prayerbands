import type { SupabaseClient } from '@supabase/supabase-js'

// Referral code generator — unambiguous alphabet (no I/O/0/1), "PB-" prefix.
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'PB-'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Ensure a profile has a referral_code. Profiles are normally created by a DB
// trigger (which also auto-fills the code), so this is a TS-side belt: if the
// row exists without a code, generate one and write it, retrying once on a
// unique-constraint violation. Non-fatal — returns null (and logs) on failure,
// e.g. before db/referrals.sql has been run.
export async function ensureReferralCode(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data: existing, error: readErr } = await admin
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle()
    if (readErr) return null
    if (existing?.referral_code) return existing.referral_code as string

    for (let attempt = 0; attempt < 2; attempt++) {
      const code = generateReferralCode()
      const { error } = await admin
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', userId)
        .is('referral_code', null)
      if (!error) return code
      // 23505 = unique_violation → try once more with a fresh code.
      if (error.code !== '23505') {
        console.error('[ensureReferralCode] update error:', error)
        return null
      }
    }
    return null
  } catch (err) {
    console.error('[ensureReferralCode] unexpected error:', err)
    return null
  }
}
