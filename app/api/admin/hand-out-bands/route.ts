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

// Bands leave the shelf for reasons other than a sale. Keeping the list closed
// means the ledger can be grouped and counted later instead of accumulating a
// dozen spellings of "gave it away".
export const HANDOUT_REASONS = ['seed', 'donation', 'gift', 'sample', 'damaged'] as const
export type HandoutReason = typeof HANDOUT_REASONS[number]

const normalizeBandId = (raw: unknown) => typeof raw === 'string' ? raw.trim().toUpperCase() : ''

// POST /api/admin/hand-out-bands
// { bandIds[], reason, recipientName?, recipientEmail?, uplineEmail?, note? }
//
// Records bands given away and takes them out of sellable stock. Every stock
// query counts status 'unregistered' with no owner and no org, so moving these
// to 'handed_out' removes them from inventory without touching the tap, claim,
// or registration flow — none of which gate on status.
export async function POST(req: NextRequest) {
  const user = await adminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reason = String(body?.reason || '').toLowerCase()
  if (!(HANDOUT_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: 'Pick a reason for these bands leaving stock.' }, { status: 400 })
  }

  const bandIds = [...new Set((Array.isArray(body?.bandIds) ? body.bandIds : []).map(normalizeBandId).filter(Boolean))] as string[]
  if (bandIds.length === 0) {
    return NextResponse.json({ error: 'Scan at least one band first.' }, { status: 400 })
  }

  const recipientName = String(body?.recipientName || '').trim() || null
  const recipientEmail = String(body?.recipientEmail || '').trim().toLowerCase() || null
  const uplineEmail = String(body?.uplineEmail || '').trim().toLowerCase() || null
  const note = String(body?.note || '').trim() || null

  const admin = createServiceClient()

  // Only bands genuinely still on the shelf — plus bands the admin has claimed
  // to their own account, which is the normal way of holding one back before
  // giving it away. Anything owned by somebody else, sold, packed into an order,
  // or already handed out stays invisible, so a band cannot be given away twice
  // or pulled out from under a paying customer.
  const { data: rows } = await admin
    .from('bands')
    .select('band_id, theme, color, size')
    .in('band_id', bandIds)
    .eq('status', 'unregistered').is('org_id', null)
    .or('owner_id.is.null,owner_id.eq.' + user.id)
  const available = (rows ?? []).map(b => b.band_id as string)
  const availableSet = new Set(available)

  const unavailable = bandIds.filter(id => !availableSet.has(id))
  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: 'Not in stock: ' + unavailable.join(', '),
        unavailable: unavailable.map(id => ({
          band_id: id,
          reason: 'Unknown band, or it is already claimed, sold, packed into an order, or handed out',
        })),
      },
      { status: 409 }
    )
  }

  // Credit may be owed to somebody with no account yet — Taylor's case. Store
  // the email regardless; the signup trigger resolves it to a user id if and
  // when they join, so the downline forms retroactively.
  let uplineUserId: string | null = null
  if (uplineEmail) {
    const { data: prof } = await admin.from('profiles').select('id').ilike('email', uplineEmail).maybeSingle()
    uplineUserId = prof?.id ?? null
  }

  const { error: updateError } = await admin
    .from('bands')
    .update({
      status: 'handed_out',
      // Ownership is released on the way out. A band you still own cannot be
      // claimed by whoever you gave it to — claim-band refuses it as "already
      // linked to another account", silently, after they have made an account.
      owner_id: null,
      upline_user_id: uplineUserId,
      upline_email: uplineEmail,
    })
    .in('band_id', available)
  if (updateError) {
    return NextResponse.json({ error: 'Could not update those bands.' }, { status: 500 })
  }

  const { error: ledgerError } = await admin.from('band_handouts').insert(
    available.map(band_id => ({
      band_id,
      reason,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      upline_user_id: uplineUserId,
      upline_email: uplineEmail,
      note,
      actor_uid: user.id,
    }))
  )
  if (ledgerError) {
    // The bands are already out of stock; failing silently here would leave them
    // gone with no record of where. Say so rather than report a clean success.
    return NextResponse.json(
      { error: 'Bands were removed from stock but the record failed to save. Note the ids: ' + available.join(', ') },
      { status: 500 }
    )
  }

  return NextResponse.json({
    handedOut: available,
    count: available.length,
    upline_linked: !!uplineUserId,
    upline_pending: !!uplineEmail && !uplineUserId,
  })
}
