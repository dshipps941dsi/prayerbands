import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: 'PrayerBands <bands@prayerbands.com>',
    to: ['dshipps941@gmail.com'],
    subject: '✝ Your band PB-K7M2R just moved to Venice, FL, USA',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
        <div style="background:#0d3d6e;padding:32px;text-align:center">
          <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
          <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your Band is Traveling</h1>
          <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;font-style:italic">PB-K7M2R just reached a new person</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
            <strong style="color:#1a5fa0">David</strong> just received your band in
            <strong style="color:#1aabaa">Venice, FL, USA</strong>. Your prayer is continuing its journey. ✝
          </p>
          <div style="background:#fff;border-left:3px solid #f5a623;padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0">
            <p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"Lord, whoever holds this next — may they know they are seen and loved."</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="https://prayerbands.com/band/PB-K7M2R" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">View Full Journey ✝</a>
          </div>
          <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">"Go into all the world and preach the gospel." — Mark 16:15</p>
        </div>
      </div>
    `
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}