import { NextRequest, NextResponse } from 'next/server'
import { isTeamAdmin } from '@/lib/team'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureReferralCode } from '@/lib/referral'
import { sendEmail, FROM_BANDS } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'

// Ministry applications: the public form writes them (app/api/onboard); an
// admin reviews them here. Approving is the only thing that creates a church
// account, and it does so by invitation — the pastor gets a link to set their
// own password, so no password ever passes through a public form.

const SITE = process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://prayerbands.com'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (await isTeamAdmin(user)) ? user : null
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('org_applications')
    .select('id, name, prefix, subdomain, location, website, pastor, email, status, note, org_id, reviewed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const action = body.action === 'approve' ? 'approve' : body.action === 'decline' ? 'decline' : null
  const note = String(body.note || '').trim().slice(0, 500) || null
  if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })

  const svc = createServiceClient()
  const { data: app } = await svc.from('org_applications').select('*').eq('id', id).maybeSingle()
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (app.status !== 'pending') return NextResponse.json({ error: `Already ${app.status}.` }, { status: 409 })

  const now = new Date().toISOString()
  const eName = escapeHtml(app.name)
  const ePastor = escapeHtml(app.pastor)
  const first = escapeHtml(String(app.pastor).trim().split(/\s+/)[0] || 'there')

  if (action === 'decline') {
    await svc.from('org_applications').update({ status: 'declined', note, reviewed_by: user.id, reviewed_at: now }).eq('id', id)
    await sendEmail({
      from: FROM_BANDS,
      to: [app.email],
      subject: `About your Prayer Bands ministry application — ${app.name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#2A3344;line-height:1.7">
          <p style="font-size:16px">Hi ${first},</p>
          <p style="font-size:16px">Thank you for applying to bring Prayer Bands to <strong>${eName}</strong>. We review every ministry by hand, and we&rsquo;re not able to set up an account for this one right now.${note ? `</p><p style="font-size:16px;font-style:italic;color:#4a5568">${escapeHtml(note)}` : ''}</p>
          <p style="font-size:16px">If you think we&rsquo;ve missed something, just reply to this email &mdash; it reaches a person.</p>
          <p style="font-size:14px;color:#6b7280;margin-top:24px">Prayer Bands &middot; hello@prayerbands.com</p>
        </div>`,
    })
    return NextResponse.json({ ok: true, status: 'declined' })
  }

  // ── Approve: the prefix/subdomain must still be free, then invite + create ──
  const prefix = String(app.prefix).toUpperCase()
  const subdomain = String(app.subdomain).toLowerCase()
  const [{ data: p1 }, { data: p2 }] = await Promise.all([
    svc.from('organizations').select('id').eq('prefix', prefix).maybeSingle(),
    svc.from('organizations').select('id').eq('subdomain', subdomain).maybeSingle(),
  ])
  if (p1 || p2) return NextResponse.json({ error: `The prefix ${prefix} or subdomain ${subdomain} is already taken. Edit the application in the database or decline it.` }, { status: 409 })

  // Invite link: creates the (unconfirmed) account and gives us a one-time
  // link that signs the pastor in and lands them on "set your password".
  const { data: invite, error: inviteErr } = await svc.auth.admin.generateLink({
    type: 'invite',
    email: app.email,
    options: {
      data: { display_name: app.pastor, full_name: app.pastor },
      redirectTo: `${SITE}/auth/callback?next=${encodeURIComponent('/reset-password/confirm?welcome=ministry')}`,
    },
  })
  if (inviteErr || !invite?.user) {
    // Most often: an account with this email already exists. Say so plainly
    // rather than half-creating an org for nobody.
    return NextResponse.json({ error: inviteErr?.message || 'Could not create the invitation.' }, { status: 500 })
  }
  const userId = invite.user.id
  const actionLink = (invite as any).properties?.action_link as string | undefined

  // The signup trigger normally creates the profile; make sure the fields we
  // know are on it either way.
  const masterId = 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  const { data: existingProfile } = await svc.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (existingProfile) await svc.from('profiles').update({ full_name: app.pastor, email: app.email }).eq('id', userId)
  else await svc.from('profiles').insert({ id: userId, master_id: masterId, full_name: app.pastor, email: app.email })
  await ensureReferralCode(svc, userId)

  const { data: org, error: orgErr } = await svc
    .from('organizations')
    .insert({ name: app.name, prefix, subdomain, location: app.location || null, website: app.website || null, admin_id: userId, plan: 'ministry' })
    .select()
    .single()
  if (orgErr || !org) return NextResponse.json({ error: orgErr?.message || 'Could not create the organization.' }, { status: 500 })
  await svc.from('profiles').update({ org_id: org.id }).eq('id', userId)
  await svc.from('org_applications').update({ status: 'approved', note, org_id: org.id, reviewed_by: user.id, reviewed_at: now }).eq('id', id)

  const mail = await sendEmail({
    from: FROM_BANDS,
    to: [app.email],
    subject: `✝ ${app.name} is approved — set up your Prayer Bands ministry account`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
        <div style="background:#0d3d6e;padding:32px;text-align:center">
          <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
          <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Welcome, ${eName}</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">Your ministry account is approved</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">Hi ${ePastor} &mdash; we&rsquo;ve reviewed your application and set up <strong>${eName}</strong> on Prayer Bands. Your bands will carry the prefix <strong style="font-family:monospace">${escapeHtml(prefix)}-XXXXX</strong> and your church page lives at <strong>${escapeHtml(subdomain)}.prayerbands.com</strong>.</p>
          <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 24px">One step left: choose a password. This link signs you in and asks for it.</p>
          <div style="text-align:center;margin:0 0 24px">
            ${actionLink ? `<a href="${actionLink}" style="display:inline-block;background:#0d3d6e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;font-family:Georgia,serif">Set my password &rarr;</a>` : `<a href="${SITE}/reset-password" style="display:inline-block;background:#0d3d6e;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;font-family:Georgia,serif">Set my password &rarr;</a>`}
          </div>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0">The link works once and expires in a day. If it has expired, use &ldquo;Forgot your password&rdquo; on the sign-in page with this email address. Reply to this email and a person answers.</p>
        </div>
      </div>`,
  })

  return NextResponse.json({ ok: true, status: 'approved', orgId: org.id, emailed: mail.ok })
}
