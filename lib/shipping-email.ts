import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { bandDescription, themeLabelMap } from '@/lib/band-label'
import { escapeHtml } from '@/lib/escape-html'

const SUPPORT_EMAIL = 'hello@prayerbands.com'
const COMPANY_ADDRESS = 'PrayerBands.com' // update to a mailing address if desired

export type ShippingConfirmationInput = {
  orderId: number | string | null | undefined
  customerEmail: string
  customerName?: string | null
  bandIds?: string[] | null
  trackingNumber?: string | null
}

// Builds and sends the "your order shipped" email. Pure server-side helper with
// no request/auth coupling, so any trusted server route (admin or fulfillment)
// can call it directly. Returns { ok } rather than throwing.
export async function sendShippingConfirmation(input: ShippingConfirmationInput): Promise<{ ok: boolean; error?: string }> {
  const { orderId, customerEmail, customerName, bandIds, trackingNumber } = input
  if (!customerEmail) return { ok: false, error: 'No customer email' }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const firstName = escapeHtml(String(customerName || 'Friend').trim().split(/\s+/)[0] || 'Friend')
    const tracking = trackingNumber ? escapeHtml(String(trackingNumber)) : ''
    const trackingUrl = trackingNumber
      ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(String(trackingNumber))}`
      : 'https://tools.usps.com/go/TrackConfirmAction'

    let bandRows: { band_id: string; dedication_token: string | null; description: string }[] = []
    if (Array.isArray(bandIds) && bandIds.length > 0) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
      const { data } = await supabase
        .from('bands')
        .select('band_id, dedication_token, theme, color, size')
        .in('band_id', bandIds)
      const { data: themeRows } = await supabase.from('band_themes').select('key, label')
      const labels = themeLabelMap(themeRows as { key: string; label: string }[] | null)
      const rowBy = new Map((data ?? []).map((b: any) => [b.band_id, b]))
      bandRows = bandIds.map((id: string) => {
        const b = rowBy.get(id)
        return {
          band_id: id,
          dedication_token: b?.dedication_token ?? null,
          description: b ? bandDescription(b, labels) : '',
        }
      })
    }

    const bandCards = bandRows.map(b => {
      const msgUrl = b.dedication_token
        ? `https://prayerbands.com/dedicate/${b.band_id}?token=${b.dedication_token}`
        : `https://prayerbands.com/band/${b.band_id}`
      return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;border:1px solid #DDE4EF;border-radius:12px;background:#F8FAFE;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="stack" valign="middle">
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;color:#A1782D;">${b.description ? escapeHtml(b.description) : 'Band ID'}</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:25px;font-weight:bold;color:#12233F;">${escapeHtml(b.band_id)}</div>
                        </td>
                        <td class="stack stack-gap" align="right" valign="middle">
                          <a href="${msgUrl}" style="display:inline-block;border:1px solid #C89A3D;color:#8A641F;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:bold;padding:10px 14px;border-radius:7px;">Add personal message &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
    }).join('')

    const messageSection = bandRows.length > 0 ? `
          <tr>
            <td class="mobile-pad" style="padding:38px 52px 10px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:34px;font-weight:bold;color:#0B1E3A;margin-bottom:10px;">Make the first tap meaningful</div>
              <div class="body-copy" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#56657A;margin-bottom:22px;">Add a private note, prayer or blessing for each band before it arrives.</div>
              ${bandCards}
            </td>
          </tr>` : ''

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>Your Prayer Bands order has shipped</title>
  <style>
    html, body { margin:0 !important; padding:0 !important; width:100% !important; height:100% !important; background:#EEF2F7; }
    table, td { border-collapse:collapse !important; mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
    a { text-decoration:none; }
    .button { transition:opacity .2s ease; }
    .button:hover { opacity:.9; }
    @media screen and (max-width:640px) {
      .email-shell { width:100% !important; }
      .mobile-pad { padding-left:22px !important; padding-right:22px !important; }
      .hero-title { font-size:34px !important; line-height:40px !important; }
      .body-copy { font-size:17px !important; line-height:28px !important; }
      .stack { display:block !important; width:100% !important; }
      .stack-gap { padding-top:12px !important; }
      .full-button { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your Prayer Bands are on the way. Track your package and add a personal message before they arrive.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F7;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:640px;max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 35px rgba(31,36,32,.10);">

          <tr>
            <td style="background:#081B37;padding:18px 34px;" class="mobile-pad">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:30px;font-weight:bold;color:#F7F9FC;">✦ Prayer Bands</td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#D9B56A;">Order shipped</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding:54px 52px 48px;background:#102A54;background-image:radial-gradient(circle at 80% 18%, rgba(255,255,255,.10) 0, rgba(255,255,255,0) 26%),linear-gradient(135deg,#102A54 0%,#081B37 100%);">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#D9B56A;margin-bottom:14px;">Prayer Bands • Your order is on its way</div>
              <div class="hero-title" style="font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:50px;font-weight:bold;color:#ffffff;margin:0 0 18px;">A band with a purpose is headed your way.</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:29px;color:#DDE6F4;max-width:510px;">Each Prayer Band carries a unique ID and an invitation to pray, encourage and connect.</div>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding:42px 52px 12px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;font-weight:bold;color:#0B1E3A;margin-bottom:14px;">Hi ${firstName},</div>
              <div class="body-copy" style="font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;color:#4E5D73;">Your Prayer Bands order <strong style="color:#0B1E3A;">#${escapeHtml(String(orderId ?? ''))}</strong> has shipped. Use the tracking details below to follow its progress, then add a personal message the recipient will see on the band’s first tap.</div>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding:26px 52px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F7FB;border:1px solid #D8E0EC;border-radius:14px;">
                <tr>
                  <td style="padding:26px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="stack" width="60%" valign="top">
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#65758D;margin-bottom:7px;">Tracking number</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:32px;font-weight:bold;color:#0B1E3A;">${tracking || 'Provided with your shipment'}</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#68758A;margin-top:6px;">Estimated delivery: 3–5 business days</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#7B8799;margin-top:14px;letter-spacing:.4px;">ORDER CONFIRMED ✓ &nbsp;&nbsp; SHIPPED ✓ &nbsp;&nbsp; DELIVERED</div>
                        </td>
                        <td class="stack stack-gap" width="40%" align="right" valign="middle">
                          <a href="${trackingUrl}" class="button full-button" style="display:inline-block;background:#C89A3D;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;padding:14px 22px;border-radius:8px;">Track package</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${messageSection}

          <tr>
            <td class="mobile-pad" style="padding:38px 52px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B1E3A;border-radius:14px;">
                <tr>
                  <td style="padding:30px 30px 28px;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:31px;font-weight:bold;color:#ffffff;margin-bottom:20px;">When the band arrives</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="38" valign="top"><div style="width:28px;height:28px;border-radius:50%;background:#C89A3D;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:28px;font-weight:bold;text-align:center;">1</div></td>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#E8EEF8;padding-bottom:16px;"><strong style="color:#ffffff;">Tap the band with your phone.</strong> iPhone: hold the <strong style="color:#E4C475;">top</strong> of your phone to the band. Android: hold the <strong style="color:#E4C475;">middle</strong> of the back. Its page opens automatically &mdash; no app to download.</td>
                      </tr>
                      <tr>
                        <td width="38" valign="top"><div style="width:28px;height:28px;border-radius:50%;background:#C89A3D;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:28px;font-weight:bold;text-align:center;">2</div></td>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#E8EEF8;padding-bottom:16px;"><strong style="color:#ffffff;">Make it yours</strong> &mdash; add your name to save your daily verse and follow the band&rsquo;s journey.</td>
                      </tr>
                      <tr>
                        <td width="38" valign="top"><div style="width:28px;height:28px;border-radius:50%;background:#C89A3D;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:28px;font-weight:bold;text-align:center;">3</div></td>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#E8EEF8;padding-bottom:16px;">Leave a prayer, blessing or note of encouragement.</td>
                      </tr>
                      <tr>
                        <td width="38" valign="top"><div style="width:28px;height:28px;border-radius:50%;background:#C89A3D;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:28px;font-weight:bold;text-align:center;">4</div></td>
                        <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#E8EEF8;">Tap it any day for a fresh verse &mdash; and pass it on whenever you feel led to bless someone else.</td>
                      </tr>
                    </table>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#AEBBD0;margin-top:16px;">Can&rsquo;t tap? Enter the band ID shown above at <a href="https://prayerbands.com/register" style="color:#E4C475;font-weight:bold;">prayerbands.com/register</a>.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="padding:38px 62px 42px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:32px;font-style:italic;color:#6D788A;">“The prayer of a righteous person is powerful and effective.”</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#A77E31;margin-top:10px;">James 5:16</div>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" style="padding:28px 52px;background:#E8EDF5;border-top:1px solid #D7DFEA;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#68758A;text-align:center;">Questions about your order? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#214E9C;font-weight:bold;">${SUPPORT_EMAIL}</a>.</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#8791A2;text-align:center;margin-top:12px;">Prayer Bands &nbsp;&bull;&nbsp; ${COMPANY_ADDRESS}</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const { error } = await resend.emails.send({
      from: 'Prayer Bands <hello@prayerbands.com>',
      to: customerEmail,
      subject: 'Your Prayer Bands Have Shipped! ✨',
      html,
    })
    if (error) {
      console.error('Resend error:', error)
      return { ok: false, error: 'Failed to send email' }
    }
    return { ok: true }
  } catch (err) {
    console.error('Shipping confirmation error:', err)
    return { ok: false, error: 'Internal server error' }
  }
}
