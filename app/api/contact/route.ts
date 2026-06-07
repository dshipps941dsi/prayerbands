import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "david@prayerbands.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@prayerbands.com";

// Score threshold — 0.5 is Google's recommended minimum
const RECAPTCHA_THRESHOLD = 0.5;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const body = await req.json();
    const { name, email, category, orderNumber, subject, message, recaptchaToken } = body;

    // --- 1. Validate required fields ---
    if (!name?.trim() || !email?.trim() || !category || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    // Fold an order number (Order & Shipping enquiries) into the stored message
    // and the admin email, so support has it without a schema change.
    const fullMessage = orderNumber?.trim()
      ? `Order #: ${orderNumber.trim()}\n\n${message.trim()}`
      : message.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // --- 2. Verify reCAPTCHA v3 ---
    let recaptchaScore = 1.0; // Default pass if no key configured

    if (RECAPTCHA_SECRET && recaptchaToken) {
      const verifyRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: RECAPTCHA_SECRET,
            response: recaptchaToken,
          }).toString(),
        }
      );

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        console.warn("[Contact] reCAPTCHA failed:", verifyData["error-codes"]);
        return NextResponse.json(
          { error: "Security verification failed. Please try again." },
          { status: 400 }
        );
      }

      recaptchaScore = verifyData.score ?? 0;

      if (recaptchaScore < RECAPTCHA_THRESHOLD) {
        console.warn(`[Contact] reCAPTCHA score too low: ${recaptchaScore}`);
        return NextResponse.json(
          { error: "Your submission was flagged as suspicious. Please try again." },
          { status: 400 }
        );
      }
    }

    // --- 3. Store in Supabase ---
    const { data: submission, error: dbError } = await supabase
      .from("contact_submissions")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        subject: subject?.trim() || null,
        message: fullMessage,
        recaptcha_score: recaptchaScore,
        status: "new",
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || null,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[Contact] Supabase insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save your message. Please try again." },
        { status: 500 }
      );
    }

    // --- 4. Send admin notification email ---
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[PrayerBands Contact] ${category.toUpperCase()}: ${subject || name}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2a1f0e;">
            <div style="background: #b8964a; padding: 20px 28px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #fffdf7; margin: 0; font-size: 1.3rem;">New Contact Submission</h1>
            </div>
            <div style="background: #fffdf7; border: 1px solid #e8d8b0; border-top: none; border-radius: 0 0 8px 8px; padding: 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #7a6a52; width: 100px;"><strong>ID</strong></td><td style="padding: 6px 0;">#${submission?.id}</td></tr>
                <tr><td style="padding: 6px 0; color: #7a6a52;"><strong>Name</strong></td><td style="padding: 6px 0;">${name}</td></tr>
                <tr><td style="padding: 6px 0; color: #7a6a52;"><strong>Email</strong></td><td style="padding: 6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #7a6a52;"><strong>Topic</strong></td><td style="padding: 6px 0;">${category}</td></tr>
                ${subject ? `<tr><td style="padding: 6px 0; color: #7a6a52;"><strong>Subject</strong></td><td style="padding: 6px 0;">${subject}</td></tr>` : ""}
                <tr><td style="padding: 6px 0; color: #7a6a52;"><strong>Score</strong></td><td style="padding: 6px 0;">${recaptchaScore.toFixed(2)}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e8d8b0; margin: 20px 0;">
              <h3 style="color: #3a2f1e; margin: 0 0 10px;">Message</h3>
              <p style="color: #3a2f1e; line-height: 1.65; white-space: pre-wrap; margin: 0;">${fullMessage}</p>
              <hr style="border: none; border-top: 1px solid #e8d8b0; margin: 20px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://prayerbands.com"}/admin/contacts/${submission?.id}"
                 style="display: inline-block; background: #b8964a; color: #fffdf7; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-family: Georgia, serif; font-weight: 600;">
                View in Admin →
              </a>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      // Don't fail the request if email fails — submission is saved
      console.error("[Contact] Email notification error:", emailError);
    }

    // --- 5. Send confirmation to sender ---
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "We received your message — PrayerBands",
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #2a1f0e;">
            <div style="text-align: center; padding: 32px 28px 0;">
              <div style="font-size: 28px; color: #b8964a; opacity: 0.7; margin-bottom: 8px;">✝</div>
              <h1 style="font-size: 1.5rem; margin: 0 0 8px;">Message Received</h1>
              <p style="color: #7a6a52; margin: 0 0 24px; font-style: italic;">Thank you, ${name}.</p>
            </div>
            <div style="background: #fffdf7; border: 1px solid #e8d8b0; border-radius: 8px; padding: 24px 28px; margin: 0 16px;">
              <p style="margin: 0 0 16px; line-height: 1.65;">
                We've received your message and will respond within 1–2 business days.
              </p>
              <p style="margin: 0; color: #7a6a52; font-style: italic; line-height: 1.65;">
                "Pray without ceasing." — 1 Thessalonians 5:17
              </p>
            </div>
            <div style="text-align: center; padding: 24px 28px; color: #a09070; font-size: 0.8rem;">
              PrayerBands.com · Connecting prayer, one band at a time
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("[Contact] Confirmation email error:", emailError);
    }

    return NextResponse.json({ success: true, id: submission?.id });
  } catch (error) {
    console.error("[Contact] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
