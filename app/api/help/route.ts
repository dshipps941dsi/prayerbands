import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// The help assistant. It answers from content/help-guide.md and the published
// FAQ, nothing else: it cannot see orders, accounts, or prayers. Every
// question and answer is logged so the FAQ can grow from what people ask.

const MODEL = 'claude-haiku-4-5-20251001'

// Pages the assistant may send someone to. Anything else it suggests is dropped.
const ALLOWED_LINKS = new Set([
  '/', '/store', '/subscribe', '/how-it-works', '/faq', '/contact', '/signin', '/register',
  '/prayer-wall', '/verse', '/blog', '/privacy', '/my-band', '/my-band?tab=account',
  '/my-band?open=requests', '/my-band?open=partners', '/my-band?open=circles',
])

let guideCache: { text: string; at: number } | null = null
async function loadGuide(): Promise<string> {
  if (guideCache && Date.now() - guideCache.at < 5 * 60 * 1000) return guideCache.text
  const text = await readFile(path.join(process.cwd(), 'content', 'help-guide.md'), 'utf8')
  guideCache = { text, at: Date.now() }
  return text
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const question = String(body.question || '').trim().slice(0, 500)
    const place = body.place === 'app' ? 'app' : 'site'
    if (question.length < 3) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 })

    const ip = getClientIp(req)
    if (!(await checkRateLimit(`help:ip:${ip}`, 20, 3600))) {
      return NextResponse.json({ error: 'That is a lot of questions for one hour. Try again a little later, or use the contact form.' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const svc = createServiceClient()

    const [guide, faqRes] = await Promise.all([
      loadGuide(),
      svc.from('faq_entries').select('question, answer').eq('published', true).order('sort_order'),
    ])
    const faq = ((faqRes.data || []) as { question: string; answer: string }[])
      .map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')

    const system = `You are the help assistant on prayerbands.com, a Christian ministry that makes NFC prayer wristbands people wear, pray over, and pass on.

Answer ONLY from the guide and FAQ below. If the answer is not there, say you are not sure and point them to the contact form (/contact). Never invent prices, policies, or features. Never ask for or discuss anyone's personal data, orders, or account details; you cannot see them.

Style: warm, plain, brief. Two to five short sentences, or a short numbered list for "how do I" questions. No headings, no markdown emphasis. Speak to the person as "you". The person is ${user ? 'signed in' : 'not signed in'} and asking from ${place === 'app' ? 'inside the app (My Band)' : 'the public website'}.

Respond with JSON only, no code fences: {"answer": string, "link": {"label": string, "href": string} | null}
"link" is the single most useful page for this question, chosen from the guide's bracketed links (for example "/store", "/my-band?open=circles", "/contact"). Use null if none fits. If the person is not signed in and the page is inside the app (/my-band...), still give it; the site will ask them to sign in.

GUIDE:
${guide}

FAQ:
${faq}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: question }],
    })
    const raw = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('').trim()

    let answer = ''
    let link: { label: string; href: string } | null = null
    try {
      const parsed = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim())
      answer = String(parsed.answer || '').trim()
      const l = parsed.link
      if (l && typeof l.href === 'string' && ALLOWED_LINKS.has(l.href) && typeof l.label === 'string') link = { label: l.label.slice(0, 40), href: l.href }
    } catch {
      // The model answered in prose; use it as is.
      answer = raw
    }
    if (!answer) answer = 'I am not sure about that one. The contact form reaches a person who can help.'
    if (!link && /contact form/i.test(answer)) link = { label: 'Contact us', href: '/contact' }

    // Log, best effort. The table may not exist yet.
    try {
      await svc.from('help_questions').insert({ question, answer, link_href: link?.href ?? null, user_id: user?.id ?? null, place })
    } catch {}

    return NextResponse.json({ answer, link })
  } catch (err) {
    console.error('[help] error:', err)
    return NextResponse.json({ error: 'Something went wrong. Try again, or use the contact form.' }, { status: 500 })
  }
}
