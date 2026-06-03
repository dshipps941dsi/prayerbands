import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY!)

  try {
    const { userId, prayerText, anonymous, bandId } = await req.json()
    if (!userId || !prayerText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get sender profile
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single()

    const senderName = anonymous ? 'Someone in your PrayerBands network' : (sender?.display_name || 'A friend')
    const senderEmail = sender?.email

    // ── FIND UPLINE (1 level up) ──────────────────────────
    // The person who registered the band before the sender
    const { data: uplineReg } = await supabase
      .from('registrations')
      .select('email, user_name, band_id')
      .eq('band_id', bandId)
      .not('email', 'is', null)
      .order('registered_at', { ascending: true })
      .limit(2)

    // First registration is the origin/upline
    const uplineEmails: { email: string, name: string }[] = []
    if (uplineReg && uplineReg.length > 0) {
      const origin = uplineReg[0]
      if (origin.email && origin.email !== senderEmail) {
        uplineEmails.push({ email: origin.email, name: origin.user_name || 'Friend' })
      }
    }

    // ── FIND DOWNLINE (1 level down) ──────────────────────
    // People who received bands from sender (bands sender owns)
    const { data: senderBands } = await supabase
      .from('bands')
      .select('band_id')
      .eq('owner_id', userId)

    const senderBandIds = (senderBands || []).map((b: any) => b.band_id)
    const downlineEmails: { email: string, name: string }[] = []

    if (senderBandIds.length > 0) {
      const { data: downlineRegs } = await supabase
        .from('registrations')
        .select('email, user_name, band_id')
        .in('band_id', senderBandIds)
        .not('email', 'is', null)
        .neq('email', senderEmail || '')
        .order('registered_at', { ascending: false })

      // Get latest registration per band (current holder only)
      const latestPerBand: Record<string, any> = {}
      ;(downlineRegs || []).forEach((r: any) => {
        if (!latestPerBand[r.band_id]) {
          latestPerBand[r.band_id] = r
        }
      })

      Object.values(latestPerBand).forEach((r: any) => {
        if (r.email && !downlineEmails.find(e => e.email === r.email)) {
          downlineEmails.push({ email: r.email, name: r.user_name || 'Friend' })
        }
      })
    }

    const allRecipients = [...uplineEmails, ...downlineEmails]
    if (allRecipients.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No contacts found in your network yet' })
    }

    // ── SEND EMAILS ───────────────────────────────────────
    const targets = allRecipients.map(r => ({ email: r.email, name: r.name }))
    let sent = 0

    for (const recipient of allRecipients) {
      const isUpline = uplineEmails.find(e => e.email === recipient.email)
      const relationship = isUpline ? 'gave you a PrayerBand' : 'received a PrayerBand from you'

      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: [recipient.email],
        subject: `✝ ${senderName} is asking for prayer`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
            <div style="background:#1a6b4a;padding:32px;text-align:center">
              <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🙏</div>
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">A Prayer Request</h1>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${senderName} needs your prayers</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                Hi ${recipient.name}, <strong>${senderName}</strong> — who ${relationship} — 
                is reaching out through PrayerBands to ask for prayer.
              </p>
              <div style="background:#fff;border-left:4px solid #1a6b4a;padding:20px 24px;border-radius:0 10px 10px 0;margin:20px 0">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1a6b4a;margin-bottom:10px">Their Prayer Request</div>
                <p style="font-family:Georgia,serif;font-size:17px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${prayerText}"</p>
              </div>
              <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:20px 0">
                This is what PrayerBands is about — a network of people carrying each other in prayer. ✝
              </p>
              <div style="background:#f0f7f3;border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center">
                <p style="font-size:14px;color:#5a4f42;margin:0;font-style:italic">
                  "Carry each other's burdens, and in this way you will fulfill the law of Christ." — Galatians 6:2
                </p>
              </div>
              <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:20px 0 0">
                ✝ PrayerBands.com — connecting prayer across the world
              </p>
            </div>
          </div>
        `
      })
      sent++
    }

    // Save to chain_prayers
    await supabase.from('chain_prayers').insert({
      band_id: bandId,
      prayer_text: prayerText,
      sender_contact: senderEmail,
      sender_contact_type: 'email',
      targets: targets,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      sent,
      upline: uplineEmails.length,
      downline: downlineEmails.length,
    })

  } catch (err: any) {
    console.error('Prayer request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
