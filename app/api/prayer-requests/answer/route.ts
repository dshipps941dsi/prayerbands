import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/escape-html'

// POST /api/prayer-requests/answer  { requestId, testimony, makePublic }
// Mark the signed-in user's own request answered and notify everyone who prayed.
// (Ported from Pages Router; owner is the session user, emails are HTML-escaped.)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, testimony, makePublic } = await req.json().catch(() => ({}))
  if (!requestId) return NextResponse.json({ error: 'requestId is required' }, { status: 400 })

  const admin = createServiceClient()

  // Only the owner can close their request (session-bound user_id).
  const { data: prayerRequest, error: updateError } = await admin
    .from('prayer_requests')
    .update({
      status: 'answered',
      answered_testimony: testimony || null,
      answered_at: new Date().toISOString(),
      testimony_public: !!makePublic && !!(testimony || '').trim(),
    })
    .eq('id', requestId)
    .eq('user_id', user.id)
    .select('*, profiles:user_id(full_name, email)')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!prayerRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  const requesterName = prayerRequest.profiles?.full_name || 'A fellow believer'

  // Notify every unique intercessor who prayed for this request.
  const { data: intercessors, error: intercessionError } = await admin
    .from('prayer_intercessions')
    .select('intercessor_id, profiles:intercessor_id(full_name, email)')
    .eq('request_id', requestId)
  if (intercessionError) console.error('Could not fetch intercessors:', intercessionError.message)

  const uniqueIntercessors: { name: string; email: string }[] = []
  const seenEmails = new Set<string>()
  for (const row of (intercessors ?? []) as any[]) {
    const email = row.profiles?.email
    if (email && !seenEmails.has(email)) {
      seenEmails.add(email)
      uniqueIntercessors.push({ name: row.profiles?.full_name || 'Friend', email })
    }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await Promise.allSettled(uniqueIntercessors.map(({ name, email }) =>
      resend.emails.send({
        from: 'Prayer Bands <prayer@prayerbands.com>',
        to: email,
        subject: `✨ Prayer Answered — ${requesterName} has a testimony to share`,
        html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Georgia, serif; background: #fdf8f0; padding: 40px; max-width: 600px; margin: 0 auto;">
            <div style="background: white; border-radius: 12px; padding: 40px; border: 1px solid #e8d5b0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
              <h1 style="color: #4a3728; font-size: 24px; margin-bottom: 8px;">God answered!</h1>
              <p style="color: #7a6a5a; font-size: 16px; margin-bottom: 8px;">
                Dear ${escapeHtml(name)}, your prayers made a difference.
              </p>
              <p style="color: #7a6a5a; font-size: 16px; margin-bottom: 24px;">
                <strong>${escapeHtml(requesterName)}</strong> has marked their prayer as answered:
              </p>
              <div style="background: #fdf8f0; border-left: 4px solid #c8a96e; padding: 16px 20px; border-radius: 8px; text-align: left; margin-bottom: 24px;">
                <p style="color: #4a3728; font-weight: bold; margin: 0 0 8px 0;">"${escapeHtml(prayerRequest.title)}"</p>
                ${testimony ? `<p style="color: #6a7a5a; font-style: italic; margin: 0;">${escapeHtml(testimony)}</p>` : ''}
              </div>
              <p style="color: #9a8a7a; font-size: 14px;">
                Thank you for standing in the gap. Your faithfulness matters.
              </p>
              <hr style="border: none; border-top: 1px solid #e8d5b0; margin: 24px 0;">
              <p style="color: #c8a96e; font-size: 12px;">PrayerBands.com ✝ — Connecting faith, one band at a time.</p>
            </div>
          </body>
        </html>
      `,
      })
    ))
  } catch (e) {
    console.error('Answer notification emails failed:', e)
  }

  return NextResponse.json({
    success: true,
    notified: uniqueIntercessors.length,
    message: `Prayer marked as answered. ${uniqueIntercessors.length} intercessor(s) notified.`,
  })
}
