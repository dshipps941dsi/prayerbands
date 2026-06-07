import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolveBandRecipient, isBandHolder, nameFromProfile } from '@/lib/network'

// POST /api/network/request  { band_id }
// Sends a connection request from the viewer to the band's holder.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { band_id } = await req.json()
    if (!band_id) {
      return NextResponse.json({ error: 'band_id is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    if (!(await isBandHolder(admin, user.id))) {
      return NextResponse.json({ error: 'You must be a band holder to connect in prayer' }, { status: 403 })
    }

    const recipientId = await resolveBandRecipient(admin, band_id)
    if (!recipientId) {
      return NextResponse.json({ error: "This band's holder doesn't have an account yet" }, { status: 400 })
    }
    if (recipientId === user.id) {
      return NextResponse.json({ error: "You can't connect with yourself" }, { status: 400 })
    }

    // Already connected / pending, in either direction?
    const { data: existing } = await supabase
      .from('prayer_network_connections')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .maybeSingle()

    if (existing) {
      const code = existing.status === 'accepted' ? 'Already connected' : 'A request is already pending'
      return NextResponse.json({ error: code, status: existing.status }, { status: 409 })
    }

    const { error: insertError } = await supabase
      .from('prayer_network_connections')
      .insert({ requester_id: user.id, recipient_id: recipientId, band_id, status: 'pending' })

    if (insertError) {
      console.error('Connection insert error:', insertError)
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    // Notify the recipient (best effort — never fail the request on email error).
    try {
      const [{ data: rprofile }, { data: sprofile }] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', recipientId).single(),
        admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
      ])
      const requesterName = nameFromProfile(sprofile)
      if (rprofile?.email) {
        const resend = new Resend(process.env.RESEND_API_KEY!)
        await resend.emails.send({
          from: 'PrayerBands <bands@prayerbands.com>',
          to: [rprofile.email],
          subject: `🙏 ${requesterName} wants to connect with you in prayer`,
          html: `
            <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
              <div style="background:#1a6b4a;padding:32px;text-align:center">
                <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🙏</div>
                <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">A Prayer Connection</h1>
                <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${requesterName} would like to join you in prayer</p>
              </div>
              <div style="padding:32px">
                <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                  <strong style="color:#1a6b4a">${requesterName}</strong> tapped your prayer band and asked to connect with you as Prayer Partners. If you accept, you'll be able to lift each other up in prayer.
                </p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://prayerbands.com/dashboard?tab=prayers" style="display:inline-block;background:#1a6b4a;color:#fff;padding:16px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;font-family:Georgia,serif">Review the Request ✝</a>
                </div>
                <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
                  Open your dashboard to accept or decline. ✝
                </p>
                <div style="background:#f0f7f3;border-radius:10px;padding:16px 20px;margin:24px 0;text-align:center">
                  <p style="font-size:14px;color:#5a4f42;margin:0;font-style:italic">"For where two or three gather in my name, there am I with them." — Matthew 18:20</p>
                </div>
              </div>
            </div>
          `,
        })
      }
    } catch (e) {
      console.error('Network request email failed:', e)
    }

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (err) {
    console.error('Network request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
