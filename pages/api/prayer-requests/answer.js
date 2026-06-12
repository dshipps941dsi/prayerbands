// /api/prayer-requests/answer.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { requestId, userId, testimony } = req.body;

  if (!requestId || !userId) {
    return res.status(400).json({ error: 'requestId and userId are required' });
  }

  // 1. Mark prayer as answered
  const { data: prayerRequest, error: updateError } = await supabase
    .from('prayer_requests')
    .update({
      status: 'answered',
      answered_testimony: testimony || null,
      answered_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('user_id', userId) // security: only owner can close
    .select('*, profiles:user_id(full_name, email)')
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  const requesterName = prayerRequest.profiles?.full_name || 'A fellow believer';

  // 2. Find all unique intercessors who prayed for this request
  const { data: intercessors, error: intercessionError } = await supabase
    .from('prayer_intercessions')
    .select('intercessor_id, profiles:intercessor_id(full_name, email)')
    .eq('request_id', requestId);

  if (intercessionError) {
    console.error('Could not fetch intercessors:', intercessionError.message);
  }

  // Deduplicate by email
  const uniqueIntercessors = [];
  const seenEmails = new Set();
  for (const row of (intercessors || [])) {
    const email = row.profiles?.email;
    if (email && !seenEmails.has(email)) {
      seenEmails.add(email);
      uniqueIntercessors.push({ name: row.profiles?.full_name || 'Friend', email });
    }
  }

  // 3. Notify every intercessor
  const emailPromises = uniqueIntercessors.map(({ name, email }) =>
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
                Dear ${name}, your prayers made a difference.
              </p>
              <p style="color: #7a6a5a; font-size: 16px; margin-bottom: 24px;">
                <strong>${requesterName}</strong> has marked their prayer as answered:
              </p>
              <div style="background: #fdf8f0; border-left: 4px solid #c8a96e; padding: 16px 20px; border-radius: 8px; text-align: left; margin-bottom: 24px;">
                <p style="color: #4a3728; font-weight: bold; margin: 0 0 8px 0;">"${prayerRequest.title}"</p>
                ${testimony ? `<p style="color: #6a7a5a; font-style: italic; margin: 0;">${testimony}</p>` : ''}
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
  );

  await Promise.allSettled(emailPromises);

  return res.status(200).json({
    success: true,
    notified: uniqueIntercessors.length,
    message: `Prayer marked as answered. ${uniqueIntercessors.length} intercessor(s) notified.`,
  });
}