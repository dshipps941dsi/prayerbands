import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { email, name, bandIds, quantity } = await req.json()
    await resend.emails.send({
      from: 'Prayer Bands <bands@prayerbands.com>',
      to: [email],
      subject: '✝ Your Prayer Bands Have Shipped!',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
          <div style="background:#0d3d6e;padding:32px;text-align:center">
            <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
            <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Your Bands Are On Their Way!</h1>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0">Get ready to spread His word</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 24px">
              Hi ${name}! Your ${quantity} PrayerBand${parseInt(quantity)>1?'s have':' has'} shipped and will arrive within a few days. ✝
            </p>
            ${bandIds.length > 0 ? `
            <div style="background:#f0f6ff;border-radius:10px;padding:20px;margin:20px 0">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#2b7bc4;margin-bottom:12px">Your Band IDs</div>
              ${bandIds.map((id: string) => `
                <div style="font-family:monospace;font-size:18px;color:#1a5fa0;letter-spacing:0.15em;margin-bottom:6px">✝ ${id}</div>
                <div style="font-size:12px;color:#8896a8;margin-bottom:12px">prayerbands.com/r/${id}</div>
              `).join('')}
            </div>
            ` : ''}
            <div style="background:#e8f4fd;border-radius:10px;padding:20px;margin:20px 0">
              <div style="font-size:14px;color:#4a5568;line-height:2">
                <strong style="color:#1a5fa0">How to use your bands:</strong><br>
                1. Give a band to someone as a prayer<br>
                2. They tap the band with their phone<br>
                3. They see your prayer for them<br>
                4. They join the journey ✝
              </div>
            </div>
            <div style="text-align:center;margin:28px 0">
              <a href="https://prayerbands.com/dashboard" style="display:inline-block;background:#2b7bc4;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                View Your Dashboard ✝
              </a>
            </div>
            <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
              "Go into all the world and preach the gospel." — Mark 16:15
            </p>
          </div>
        </div>
      `
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
