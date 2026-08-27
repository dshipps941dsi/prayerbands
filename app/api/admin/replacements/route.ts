import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// GET — orders flagged as a replacement (order_metadata.replaces set) that
// haven't been completed yet.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = createServiceClient()
  const { data, error } = await admin
    .from('orders')
    .select('id, customer_email, order_metadata, created_at')
    .not('order_metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const pending = (data ?? [])
    .filter((o: any) => o.order_metadata?.replaces && !o.order_metadata?.replacement_done)
    .map((o: any) => ({
      order_id: o.id,
      email: o.customer_email,
      replaces: o.order_metadata.replaces,
      created_at: o.created_at,
    }))
  return NextResponse.json({ pending })
}

// POST { order_id, new_band_id } — finish a replacement: carry the lost band's
// owner + theme + prayer journey onto the shipped band, retire the old band,
// and mark the order done.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const orderId = body.order_id
  const newId = String(body.new_band_id || '').trim().toUpperCase()
  if (!orderId || !newId) {
    return NextResponse.json({ error: 'order_id and new_band_id are required' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: order } = await admin
    .from('orders')
    .select('id, order_metadata')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const oldId = String(order.order_metadata?.replaces || '').trim().toUpperCase()
  if (!oldId) return NextResponse.json({ error: 'This order is not a replacement.' }, { status: 400 })
  if (oldId === newId) return NextResponse.json({ error: 'New band must differ from the lost one.' }, { status: 400 })

  const { data: oldBand } = await admin.from('bands').select('id, owner_id, theme').eq('band_id', oldId).maybeSingle()
  const { data: newBand } = await admin.from('bands').select('id, owner_id').eq('band_id', newId).maybeSingle()
  if (!oldBand) return NextResponse.json({ error: `Lost band ${oldId} not found` }, { status: 404 })
  if (!newBand) return NextResponse.json({ error: `New band ${newId} not found` }, { status: 404 })
  if (newBand.owner_id && newBand.owner_id !== oldBand.owner_id) {
    return NextResponse.json({ error: `Band ${newId} is already linked to another account` }, { status: 409 })
  }

  // New band inherits owner + theme; carry the journey; retire the old band.
  await admin.from('bands').update({ owner_id: oldBand.owner_id, theme: oldBand.theme ?? 'default', status: 'registered' }).eq('id', newBand.id)
  const { data: moved } = await admin.from('registrations').update({ band_id: newId }).eq('band_id', oldId).select('id')
  const { error: retireErr } = await admin
    .from('bands')
    .update({ status: 'replaced', owner_id: null })
    .eq('id', oldBand.id)
  if (retireErr) {
    console.error('[replacements] retire old band error:', retireErr)
    return NextResponse.json({ error: 'Replacement saved, but the old band could not be retired.' }, { status: 500 })
  }

  // Mark the order done so it leaves the queue.
  await admin
    .from('orders')
    .update({ order_metadata: { ...order.order_metadata, replacement_done: newId } })
    .eq('id', orderId)

  return NextResponse.json({ success: true, movedRegistrations: (moved ?? []).length, oldBandId: oldId, newBandId: newId })
}
