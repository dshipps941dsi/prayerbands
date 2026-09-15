import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/escape-html'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail, FROM_BANDS } from '@/lib/email'
import { sendPush } from '@/lib/push'

// Ministry sign-up: an APPLICATION, not an account.
//
// This used to create a confirmed auth user (with a password typed into a
// public form) and a ministry org on the spot — which meant anyone could
// register any email address with a password they chose, and mint free
// ministry orgs. Now the form writes an application, the team is told, and
// an admin approves it from Admin → Churches. Approval creates the org and
// invites the pastor to set their own password.

const SITE = process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://prayerbands.com'

export async function POST(req: NextRequest) {
  try {
    if (!(await checkRateLimit(`onboard:ip:${getClientIp(req)}`, 3, 3600))) {
      return NextResponse.json({ error: 'Too many sign-ups from this connection. Please try again later.' }, { status: 429 })
    }
    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 120)
    const prefix = String(body.prefix || '').trim().toUpperCase().slice(0, 12)
    const subdomain = String(body.subdomain || '').trim().toLowerCase().slice(0, 40)
    const location = String(body.location || '').trim().slice(0, 120) || null
    const website = String(body.website || '').trim().slice(0, 200) || null
    const pastor = String(body.pastor || '').trim().slice(0, 80)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 254)

    if (!name || !prefix || !subdomain || !pastor || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 })
    }
    if (!/^[A-Z0-9]{2,12}$/.test(prefix) || !/^[a-z0-9-]{2,40}$/.test(subdomain)) {
      return NextResponse.json({ error: 'Please pick a simpler church name — letters and numbers only.' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Taken already, or already applied for: say so now, not at approval.
    const [{ data: p1 }, { data: p2 }, { data: pendingSame }] = await Promise.all([
      svc.from('organizations').select('id').eq('prefix', prefix).maybeSingle(),
      svc.from('organizations').select('id').eq('subdomain', subdomain).maybeSingle(),
      svc.from('org_applications').select('id').eq('status', 'pending').or(`email.eq.${email},prefix.eq.${prefix},subdomain.eq.${subdomain}`).limit(1).maybeSingle(),
    ])
    if (p1 || p2) {
      return NextResponse.json({ error: 'A church with a similar name already exists. Please contact hello@prayerbands.com.' }, { status: 409 })
    }
    if (pendingSame) {
      return NextResponse.json({ error: 'We already have an application for this church or email. We review by hand and will be in touch within a day.' }, { status: 409 })
    }

    const { data: app, error } = await svc
      .from('org_applications')
      .insert({ name, prefix, subdomain, location, website, pastor, email })
      .select('id')
      .single()
    if (error || !app) return NextResponse.json({ error: 'Could not save your application. Please try again.' }, { status: 500 })

    const eName = escapeHtml(name), ePastor = escapeHtml(pastor), eEmail = escapeHtml(email)
    const first = escapeHtml(pastor.split(/\s+/)[0] || 'there')

    // Tell the applicant what happens next.
    await sendEmail({
      from: FROM_BANDS,
      to: [email],
      subject: `We received your Prayer Bands ministry application — ${name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:28px;color:#2A3344;line-height:1.7">
          <p style="font-size:16px">Hi ${first},</p>
          <p style="font-size:16px">Thanks for applying to bring Prayer Bands to <strong>${eName}</strong>. We review every ministry by hand, and you&rsquo;ll hear from us within a day. When it&rsquo;s approved you&rsquo;ll get a link to set your password and open your church dashboard.</p>
          <p style="font-size:16px">Questions in the meantime? Just reply &mdash; this email reaches a person.</p>
          <p style="font-size:14px;color:#6b7280;margin-top:24px">Prayer Bands &middot; hello@prayerbands.com</p>
        </div>`,
    })

    // Tell the team.
    const { data: admins } = await svc.from('profiles').select('id, email').eq('team_role', 'admin')
    const adminIds = (admins || []).map((a: any) => a.id)
    const adminEmails = (admins || []).map((a: any) => a.email).filter(Boolean)
    await sendPush(adminIds, {
      title: `Ministry application: ${name}`,
      body: `${pastor} · ${email}${location ? ` · ${location}` : ''}. Approve or decline in Admin → Churches.`,
      url: '/admin/orgs',
      tag: `org-app-${app.id}`,
    })
    if (adminEmails.length) {
      await sendEmail({
        from: FROM_BANDS,
        to: adminEmails,
        subject: `✝ Ministry application — ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2A3344;line-height:1.6">
            <h2 style="color:#0d3d6e;margin:0 0 12px">New ministry application</h2>
            <p><strong>Church:</strong> ${eName}</p>
            <p><strong>Contact:</strong> ${ePastor} &middot; ${eEmail}</p>
            ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ''}
            ${website ? `<p><strong>Website:</strong> ${escapeHtml(website)}</p>` : ''}
            <p><strong>Proposed prefix:</strong> <code>${escapeHtml(prefix)}-XXXXX</code> &middot; <strong>subdomain:</strong> <code>${escapeHtml(subdomain)}.prayerbands.com</code></p>
            <p style="margin-top:20px"><a href="${SITE}/admin/orgs" style="background:#0d3d6e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Review in Admin &rarr;</a></p>
          </div>`,
      })
    }

    return NextResponse.json({ ok: true, pending: true })
  } catch (err: any) {
    console.error('[onboard] error:', err)
    return NextResponse.json({ error: err?.message || 'Something went wrong' }, { status: 500 })
  }
}
