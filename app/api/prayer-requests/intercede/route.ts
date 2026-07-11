import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/escape-html'

// POST /api/prayer-requests/intercede  { requestId }
// Log that the signed-in user prayed for a request and notify the requester.
// (Ported from Pages Router; intercessor is now the session user, and the email
// interpolations are HTML-escaped.)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId } = await req.json().catch(() => ({}))
  if (!requestId) return NextResponse.json({ error: 'requestId is required' }, { status: 400 })

  const admin = createServiceClient()

  // Log the intercession (ignore a duplicate-tap unique conflict).
  const { error: intercessionError } = await admin
    .from('prayer_intercessions')
    .insert({ request_id: requestId, intercessor_id: user.id })
  if (intercessionError && (intercessionError as { code?: string }).code !== '23505') {
    return NextResponse.json({ error: intercessionError.message }, { status: 500 })
  }

  const { data: prayerRequest, error: reqError } = await admin
    .from('prayer_requests')
    .select('*, profiles:user_id(full_name, email)')
    .eq('id', requestId)
    .single()
  if (reqError) return NextResponse.json({ error: reqError.message }, { status: 500 })

  const { data: intercessorProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const requesterEmail = prayerRequest.profiles?.email
  const requesterName = prayerRequest.profiles?.full_name || 'Friend'
  const intercessorName = intercessorProfile?.full_name || 'Someone'

  // Notify the requester (best effort — never fail the action on an email error).
  if (requesterEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      await resend.emails.send({
        from: 'Prayer Bands <prayer@prayerbands.com>',
        to: requesterEmail,
        subject: `🙏 ${intercessorName} is praying for you`,
        html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Georgia, serif; background: #fdf8f0; padding: 40px; max-width: 600px; margin: 0 auto;">
            <div style="background: white; border-radius: 12px; padding: 40px; border: 1px solid #e8d5b0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🙏</div>
              <h1 style="color: #4a3728; font-size: 24px; margin-bottom: 8px;">Someone is lifting you up</h1>
              <p style="color: #7a6a5a; font-size: 16px; margin-bottom: 24px;">
                <strong>${escapeHtml(intercessorName)}</strong> just prayed for your request:
              </p>
              <div style="background: #fdf8f0; border-left: 4px solid #c8a96e; padding: 16px 20px; border-radius: 8px; text-align: left; margin-bottom: 24px;">
                <p style="color: #4a3728; font-style: italic; margin: 0;">"${escapeHtml(prayerRequest.title)}"</p>
              </div>
              <p style="color: #9a8a7a; font-size: 14px;">
                You are not alone. Your prayer has been lifted up to heaven.
              </p>
              <hr style="border: none; border-top: 1px solid #e8d5b0; margin: 24px 0;">
              <p style="color: #c8a96e; font-size: 12px;">
                When God answers, visit your dashboard to mark this prayer as answered<br>and share your testimony. ✝
              </p>
            </div>
          </body>
        </html>
      `,
      })
    } catch (e) {
      console.error('Intercede notification email failed:', e)
    }
  }

  return NextResponse.json({ success: true, message: 'Intercession logged and notification sent' })
}
