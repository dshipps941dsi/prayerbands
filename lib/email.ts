import { Resend } from 'resend'

// The one place email leaves the building.
//
// Resend does not throw on a rejected send — it returns { data, error } — and
// twenty of twenty-three call sites were awaiting the call and moving on, so a
// bounced address or a bad API key looked exactly like success (and some
// routes reported "sent" counts that could be zero). Every send now goes
// through here: the error is checked and logged, the result says whether it
// went, a plain-text alternative is derived from the HTML, and replies land
// at hello@ instead of dying at a mailbox nobody reads.

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  text?: string
  headers?: Record<string, string>
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[]
}

export type SendEmailResult = { ok: boolean; id?: string; error?: string; data?: unknown }

export const FROM_BANDS = 'Prayer Bands <bands@prayerbands.com>'
export const FROM_HELLO = 'Prayer Bands <hello@prayerbands.com>'
export const REPLY_TO = 'hello@prayerbands.com'

// Good-enough text version of an HTML email: keeps the words and the links,
// drops the layout. Mail clients that prefer text, and spam filters that
// penalise HTML-only mail, both get something sensible.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, '').trim()
      return label && label !== href ? `${label} (${href})` : href
    })
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/table)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&middot;/g, '·').replace(/&rarr;/g, '→').replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY
  const toList = Array.isArray(input.to) ? input.to : [input.to]
  if (!key) {
    console.error('[email] RESEND_API_KEY is not set; not sent:', input.subject, toList)
    return { ok: false, error: 'Email is not configured.' }
  }
  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from: input.from || FROM_BANDS,
      to: toList,
      subject: input.subject,
      html: input.html,
      text: input.text ?? htmlToText(input.html),
      replyTo: input.replyTo || REPLY_TO,
      headers: input.headers,
      attachments: input.attachments,
    })
    if (error) {
      console.error('[email] send failed:', { subject: input.subject, to: toList, error })
      return { ok: false, error: (error as any)?.message || String(error), data }
    }
    return { ok: true, id: data?.id, data }
  } catch (e: any) {
    console.error('[email] send threw:', { subject: input.subject, to: toList, error: e?.message || e })
    return { ok: false, error: e?.message || 'Send failed' }
  }
}
