import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isTeamAdmin(user)
}

// POST { old_band_id, new_band_id }
// Replace a lost/damaged band with a new physical band, preserving continuity:
//   - the new band inherits the old band's owner + theme
//   - the prayer journey (registrations) is moved onto the new band
//   - the old band is retired (status 'replaced', owner cleared) so it drops
//     out of the owner's dashboard and can't be tapped into anymore.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const oldId = String(body.old_band_id || '').trim().toUpperCase()
  const newId = String(body.new_band_id || '').trim().toUpperCase()

  if (!oldId || !newId) {
    return NextResponse.json({ error: 'old_band_id and new_band_id are required' }, { status: 400 })
  }
  if (oldId === newId) {
    return NextResponse.json({ error: 'Old and new band IDs must differ' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: oldBand } = await admin
    .from('bands')
    .select('id, band_id, owner_id, theme')
    .eq('band_id', oldId)
    .maybeSingle()
  const { data: newBand } = await admin
    .from('bands')
    .select('id, band_id, owner_id')
    .eq('band_id', newId)
    .maybeSingle()

  if (!oldBand) return NextResponse.json({ error: `Old band ${oldId} not found` }, { status: 404 })
  if (!newBand) return NextResponse.json({ error: `New band ${newId} not found` }, { status: 404 })
  if (newBand.owner_id) {
    return NextResponse.json({ error: `New band ${newId} is already linked to an account` }, { status: 409 })
  }

  // 1. New band inherits owner + theme, and is considered registered (it carries history).
  const { error: newErr } = await admin
    .from('bands')
    .update({ owner_id: oldBand.owner_id, theme: oldBand.theme ?? 'default', status: 'registered' })
    .eq('id', newBand.id)
  if (newErr) {
    console.error('[replace-band] new band update error:', newErr)
    return NextResponse.json({ error: 'Could not update the new band.' }, { status: 500 })
  }

  // 2. Move the prayer journey onto the new band.
  const { data: moved, error: regErr } = await admin
    .from('registrations')
    .update({ band_id: newId })
    .eq('band_id', oldId)
    .select('id')
  if (regErr) {
    console.error('[replace-band] registration move error:', regErr)
    return NextResponse.json({ error: 'Could not move the prayer history.' }, { status: 500 })
  }

  // 3. Retire the old band.
  const { error: oldErr } = await admin
    .from('bands')
    .update({ status: 'replaced', owner_id: null })
    .eq('id', oldBand.id)
  if (oldErr) {
    console.error('[replace-band] retire old band error:', oldErr)
    return NextResponse.json({ error: 'Replacement saved, but failed to retire the old band.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    movedRegistrations: (moved ?? []).length,
    newBandId: newId,
    oldBandId: oldId,
  })
}
