import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { getSessionOrg, serviceClient } from '@/lib/org-auth'

const INVITE_TTL_DAYS = 14
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Adds another user to the caller's org by emailing them an invite link. Any
// member of the org can invite (orgs are flat — everyone has the same access).
export async function POST(req: NextRequest) {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'You are not part of an organization.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const displayName = String(body.display_name || '').trim() || null
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const admin = serviceClient()

  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle()
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })

  // Already on the team?
  const { data: existingMember } = await admin
    .from('profiles')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', email)
    .maybeSingle()
  if (existingMember) {
    return NextResponse.json({ error: 'That person is already on your team.' }, { status: 409 })
  }

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString()

  // Refresh an existing pending invite for this email, otherwise create one.
  const { data: pending } = await admin
    .from('org_invites')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle()

  let invite
  if (pending) {
    const { data, error } = await admin
      .from('org_invites')
      .update({ token, display_name: displayName, invited_by: userId, expires_at: expiresAt, created_at: new Date().toISOString() })
      .eq('id', pending.id)
      .select('id, email, display_name, created_at, expires_at')
      .single()
    if (error) {
      console.error('[org-invite] refresh error:', error)
      return NextResponse.json({ error: 'Could not send the invite.' }, { status: 500 })
    }
    invite = data
  } else {
    const { data, error } = await admin
      .from('org_invites')
      .insert({ org_id: orgId, email, token, display_name: displayName, invited_by: userId, expires_at: expiresAt })
      .select('id, email, display_name, created_at, expires_at')
      .single()
    if (error) {
      console.error('[org-invite] insert error:', error)
      return NextResponse.json({ error: 'Could not send the invite.' }, { status: 500 })
    }
    invite = data
  }

  const acceptUrl = `${req.nextUrl.origin}/accept-invite?token=${encodeURIComponent(token)}`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'PrayerBands <bands@prayerbands.com>',
      to: [email],
      subject: `✝ You're invited to join ${org.name} on PrayerBands`,
      html: `
        <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
          <div style="background:#0A1628;padding:32px;text-align:center">
            <div style="font-size:36px;color:#C8A96E;margin-bottom:8px">✝</div>
            <h1 style="font-size:22px;color:#F5EDD8;margin:0;font-weight:400">You're invited to ${org.name}</h1>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 24px">
              You've been invited to help manage <strong>${org.name}</strong>'s ministry dashboard on PrayerBands.
              Set a password to join the team and start tracking bands, prayers, and orders. ✝
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${acceptUrl}" style="display:inline-block;background:#C8A96E;color:#0A1628;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                Accept Invitation ✝
              </a>
            </div>
            <p style="font-size:13px;color:#8896a8;text-align:center;margin:0">
              This invite expires in ${INVITE_TTL_DAYS} days. If you weren't expecting it, you can ignore this email.
            </p>
          </div>
          <div style="background:#f0f4f8;padding:16px;text-align:center;border-top:1px solid #e2eaf4">
            <p style="font-size:12px;color:#8896a8;margin:0">
              ✝ PrayerBands.com · Questions? <a href="mailto:support@prayerbands.com" style="color:#9A7A35">support@prayerbands.com</a>
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('[org-invite] email send failed:', err)
    return NextResponse.json({ error: 'Invite saved but the email could not be sent. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ invite })
}

// Revoke a pending invite. Scoped to the caller's org so you can only cancel
// invites for your own team.
export async function DELETE(req: NextRequest) {
  const { userId, orgId } = await getSessionOrg()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'You are not part of an organization.' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing invite id.' }, { status: 400 })

  const admin = serviceClient()
  const { error } = await admin
    .from('org_invites')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('org_id', orgId)
    .eq('status', 'pending')
  if (error) {
    console.error('[org-invite] revoke error:', error)
    return NextResponse.json({ error: 'Could not cancel the invite.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
