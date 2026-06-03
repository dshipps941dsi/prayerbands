
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
    const { chainPrayerId, acknowledgerName, acknowledgerEmail } = await req.json()
    if (!chainPrayerId || !acknowledgerEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get the prayer request details
    const { data: prayer } = await supabase
      .from('chain_prayers')
      .select('prayer_text, requester_user_id, requester_name, sender_contact')
      .eq('id', chainPrayerId)
      .single()

    if (!prayer) return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })

    // Save acknowledgment
    await supabase.from('prayer_acknowledgments').insert({
      chain_prayer_id: chainPrayerId,
      acknowledger_email: acknowledgerEmail,
      acknowledger_name: acknowledgerName,
    })

    // Notify the requester
    const requesterEmail = prayer.sender_contact
    const requesterName = prayer.requester_name || 'Friend'
    const acknowledgerDisplayName = acknowledgerName || 'Someone in your network'

    if (requesterEmail) {
      await resend.emails.send({
        from: 'PrayerBands <bands@prayerbands.com>',
        to: [requesterEmail],
        subject: `🙏 ${acknowledgerDisplayName} is praying for you`,
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
            <div style="background:#1a6b4a;padding:32px;text-align:center">
              <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🙏</div>
              <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Prayers Are Coming In</h1>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">Your network is standing with you</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                Hi ${requesterName}, <strong>${acknowledgerDisplayName}</strong> has seen your prayer request and is praying for you right now. ✝
              </p>
              <div style="background:#f0f7f3;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">
                <div style="font-size:32px;margin-bottom:8px">🙏</div>
                <p style="font-size:16px;font-weight:bold;color:#1a6b4a;margin:0">${acknowledgerDisplayName} is praying for you</p>
              </div>
              <div style="background:#fff;border-left:4px solid #f5a623;padding:16px 20px;border-radius:0 10px 10px 0;margin:20px 0">
                <p style="font-size:14px;color:#8a7c6a;margin:0 0 4px;font-style:italic">Your prayer request:</p>
                <p style="font-family:Georgia,serif;font-size:16px;font-style:italic;color:#4a5568;line-height:1.75;margin:0">"${prayer.prayer_text}"</p>
              </div>
              <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:20px 0 0">
                "The prayer of a righteous person is powerful and effective." — James 5:16 ✝
              </p>
            </div>
          </div>
        `
      })
    }

    return NextResponse.json({ success: true, requesterName })

  } catch (err: any) {
    console.error('Pray ack error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
