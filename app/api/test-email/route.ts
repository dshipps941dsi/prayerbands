import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: 'PrayerBands <bands@prayerbands.com>',
    to: ['dshipps941@gmail.com'],
    subject: '✝ PrayerBands Email Test',
    html: '<h1>It works!</h1><p>Your email integration is working perfectly. ✝</p>'
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}