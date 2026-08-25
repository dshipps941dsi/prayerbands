import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isBandHolder, nameFromProfile } from '@/lib/network'
import { escapeHtml } from '@/lib/escape-html'
import { checkRateLimit } from '@/lib/rate-limit'

// POST /api/network/connect-user  { connect_code }
// Connect to a person by their permanent connect code (from their QR / link),
// rather than through a band. The code resolves to an account and never moves,
// so a printed QR always reaches the same person.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = (await req.json().catch(() => ({}))).connect_code
    const code = String(raw || '').trim().toUpperCase()
    if (!/^[A-Z0-9]{8,16}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid connect code' }, { status: 400 })
    }

    if (!(await checkRateLimit(`net-req:user:${user.id}`, 20, 3600))) {
      return NextResponse.json({ error: 'You’ve sent a lot of requests recently. Please wait a bit.' }, { status: 429 })
    }

    const admin = createServiceClient()

    if (!(await isBandHolder(admin, user.id))) {
      return NextResponse.json({ error: 'You must be a band holder to connect in prayer' }, { status: 403 })
    }

    const { data: target } = await admin
      .from('profiles')
      .select('id')
      .eq('connect_code', code)
      .maybeSingle()
    if (!target) return NextResponse.json({ error: 'That connect code was not found.' }, { status: 404 })

    const recipientId = target.id as string
    if (recipientId === user.id) {
      return NextResponse.json({ error: "You can't connect with yourself" }, { status: 400 })
    }

    if (!(await checkRateLimit(`net-req:pair:${user.id}:${recipientId}`, 3, 86400))) {
      return NextResponse.json({ error: 'You’ve already reached out to this person recently.' }, { status: 429 })
    }

    const { data: existing } = await supabase
      .from('prayer_network_connections')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${user.id})`)
      .maybeSingle()
    if (existing) {
      const msg = existing.status === 'accepted' ? 'Already connected' : 'A request is already pending'
      return NextResponse.json({ error: msg, status: existing.status }, { status: 409 })
    }

    const { error: insertError } = await supabase
      .from('prayer_network_connections')
      .insert({ requester_id: user.id, recipient_id: recipientId, band_id: null, status: 'pending' })
    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'A request already exists', status: 'pending' }, { status: 409 })
      }
      console.error('connect-user insert error:', insertError)
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    // Notify the recipient (best effort).
    try {
      const [{ data: rprofile }, { data: sprofile }] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', recipientId).single(),
        admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
      ])
      const requesterName = nameFromProfile(sprofile)
      const eRequesterName = escapeHtml(requesterName)
      if (rprofile?.email) {
        const resend = new Resend(process.env.RESEND_API_KEY!)
        await resend.emails.send({
          from: 'Prayer Bands <bands@prayerbands.com>',
          to: [rprofile.email],
          subject: `🙏 ${requesterName} wants to connect with you in prayer`,
          html: `
            <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
              <div style="background:#1a6b4a;padding:32px;text-align:center">
                <div style="font-size:36px;color:#f5a623;margin-bottom:8px">🙏</div>
                <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">A Prayer Connection</h1>
                <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${eRequesterName} would like to join you in prayer</p>
              </div>
              <div style="padding:32px">
                <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px">
                  <strong style="color:#1a6b4a">${eRequesterName}</strong> asked to connect with you as Prayer Partners. If you accept, you'll be able to lift each other up in prayer.
                </p>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://prayerbands.com/dashboard?tab=prayers" style="display:inline-block;background:#1a6b4a;color:#fff;padding:16px 36px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;font-family:Georgia,serif">Review the Request ✝</a>
                </div>
                <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">Open your dashboard to accept or decline. ✝</p>
              </div>
            </div>
          `,
        })
      }
    } catch (e) {
      console.error('connect-user email failed:', e)
    }

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (err) {
    console.error('connect-user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
