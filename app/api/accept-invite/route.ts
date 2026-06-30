import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient } from '@/lib/org-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { findAuthUserByEmail } from '@/lib/find-auth-user'

// Completes an invite and joins the recipient to the org. Two safe paths:
//   - Brand-new email -> create the account with the password they chose.
//   - Existing account -> they must already be SIGNED IN as that email (proving
//     they own it); we only attach the org. We NEVER reset an existing account's
//     password from an invite link (that was an account-takeover vector).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  const password = String(body.password || '')
  const displayName = String(body.display_name || '').trim()

  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const admin = serviceClient()

  const { data: invite } = await admin
    .from('org_invites')
    .select('id, email, org_id, status, expires_at, display_name')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 404 })
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been used or cancelled.' }, { status: 410 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your team to send a new one.' }, { status: 410 })
  }

  const email = invite.email.toLowerCase()
  const name = displayName || invite.display_name || email.split('@')[0]

  // Who's calling? (Existing users sign in first, so they arrive authenticated.)
  const authed = await createServerClient()
  const { data: { user: sessionUser } } = await authed.auth.getUser()
  const existing = await findAuthUserByEmail(admin, email).catch(() => null)

  let userId: string
  if (existing) {
    // An account already exists — the caller must be signed in AS that account.
    if (!sessionUser || (sessionUser.email || '').toLowerCase() !== email) {
      return NextResponse.json(
        { error: 'account_exists', message: 'An account already exists for this email. Please sign in to join.' },
        { status: 409 }
      )
    }
    userId = existing.id
    // No password change. Just (re)confirm the display name on their metadata.
    await admin.auth.admin.updateUserById(userId, { user_metadata: { display_name: name } })
  } else {
    // Brand-new account — set the password they chose.
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
    if (!created?.user) {
      console.error('[accept-invite] createUser error:', createErr)
      return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
    }
    userId = created.user.id
  }

  // Upsert the profile and attach it to the org. Preserve an existing profile's
  // master_id; mint one only for brand-new profiles.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile) {
    await admin.from('profiles')
      .update({ org_id: invite.org_id, full_name: name, email })
      .eq('id', userId)
  } else {
    const masterId = 'M-' + randomBytes(4).toString('hex').toUpperCase()
    const { error: profErr } = await admin.from('profiles').insert({
      id: userId,
      master_id: masterId,
      full_name: name,
      email,
      org_id: invite.org_id,
    })
    if (profErr) {
      console.error('[accept-invite] profile insert error:', profErr)
      return NextResponse.json({ error: 'Could not finish setting up your account.' }, { status: 500 })
    }
  }

  await admin.from('org_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // mode: 'created' -> the client signs in with the new password; 'attached' ->
  // the caller was already signed in, just send them to the dashboard.
  return NextResponse.json({ ok: true, email, mode: existing ? 'attached' : 'created' })
}
