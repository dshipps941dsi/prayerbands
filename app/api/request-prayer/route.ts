import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSessionOrg } from '@/lib/org-auth'
import { escapeHtml } from '@/lib/escape-html'
import { checkRateLimit } from '@/lib/rate-limit'

// Cap how many people one prayer request fans out to (a band that's been
// mass-registered could otherwise turn this into a bulk mailer).
const MAX_RECIPIENTS = 200

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)

  try {
    // Identify the sender from the session, never from the body — otherwise any
    // caller could impersonate another user and spam that user's network.
    const { userId } = await getSessionOrg()
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // One person should not be blasting their network on a loop.
    if (!(await checkRateLimit(`request-prayer:user:${userId}`, 5, 3600))) {
      return NextResponse.json({ error: 'You’ve sent several prayer requests recently. Please wait a bit before sending more.' }, { status: 429 })
    }

    const { prayerText, anonymous, excludedEmails = [] } = await req.json()
    if (!prayerText || !String(prayerText).trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const cleanPrayer = String(prayerText).trim().slice(0, 2000)

    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    const senderName = anonymous ? 'Someone in your Prayer Bands network' : (sender?.full_name || 'A friend')
    const senderEmail = sender?.email

    const { data: senderBands } = await supabase
      .from('bands')
      .select('band_id')
      .eq('owner_id', userId)

    const senderBandIds = (senderBands || []).map((b: any) => b.band_id)
    const networkEmails: { email: string, name: string, relationship: string, bandId: string }[] = []

    if (senderBandIds.length > 0) {
      const { data: allRegs } = await supabase
        .from('registrations')
        .select('email, user_name, band_id, registered_at')
        .in('band_id', senderBandIds)
        .not('email', 'is', null)
        .order('registered_at', { ascending: true })

      const firstPerBand: Record<string, any> = {}
      ;(allRegs || []).forEach((r: any) => {
        if (!firstPerBand[r.band_id]) firstPerBand[r.band_id] = r
      })
      Object.values(firstPerBand).forEach((r: any) => {
        if (r.email !== senderEmail && !networkEmails.find(e => e.email === r.email)) {
          networkEmails.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'gave you a band', bandId: r.band_id })
        }
      })

      const latestPerBand: Record<string, any> = {}
      ;(allRegs || []).forEach((r: any) => {
        latestPerBand[r.band_id] = r
      })
      Object.values(latestPerBand).forEach((r: any) => {
        if (r.email !== senderEmail && !networkEmails.find(e => e.email === r.email)) {
          networkEmails.push({ email: r.email, name: r.user_name || 'Friend', relationship: 'received your band', bandId: r.band_id })
        }
      })
    }

    const recipients = networkEmails
      .filter(r => !excludedEmails.includes(r.email))
      .slice(0, MAX_RECIPIENTS)

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No contacts found in your network yet. Share bands with people to build your prayer network.' })
    }

    const { data: chainPrayer } = await supabase
      .from('chain_prayers')
      .insert({
        band_id: senderBandIds[0] || null,
        prayer_text: cleanPrayer,
        sender_contact: senderEmail,
        sender_contact_type: 'email',
        targets: recipients.map(r => ({ email: r.email, name: r.name })),
        requester_user_id: userId,
        requester_name: senderName,
      })
      .select()
      .single()

    const chainPrayerId = chainPrayer?.id
    let sent = 0

    const eSenderName = escapeHtml(senderName)
    const ePrayer = escapeHtml(cleanPrayer)

    for (const recipient of recipients) {
      const ackUrl = `https://prayerbands.com/pray-ack?id=${chainPrayerId}&name=${encodeURIComponent(recipient.name)}&email=${encodeURIComponent(recipient.email)}`
      const eRecipientName = escapeHtml(recipient.name)
      const eRelationship = escapeHtml(recipient.relationship)

      await resend.emails.send({
        from: 'Prayer Bands <bands@prayerbands.com>',
        to: [recipient.email],
        subject: `🙏 ${senderName} is asking for prayer`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
            <div style="background:#1a6b4a;padding:32px;text-align:center">
              <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🙏</div>
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">A Prayer Request</h1>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${eSenderName} needs your prayers</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                Hi ${eRecipientName}, <strong>${eSenderName}</strong> — who ${eRelationship} — is reaching out through Prayer Bands to ask for prayer.
              </p>
              <div style="background:#fff;border-left:4px solid #1a6b4a;padding:20px 24px;border-radius:0 10px 10px 0;margin:20px 0">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1a6b4a;margin-bottom:10px">Their Prayer Request</div>
                <p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${ePrayer}"</p>
              </div>
              <div style="text-align:center;margin:28px 0">
                <a href="${ackUrl}" style="display:inline-block;background:#1a6b4a;color:#fff;padding:16px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;font-family:Georgia,serif">✝ I'm Praying for You</a>
              </div>
              <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
                Click the button to let ${eSenderName} know you're standing with them in prayer. ✝
              </p>
              <div style="background:#f0f7f3;border-radius:10px;padding:16px 20px;margin:24px 0;text-align:center">
                <p style="font-size:14px;color:#5a4f42;margin:0;font-style:italic">"Carry each other's burdens, and in this way you will fulfill the law of Christ." — Galatians 6:2</p>
              </div>
            </div>
          </div>
        `
      })
      sent++
    }

    // Do not echo the network (which contains recipients' email addresses).
    return NextResponse.json({ success: true, sent })

  } catch (err: any) {
    console.error('Prayer request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
