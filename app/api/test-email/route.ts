import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'PrayerBands <bands@prayerbands.com>',
    to: ['dshipps941@gmail.com'],
    subject: '✝ Your band PB-K7M2R just moved to Venice, FL, USA',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
        <div style="background:#0d3d6e;padding:32px;text-align:center">
          <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
          <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Test Email</h1>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0">PrayerBands email system is working</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
            This is a test email from PrayerBands. ✝
          </p>
        </div>
      </div>
    `
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
