import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { ensureReferralCode } from '@/lib/referral';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    const { name, prefix, subdomain, location, website, pastor, email, password } = await req.json();

    if (!name || !prefix || !email || !password || !pastor) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existingPrefix } = await supabase
      .from('organizations')
      .select('id')
      .eq('prefix', prefix.toUpperCase())
      .maybeSingle();

    const { data: existingSubdomain } = await supabase
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain.toLowerCase())
      .maybeSingle();

    if (existingPrefix || existingSubdomain) {
      return Response.json(
        { error: 'A church with a similar name already exists. Please contact support.' },
        { status: 409 }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: pastor },
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    const masterId = 'M-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await supabase.from('profiles').insert({
      id: userId,
      master_id: masterId,
      full_name: pastor,
      email,
    });

    // Give the new account a referral code (the DB trigger normally does this;
    // this is a safe no-op if it already has one). Non-fatal.
    await ensureReferralCode(supabase, userId);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        prefix: prefix.toUpperCase(),
        subdomain: subdomain.toLowerCase(),
        location: location || null,
        website: website || null,
        admin_id: userId,
        plan: 'ministry',
      })
      .select()
      .single();

    if (orgError) throw orgError;

    await supabase
      .from('profiles')
      .update({ org_id: org.id })
      .eq('id', userId);

    // Send welcome email
    await resend.emails.send({
      from: 'Prayer Bands <bands@prayerbands.com>',
      to: [email],
      subject: '✝ Welcome to Prayer Bands — Your Ministry Account is Ready',
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fdf8f0;border-radius:12px;overflow:hidden;border:1px solid #e2d5b8">
          <div style="background:#1a6b4a;padding:32px;text-align:center">
            <div style="font-size:36px;color:#f5a623;margin-bottom:8px">✝</div>
            <h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;margin:0;font-weight:400">Welcome to Prayer Bands</h1>
            <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">${name} is now on the map</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 24px">
              Hi ${pastor}, welcome to Prayer Bands! Your ministry account has been created and your bands are ready to start traveling the world. ✝
            </p>

            <div style="background:#f0f7f3;border-radius:10px;padding:20px 24px;margin:0 0 24px">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#1a6b4a;margin-bottom:16px">Your Ministry Details</div>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="font-size:13px;color:#8a7c6a;padding:6px 0;width:40%">Church</td>
                  <td style="font-size:14px;color:#2c2416;font-weight:600">${name}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8a7c6a;padding:6px 0">Band Prefix</td>
                  <td style="font-size:14px;color:#1a6b4a;font-family:monospace;font-weight:700">${prefix.toUpperCase()}-XXXXX</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8a7c6a;padding:6px 0">Dashboard</td>
                  <td style="font-size:14px;color:#1a6b4a;font-family:monospace">${subdomain.toLowerCase()}.prayerbands.com</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#8a7c6a;padding:6px 0">Login Email</td>
                  <td style="font-size:14px;color:#2c2416">${email}</td>
                </tr>
              </table>
            </div>

            <div style="background:#fff;border:1px solid #e8dfd0;border-radius:10px;padding:20px 24px;margin:0 0 28px">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#8a7c6a;margin-bottom:12px">Getting Started</div>
              <div style="font-size:14px;color:#4a5568;line-height:2">
                1. Sign in at <a href="https://prayerbands.com/signin" style="color:#1a6b4a">prayerbands.com/signin</a><br>
                2. Order your first batch of bands from your dashboard<br>
                3. Bands ship laser-engraved with your ${prefix.toUpperCase()} prefix and NFC chips<br>
                4. Give bands as prayers — watch them travel the world ✝
              </div>
            </div>

            <div style="text-align:center;margin:28px 0">
              <a href="https://prayerbands.com/signin"
                style="display:inline-block;background:#1a6b4a;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">
                Go to Your Dashboard ✝
              </a>
            </div>

            <p style="font-size:13px;color:#8896a8;text-align:center;font-style:italic;margin:0">
              "Go into all the world and preach the gospel." — Mark 16:15
            </p>
          </div>
          <div style="background:#f0f4f8;padding:16px;text-align:center;border-top:1px solid #e2eaf4">
            <p style="font-size:12px;color:#8896a8;margin:0">
              ✝ PrayerBands.com · Questions? <a href="mailto:support@prayerbands.com" style="color:#1a6b4a">support@prayerbands.com</a>
            </p>
          </div>
        </div>
      `
    });

    // Notify you
    await resend.emails.send({
      from: 'Prayer Bands <bands@prayerbands.com>',
      to: ['dshipps941@gmail.com'],
      subject: `✝ New Church Account — ${name} (${prefix.toUpperCase()})`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px">
          <h2 style="color:#1a6b4a">New Church Account ✝</h2>
          <p><strong>Church:</strong> ${name}</p>
          <p><strong>Pastor:</strong> ${pastor}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Prefix:</strong> ${prefix.toUpperCase()}</p>
          <p><strong>Subdomain:</strong> ${subdomain}.prayerbands.com</p>
          <p><strong>Location:</strong> ${location || 'Not provided'}</p>
        </div>
      `
    });

    return Response.json({ success: true, org_id: org.id, subdomain });

  } catch (err: any) {
    console.error('Onboard error:', err);
    return Response.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
