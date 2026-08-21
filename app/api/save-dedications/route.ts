import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrg } from '@/lib/org-auth'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// Band IDs are stored uppercase (PB-955HQ, GCC-2VPUA). Postgres `eq` is
// case-sensitive, so a hand-typed "pb-955hq" would match nothing and — before
// the row-count checks below — report success while saving nothing.
function normalizeBandId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

// Who does the SERVER think is calling? The admin page keeps `authorized` in
// React state, so after signing in as someone else in the same browser the panel
// still renders while the cookie the server reads belongs to another account —
// or to nobody. Returning the email lets the caller see which it was instead of
// a bare "Not authorized".
async function callerEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email ?? null
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const body = await req.json()

  // ── Single-band path: from the public /dedicate page (token-gated) or the
  // admin pre-dedicate panel (adminOverride, cookie-authenticated). ──
  if (body.bandId) {
    const { token, dedication_recipient, dedication_note, adminOverride } = body
    const bandId = normalizeBandId(body.bandId)

    if (!bandId) {
      return NextResponse.json({ error: 'Enter a band ID.' }, { status: 400 })
    }

    if (adminOverride) {
      const who = await callerEmail()
      if (who !== ADMIN_EMAIL) {
        return NextResponse.json({
          error: who
            ? `Not authorized — this browser is signed in as ${who}. Sign out and sign back in as ${ADMIN_EMAIL}.`
            : 'Your admin session expired. Refresh the page and sign in again.',
        }, { status: 401 })
      }
    } else {
      const { data: band } = await supabase
        .from('bands')
        .select('dedication_token')
        .eq('band_id', bandId)
        .maybeSingle()
      if (!band || band.dedication_token !== token) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    }

    // `.select()` makes the update return the rows it touched, so a band ID
    // that matches nothing is reported as a 404 instead of a false success.
    const { data: updated, error } = await supabase
      .from('bands')
      .update({
        dedication_recipient: (dedication_recipient || '').trim() || null,
        dedication_note: (dedication_note || '').trim() || null,
        dedication_updated_at: new Date().toISOString(),
      })
      .eq('band_id', bandId)
      .select('band_id')

    if (error) {
      console.error('[save-dedications single]', error)
      return NextResponse.json({ error: 'Could not save' }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: `No band found with ID "${bandId}". Check the ID and try again.` },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, bandId })
  }

  // ── Array path: checkout/order flow (links owner + dedication). ──
  const { dedications } = body

  if (!dedications || !Array.isArray(dedications)) {
    return NextResponse.json({ error: 'Invalid dedications' }, { status: 400 })
  }

  // Owner is taken from the session, never the body, so a caller can't link a
  // band to someone else. Updates are restricted to UN-OWNED bands (owner_id is
  // null), so this can never claim or overwrite a band that already belongs to
  // someone — the original threat was an anon caller passing any band_id + uid.
  const { userId: authUserId } = await getSessionOrg()

  // Bands this call did not touch — unknown ID, already owned, or already
  // dedicated. Skipping those is deliberate (see the filters below), but the
  // caller gets told rather than seeing a bare success.
  const skipped: string[] = []

  for (const d of dedications) {
    const bandId = normalizeBandId(d.bandId)
    if (!bandId) continue
    const hasText = !!(d.recipientName?.trim() || d.note?.trim())
    if (!hasText && !authUserId) continue
    const patch: Record<string, string | null> = {}
    if (hasText) {
      patch.dedication_recipient = d.recipientName?.trim() || null
      patch.dedication_note = d.note?.trim() || null
      patch.dedication_updated_at = new Date().toISOString()
    }
    if (authUserId) patch.owner_id = authUserId
    let q = supabase.from('bands').update(patch).eq('band_id', bandId).is('owner_id', null)
    // Never clobber an existing blessing — only write a dedication where none
    // exists yet. (The /dedicate page, token-gated above, is the place to edit one.)
    if (hasText) q = q.is('dedication_note', null)
    const { data: rows, error } = await q.select('band_id')
    if (error) console.error('[save-dedications array]', bandId, error)
    if (error || !rows || rows.length === 0) skipped.push(bandId)
  }

  // Still a 200 — checkout must not fail because one band was already spoken
  // for — but the response now says what was left out.
  return NextResponse.json({ success: true, skipped })
}
