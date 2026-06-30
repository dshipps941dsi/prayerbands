import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsub } from '@/lib/unsub'

// Records a prayer-email opt-out. Reads e/s/t from the query string so it serves
// both the confirmation page's fetch AND a mail client's RFC 8058 one-click POST
// (List-Unsubscribe-Post). The token (HMAC of email+scope) proves the link came
// from us, so nobody can opt out an address they don't control.
async function record(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get('e') || '').trim().toLowerCase()
  const scope = (searchParams.get('s') || '').trim() // 'all' or a sender user id
  const token = (searchParams.get('t') || '').trim()

  if (!email || !scope || !verifyUnsub(email, scope, token)) {
    return NextResponse.json({ error: 'This unsubscribe link is invalid or expired.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const senderUserId = scope === 'all' ? null : scope
  // Idempotent — ignore a duplicate opt-out (unique index on email+sender).
  const { error } = await admin
    .from('prayer_email_optouts')
    .upsert(
      { email, sender_user_id: senderUserId },
      { onConflict: 'email,sender_user_id', ignoreDuplicates: true }
    )
  if (error) {
    console.error('[unsubscribe] insert error:', error)
    return NextResponse.json({ error: 'Could not record your request. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, scope: scope === 'all' ? 'all' : 'sender' })
}

export async function POST(req: NextRequest) {
  return record(req)
}

// A human clicking the List-Unsubscribe header link (not one-click) lands here
// via GET — send them to the confirmation page rather than acting silently.
export async function GET(req: NextRequest) {
  const { search } = new URL(req.url)
  return NextResponse.redirect(new URL(`/unsubscribe${search}`, req.url))
}
