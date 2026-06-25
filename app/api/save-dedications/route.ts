import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrg } from '@/lib/org-auth'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// Is the current caller signed in as the admin? Used to allow the admin panel
// to pre-dedicate any band without the per-band token.
async function callerIsAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email === ADMIN_EMAIL
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
    const { bandId, token, dedication_recipient, dedication_note, adminOverride } = body

    if (adminOverride) {
      if (!(await callerIsAdmin())) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
      }
    } else {
      const { data: band } = await supabase
        .from('bands')
        .select('dedication_token')
        .eq('band_id', bandId)
        .single()
      if (!band || band.dedication_token !== token) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    }

    const { error } = await supabase
      .from('bands')
      .update({
        dedication_recipient: (dedication_recipient || '').trim() || null,
        dedication_note: (dedication_note || '').trim() || null,
      })
      .eq('band_id', bandId)

    if (error) {
      console.error('[save-dedications single]', error)
      return NextResponse.json({ error: 'Could not save' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
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

  for (const d of dedications) {
    if (!d.bandId) continue
    const hasText = !!(d.recipientName?.trim() || d.note?.trim())
    if (!hasText && !authUserId) continue
    const patch: Record<string, string | null> = {}
    if (hasText) {
      patch.dedication_recipient = d.recipientName?.trim() || null
      patch.dedication_note = d.note?.trim() || null
    }
    if (authUserId) patch.owner_id = authUserId
    await supabase.from('bands').update(patch).eq('band_id', d.bandId).is('owner_id', null)
  }

  return NextResponse.json({ success: true })
}
