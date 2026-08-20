import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/report-prayer { id, reason? }
//
// The prayer wall's Report button used to PATCH `registrations` straight from
// the browser. There is no update policy on that table, so RLS matched zero
// rows and PostgREST returned an empty array — no error. The wall read that as
// success, removed the prayer from the reader's own view, and showed a
// thank-you toast, while nothing was ever flagged for review. Verified against
// production: the request came back [].
//
// Moderation belongs on the server regardless — an update policy permissive
// enough for an anonymous reporter would let anyone edit anyone's prayer.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Which prayer?' }, { status: 400 })
  }
  const reason = String(body?.reason || '').trim().slice(0, 500) || 'Reported by a reader'

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('registrations')
    .update({ flagged: true, flagged_reason: reason })
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[report-prayer] error:', error)
    return NextResponse.json({ error: 'Could not report that prayer.' }, { status: 500 })
  }
  // A zero-row update is not an error in Postgres. Saying so is the whole
  // reason this route exists.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'That prayer is no longer on the wall.' }, { status: 404 })
  }

  return NextResponse.json({ reported: true })
}
