import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// RLS blocks the anon/browser client from reading or writing contact_submissions
// and faq_entries, so the admin UI must go through this service-role route.
async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const authed = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authed.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// GET ?status=new -> { submissions (filtered by status), faqEntries (all) }
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = svc()
  const status = req.nextUrl.searchParams.get('status') || 'new'

  const [subRes, faqRes] = await Promise.all([
    admin.from('contact_submissions').select('*').eq('status', status).order('created_at', { ascending: false }).limit(50),
    admin.from('faq_entries').select('*').order('sort_order', { ascending: true }),
  ])

  return NextResponse.json({ submissions: subRes.data || [], faqEntries: faqRes.data || [] })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = svc()
  const body = await req.json()
  const { action } = body

  if (action === 'submission_status') {
    const { error } = await admin.from('contact_submissions').update({ status: body.status }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'reply') {
    const to = (body.to || '').trim()
    const message = (body.message || '').trim()
    if (!to || !message) return NextResponse.json({ error: 'Recipient and message are required.' }, { status: 400 })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const adminEmail = process.env.ADMIN_EMAIL || 'david@prayerbands.com'
    const subject = (body.subject && body.subject.trim()) || 'Re: your message to Prayer Bands'
    const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

    try {
      const { error } = await resend.emails.send({
        from: 'Prayer Bands <bands@prayerbands.com>',
        to: [to],
        replyTo: adminEmail,
        subject,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a1f0e">
            <div style="background:#0A1628;padding:24px 28px;text-align:center;border-radius:10px 10px 0 0">
              <div style="font-size:26px;color:#C8A96E">✝</div>
              <div style="color:#F5EDD8;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px">Prayer Bands</div>
            </div>
            <div style="background:#fffdf7;border:1px solid #e8d8b0;border-top:none;border-radius:0 0 10px 10px;padding:28px">
              <p style="font-size:15px;line-height:1.7;color:#2a3344;margin:0">${safe}</p>
              <hr style="border:none;border-top:1px solid #e8d8b0;margin:22px 0">
              <p style="font-size:12px;color:#a0937a;margin:0">You can reply directly to this email and it will reach our team.</p>
            </div>
          </div>`,
      })
      if (error) return NextResponse.json({ error: (error as any).message || 'Send failed.' }, { status: 500 })
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Send failed.' }, { status: 500 })
    }

    // Replying moves the thread along: mark in-progress if it was still new.
    if (body.id) await admin.from('contact_submissions').update({ status: 'in_progress' }).eq('id', body.id).eq('status', 'new')
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_submission') {
    const { error } = await admin.from('contact_submissions').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'faq_candidate') {
    const { error } = await admin.from('contact_submissions').update({ faq_candidate: body.value }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'promote') {
    const s = body.submission
    const { data, error } = await admin.from('faq_entries').insert({
      question: s.subject || (s.message || '').slice(0, 100),
      answer: '',
      category: s.category || 'general',
      published: false,
      source_submission_id: s.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  if (action === 'faq_create') {
    const { data, error } = await admin.from('faq_entries').insert({
      question: body.question, answer: body.answer, category: body.category,
      published: false, sort_order: 100,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }

  if (action === 'faq_update') {
    const e = body.entry
    const { error } = await admin.from('faq_entries').update({
      question: e.question, answer: e.answer, category: e.category,
      published: e.published, sort_order: e.sort_order,
    }).eq('id', e.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'faq_delete') {
    const { error } = await admin.from('faq_entries').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'faq_publish') {
    const { error } = await admin.from('faq_entries').update({ published: body.published }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
