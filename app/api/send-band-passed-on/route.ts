import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { ownerEmail, ownerName, bandId, newHolderName, city, country } = await req.json()
    if (!ownerEmail) {
      return NextResponse.json({ success: true, message: 'No owner email' })
    }
    const location = [city, country].filter(Boolean).join(', ')
    const { data, error } = await resend.emails.send({
      from: 'Prayer Bands <bands@prayerbands.com>',
      to: [ownerEmail],
      subject: `✝ Your band ${bandId} just moved on — keep the chain going`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
          <div style="background:#0d3d6e;padding:32px;text-align:center">
            <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
            <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your Band Was Passed On</h1>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;font-style:italic">${bandId} just reached someone new</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#4a5568;line-height:1.8;margin:0 0 20px">Hi ${ownerName || 'friend'},</p>
            <p style="font-size:16px;color:#4a5568;line-height:1.8;margin:0 0 20px">
              <strong style="color:#1a5fa0">${newHolderName || 'Someone'}</strong> just registered your band
              <strong>${bandId}</strong>${location ? ` in <strong style="color:#1aabaa">${location}</strong>` : ''}.
              Your prayer is continuing its journey. ✝
            </p>
            <p style="font-size:16px;color:#4a5568;line-height:1.8;margin:0 0 28px">
              Now that your band has moved on, grab a new one so you can keep passing the blessing forward.
            </p>
            <div style="text-align:center;margin:32px 0">
              <a href="https://prayerbands.com/store"
                style="background:#f5a623;color:#fff;text-decoration:none;padding:16px 36px;border-radius:8px;font-family:Georgia,serif;font-size:17px;font-weight:bold;display:inline-block">
                Get a New Band ✝
              </a>
            </div>
            <p style="font-size:13px;color:#a0aec0;text-align:center;margin:24px 0 0;line-height:1.6">
              Every band you give is a prayer.<br>Every prayer travels further than you know.
            </p>
          </div>
          <div style="background:#f5efe0;padding:16px 32px;text-align:center;border-top:1px solid #e2d5b8">
            <p style="font-size:12px;color:#a0aec0;margin:0">PrayerBands.com</p>
          </div>
        </div>
      `
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('send-band-passed-on error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
