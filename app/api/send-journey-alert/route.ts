import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { bandId, newHolder, city, state, country, prayer, emails } = await req.json()

    const location = [city, state, country].filter(Boolean).join(', ')

    const { data, error } = await resend.emails.send({
      from: 'PrayerBands <bands@prayerbands.com>',
      to: emails,
      subject: `✝ Your band PB-${bandId} just moved`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
          <div style="background:#0d3d6e;padding:32px;text-align:center">
            <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
            <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your Band is Traveling</h1>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;font-style:italic">Someone new received ${bandId}</p>
          </div>

          <div style="padding:32px">
            <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
              <strong style="color:#1a5fa0">${newHolder}</strong> just registered your band in
              <strong style="color:#1aabaa">${location}</strong>.
              Your prayer is continuing its journey. ✝
            </p>

            ${prayer ? `
            <div style="background:#fff;border-left:3px solid #f5a623;padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#f5a623;margin-bottom:8px">Their Prayer</div>
              <p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${prayer}"</p>
            </div>
            ` : ''}

            <div style="background:#e8f4fd;border-radius:10px;padding:16px 20px;margin:20px 0">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#2b7bc4;margin-bottom:4px">Band ID</div>
              <div style="font-family:monospace;font-size:20px;color:#1a5fa0;letter-spacing:0.15em">${bandId}</div>
            </div>

            <div style="text-align:center;margin:28px 0">
              <a href="https://prayerbands.com/band/${bandId}" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                View Full Journey ✝
              </a>
            </div>

            <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
              "Go into all the world and preach the gospel." — Mark 16:15
            </p>
          </div>

          <div style="background:#f0f4f8;padding:16px;text-align:center;border-top:1px solid #e2eaf4">
            <p style="font-size:12px;color:#8896a8;margin:0">
              PrayerBands.com · <a href="https://prayerbands.com" style="color:#2b7bc4;text-decoration:none">Visit Site</a>
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}