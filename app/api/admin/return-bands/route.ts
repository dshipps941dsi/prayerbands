import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team';
import { createClient, createServiceClient } from '@/lib/supabase/server'

// TODO(stage 2): replace with a profiles.role check.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

async function adminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (await isTeamAdmin(user)) ? user : null
}

const normalizeBandId = (raw: unknown) => typeof raw === 'string' ? raw.trim().toUpperCase() : ''

// POST /api/admin/return-bands { bandIds[], note? }
//
// The reverse of a handout: put a band back on the sellable shelf. A giveaway
// that did not happen, a sample that came back, a band marked out by mistake.
//
// A band that has ever been TAPPED is refused, whatever its status. Its
// registrations are somebody's stops and prayers, and putting it back in stock
// means posting that person's journey to the next customer who orders that
// design. There is no undo for that, so it is not offered.
export async function POST(req: NextRequest) {
  const user = await adminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const note = String(body?.note || '').trim() || null

  const bandIds = [...new Set((Array.isArray(body?.bandIds) ? body.bandIds : []).map(normalizeBandId).filter(Boolean))] as string[]
  if (bandIds.length === 0) {
    return NextResponse.json({ error: 'Scan at least one band first.' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: rows, error: readError } = await admin
    .from('bands')
    .select('band_id, status, owner_id, org_id, dedication_recipient, dedication_note')
    .in('band_id', bandIds)
  if (readError) {
    return NextResponse.json({ error: 'Could not read those bands.' }, { status: 500 })
  }
  const found = new Map((rows ?? []).map(b => [b.band_id as string, b]))

  // Which of these have ever been tapped. One query, not one per band.
  const { data: regRows, error: regError } = await admin
    .from('registrations')
    .select('band_id')
    .in('band_id', bandIds)
  if (regError) {
    return NextResponse.json({ error: 'Could not check band history.' }, { status: 500 })
  }
  const tapped = new Set((regRows ?? []).map(r => r.band_id as string))

  const returnable: string[] = []
  const alreadyInStock: string[] = []
  const refused: { band_id: string; reason: string }[] = []

  for (const id of bandIds) {
    const b = found.get(id)
    if (!b) { refused.push({ band_id: id, reason: 'Not a known band ID' }); continue }
    if (b.org_id) { refused.push({ band_id: id, reason: 'Church stock — belongs to an organisation, not the shelf' }); continue }
    if (tapped.has(id)) { refused.push({ band_id: id, reason: 'Already carried — it has prayers on it and cannot go back in stock' }); continue }
    if (b.status === 'registered' || b.status === 'pending_transfer') {
      refused.push({ band_id: id, reason: 'In circulation with someone' }); continue
    }
    if (b.status === 'unregistered' && !b.owner_id) { alreadyInStock.push(id); continue }
    returnable.push(id)
  }

  if (returnable.length === 0) {
    return NextResponse.json(
      {
        error: alreadyInStock.length && !refused.length
          ? 'Already in stock: ' + alreadyInStock.join(', ')
          : 'Nothing could be returned. ' + refused.map(r => `${r.band_id}: ${r.reason}`).join('; '),
        refused,
        alreadyInStock,
      },
      { status: 409 }
    )
  }

  // A dedication names a person. Back on the shelf the band can be picked for
  // any order, so the message would reach a stranger — the exact way PB-L7U8Q
  // ended up sellable with a message written for someone's daughter on it.
  // Cleared here, and named in the response so it is not a silent deletion.
  const clearedDedications = returnable
    .map(id => found.get(id))
    .filter(b => b && (String(b.dedication_note ?? '').trim() || String(b.dedication_recipient ?? '').trim()))
    .map(b => ({ band_id: b!.band_id as string, recipient: (b!.dedication_recipient as string) || '(no name)' }))

  const { data: updated, error: updateError } = await admin
    .from('bands')
    .update({
      status: 'unregistered',
      owner_id: null,
      // Back on the shelf there is no giver yet, so the credit is cleared with
      // it. Leaving it would attribute the next person's band to whoever this
      // one was originally meant for.
      upline_user_id: null,
      upline_email: null,
      dedication_recipient: null,
      dedication_note: null,
      dedication_viewed: false,
    })
    .in('band_id', returnable)
    .select('band_id')

  // A write that matches nothing returns no error. Check the rows.
  if (updateError || !updated || updated.length !== returnable.length) {
    return NextResponse.json(
      { error: updateError?.message || `Only ${updated?.length ?? 0} of ${returnable.length} bands could be returned.` },
      { status: 500 }
    )
  }

  const { error: ledgerError } = await admin.from('band_handouts').insert(
    returnable.map(band_id => ({
      band_id,
      direction: 'in',
      reason: 'returned',
      note,
      actor_uid: user.id,
    }))
  )
  if (ledgerError) {
    // The bands are already back in stock; saying "saved" would hide the gap
    // between what the shelf says and what the ledger can explain.
    return NextResponse.json(
      { error: 'Bands were returned to stock but the record failed to save. Note the ids: ' + returnable.join(', ') },
      { status: 500 }
    )
  }

  return NextResponse.json({
    returned: returnable,
    count: returnable.length,
    alreadyInStock,
    refused,
    clearedDedications,
  })
}
