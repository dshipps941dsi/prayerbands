// /api/prayer-requests/intercede.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { requestId, intercessorId } = req.body;

  if (!requestId || !intercessorId) {
    return res.status(400).json({ error: 'requestId and intercessorId are required' });
  }

  // 1. Log the intercession
  const { error: intercessionError } = await supabase
    .from('prayer_intercessions')
    .insert({ request_id: requestId, intercessor_id: intercessorId });

  if (intercessionError) return res.status(500).json({ error: intercessionError.message });

  // 2. Fetch the prayer request + requester profile + intercessor profile
  const { data: prayerRequest, error: reqError } = await supabase
    .from('prayer_requests')
    .select('*, profiles:user_id(full_name, email)')
    .eq('id', requestId)
    .single();

  if (reqError) return res.status(500).json({ error: reqError.message });

  const { data: intercessorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', intercessorId)
    .single();

  const requesterEmail = prayerRequest.profiles?.email;
  const requesterName = prayerRequest.profiles?.full_name || 'Friend';
  const intercessorName = intercessorProfile?.full_name || 'Someone';

  // 3. Send notification email to the requester
  if (requesterEmail) {
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
                <strong>${intercessorName}</strong> just prayed for your request:
              </p>
              <div style="background: #fdf8f0; border-left: 4px solid #c8a96e; padding: 16px 20px; border-radius: 8px; text-align: left; margin-bottom: 24px;">
                <p style="color: #4a3728; font-style: italic; margin: 0;">"${prayerRequest.title}"</p>
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
    });
  }

  return res.status(200).json({ success: true, message: 'Intercession logged and notification sent' });
}