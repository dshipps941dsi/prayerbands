import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Subscriber sets the gift dedication for their NEXT (pending) shipment.
// Editable until the shipment leaves 'pending' (i.e. until an admin fulfills it).
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await authed.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: ship } = await admin
    .from('subscription_shipments')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!ship) return NextResponse.json({ error: 'No pending shipment to edit.' }, { status: 404 })

  const { data: updated, error } = await admin
    .from('subscription_shipments')
    .update({
      dedication_recipient: (body.dedication_recipient || '').trim() || null,
      dedication_note: (body.dedication_note || '').trim() || null,
    })
    .eq('id', ship.id)
    .select('*')
    .single()

  if (error) {
    console.error('[my-shipment-note]', error)
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  }

  return NextResponse.json({ shipment: updated })
}
