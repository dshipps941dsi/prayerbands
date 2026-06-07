import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Public read of editable pricing (cents) from site_config, for the store page.
// Prices are not secret, so this needs no auth; service role bypasses any RLS.
export async function GET() {
  const admin = createServiceClient()
  const { data, error } = await admin.from('site_config').select('key, value')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const pricing: Record<string, number> = {}
  for (const row of data ?? []) {
    const n = Number(row.value)
    if (!Number.isNaN(n)) pricing[row.key] = n
  }
  return NextResponse.json({ pricing })
}
