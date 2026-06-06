import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { orderId, customerEmail, customerName, bandIds, trackingNumber } = await req.json()

    const resend = new Resend(process.env.RESEND_API_KEY)

    const bandList = Array.isArray(bandIds) && bandIds.length > 0
      ? bandIds.map((id: string) => `<li style="font-family: monospace; font-size: 15px; margin: 4px 0; color: #B8860B;">${id}</li>`).join('')
      : '<li style="color: #888;">Band IDs will be included with your shipment</li>'

    const trackingSection = trackingNumber
      ? `
        <div style="margin: 24px 0; padding: 16px 20px; background: #f0f8f0; border: 1px solid #7BAE8E; border-radius: 8px;">
          <p style="margin: 0 0 6px; font-size: 13px; color: #4A8A6A; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">USPS Tracking Number</p>
          <p style="margin: 0; font-family: monospace; font-size: 16px; color: #2C1A0E; font-weight: bold;">${trackingNumber}</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #666;">
            Track your package at <a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}" style="color: #7BAE8E;">usps.com</a>
          </p>
        </div>
      `
      : ''

    const { error } = await resend.emails.send({
      from: 'PrayerBands <hello@prayerbands.com>',
      to: customerEmail,
      subject: 'Your PrayerBands Have Shipped! \u2728',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8" /></head>
        <body style="margin: 0; padding: 0; background: #FAF6EF; font-family: Georgia, serif;">
          <div style="max-width: 560px; margin: 40px auto; background: #fff; border: 1px solid #E8DCC8; border-radius: 12px; overflow: hidden;">

            <!-- Header -->
            <div style="background: #2C1A0E; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #C8A96E; font-size: 24px; font-family: Georgia, serif; letter-spacing: 0.5px;">PrayerBands</h1>
              <p style="margin: 6px 0 0; color: #8B6914; font-size: 13px;">Your bands are on their way</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #2C1A0E;">Dear ${customerName},</p>

              <p style="margin: 0 0 20px; font-size: 15px; color: #555; line-height: 1.6;">
                Your PrayerBands order has been shipped! Each band carries a unique ID and a purpose — to travel, to be prayed over, and to connect lives across distances.
              </p>

              ${trackingSection}

              <!-- Band IDs -->
              <div style="margin: 24px 0; padding: 16px 20px; background: #FAF6EF; border: 1px solid #E8DCC8; border-radius: 8px;">
                <p style="margin: 0 0 10px; font-size: 13px; color: #8B6914; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Your Band IDs</p>
                <ul style="margin: 0; padding: 0 0 0 16px; list-style: disc;">
                  ${bandList}
                </ul>
              </div>

              <!-- Instructions -->
              <div style="margin: 24px 0; padding: 16px 20px; background: #fff9ee; border-left: 3px solid #C8A96E;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #8B6914;">How to activate your band:</p>
                <ol style="margin: 0; padding: 0 0 0 18px; font-size: 14px; color: #555; line-height: 1.8;">
                  <li>Visit <a href="https://prayerbands.com/register" style="color: #B8860B;">prayerbands.com/register</a></li>
                  <li>Enter your band ID</li>
                  <li>Leave a prayer or blessing</li>
                  <li>Pass the band to someone who needs prayer</li>
                </ol>
              </div>

              <p style="margin: 20px 0 0; font-size: 14px; color: #777; line-height: 1.6; font-style: italic;">
                "The prayer of a righteous person is powerful and effective." &mdash; James 5:16
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #FAF6EF; border-top: 1px solid #E8DCC8; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #AAA;">
                Questions? Reply to this email or visit <a href="https://prayerbands.com/contact" style="color: #B8860B;">prayerbands.com/contact</a>
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Shipping confirmation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
