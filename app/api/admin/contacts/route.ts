import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

  if (action === 'faq_publish') {
    const { error } = await admin.from('faq_entries').update({ published: body.published }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
