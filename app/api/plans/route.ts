import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public read of active subscription plans (prices aren't secret) so the band
// page's Purchase tab can show the real monthly price instead of a hardcode.
export async function GET() {
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('subscription_plans')
    .select('id, name, total_price, interval_months, bands_per_cycle, discount_percent')
    .eq('is_active', true)
  if (error) return NextResponse.json({ plans: [] })
  return NextResponse.json({ plans: data ?? [] })
}
