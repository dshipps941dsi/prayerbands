import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { serviceClient } from '@/lib/org-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// Finds an existing auth user by email (Supabase admin has no direct getByEmail,
// so we page through listUsers). Bounded to keep it cheap.
async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(u => (u.email || '').toLowerCase() === target)
    if (match) return match
    if (data.users.length < 200) break
  }
  return null
}

// Completes an invite: the recipient sets a password and joins the org. Works
// whether or not they already had a Prayer Bands account on this email.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body.token || '')
  const password = String(body.password || '')
  const displayName = String(body.display_name || '').trim()

  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

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

  // Create the auth user, or attach to an existing account on this email.
  let userId: string
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  })

  if (created?.user) {
    userId = created.user.id
  } else {
    // Likely "already registered" — find the existing account and set the
    // password they just chose so they can sign in.
    const existing = await findAuthUserByEmail(admin, email).catch(() => null)
    if (!existing) {
      console.error('[accept-invite] createUser error:', createErr)
      return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
    }
    userId = existing.id
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
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
      .update({ org_id: invite.org_id, display_name: name, email })
      .eq('id', userId)
  } else {
    const masterId = 'M-' + randomBytes(4).toString('hex').toUpperCase()
    const { error: profErr } = await admin.from('profiles').insert({
      id: userId,
      master_id: masterId,
      display_name: name,
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

  // The client signs in with this email + password and lands on /org/dashboard.
  return NextResponse.json({ ok: true, email })
}
