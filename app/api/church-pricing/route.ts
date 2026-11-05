import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { loadChurchTiers } from '@/lib/church-pricing-load'

// Church quantity pricing for the order form on the church dashboard. Public
// and read-only: these are the prices a church is shown before it orders.
// Edited in Admin > Pricing.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { tiers } = await loadChurchTiers(createServiceClient())
    return NextResponse.json({ tiers })
  } catch (err) {
    console.error('[church-pricing] load failed:', err)
    return NextResponse.json({ error: 'Pricing could not be loaded.' }, { status: 500 })
  }
}
