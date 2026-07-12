import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// POST /api/link-purchased-bands
// Backfill for guest / later-created accounts: link any bands from this user's
// past orders (matched by the order email) to their account, so purchases made
// before they had an account still show up in their dashboard reach and can be
// dedicated. Idempotent and safe to call on every dashboard load — it only
// touches still-unowned bands and no-ops once everything is linked.
export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()

  // Orders placed with this account's email that have bands assigned to them.
  const { data: orders } = await admin
    .from('orders')
    .select('assigned_band_ids')
    .ilike('customer_email', user.email)
    .not('assigned_band_ids', 'is', null)

  const bandIds = Array.from(new Set(
    (orders ?? []).flatMap((o: any) => Array.isArray(o.assigned_band_ids) ? o.assigned_band_ids : [])
  )).filter(Boolean)

  if (bandIds.length === 0) return NextResponse.json({ linked: 0 })

  // Only claim bands that nobody owns yet — never reassign a band already linked
  // to another account.
  const { data: linked, error } = await admin
    .from('bands')
    .update({ owner_id: user.id })
    .in('band_id', bandIds)
    .is('owner_id', null)
    .select('band_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ linked: (linked ?? []).length })
}
