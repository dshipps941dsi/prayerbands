import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isFlaggable, AUTO_FLAG_REASON } from '@/lib/moderation'

// Change, or add, the prayer on one of your own stops in a band's journey.
// Many people leave it blank in the moment and want to come back to it. The
// same prayer feeds the public wall, so the same language check applies.
//
// PATCH { registration_id, prayer }
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const id = Number(body.registration_id)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'registration_id is required' }, { status: 400 })
    const prayer = String(body.prayer ?? '').trim().slice(0, 2000) || null

    const admin = createServiceClient()
    const { data: reg } = await admin.from('registrations').select('id, user_id, source, flagged').eq('id', id).maybeSingle()
    if (!reg) return NextResponse.json({ error: 'Stop not found' }, { status: 404 })
    if (reg.user_id !== user.id) return NextResponse.json({ error: 'This stop is not yours to change' }, { status: 403 })
    if (reg.source === 'wall') return NextResponse.json({ error: 'Wall prayers cannot be edited' }, { status: 400 })

    // A reworded prayer is re-checked. A prayer already held for review stays
    // held; a clean edit does not un-flag it, only an admin does.
    const flag = isFlaggable(prayer)
    const updates: Record<string, unknown> = { prayer }
    if (flag && !reg.flagged) { updates.flagged = true; updates.flagged_reason = AUTO_FLAG_REASON }

    const { error } = await admin.from('registrations').update(updates).eq('id', id)
    if (error) {
      console.error('[my-stop] update error:', error)
      return NextResponse.json({ error: 'Could not save your prayer' }, { status: 500 })
    }
    return NextResponse.json({ success: true, prayer, held: !!(flag || reg.flagged) })
  } catch (err) {
    console.error('[my-stop] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
