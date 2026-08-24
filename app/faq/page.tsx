"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const FAQS = [
  {
    q: "What is a PrayerBand and how does it work?",
    a: "A PrayerBand is a wristband with a tiny NFC chip and a unique ID. Tap it with your phone (or visit its link) to read the prayers attached to it and add your own. Each band builds a living chain of prayer as it passes from person to person.",
  },
  {
    q: "Do I need an app to use my band?",
    a: "No app required. Most modern phones read NFC tags automatically — just tap the band to the back of your phone and a link opens. You can also visit the band's page directly in any web browser.",
  },
  {
    q: "Does the band track my location?",
    a: "No. The chip inside the band is passive — no battery, no GPS, and no way to send anything on its own. It holds one short web link and nothing else. It only does anything when someone deliberately holds a phone within an inch or two of it, so it cannot be read across a room and does nothing at all sitting in a drawer. It does not know who is wearing it, and nothing is ever written back to it. The pins on our map come from the city a person types in when they register a band — not from the band. If that box is left blank, we make one rough, city-level guess from the internet connection at that moment so the pin is not empty. There is no ongoing location, no movement history, and never a street address. Take the band off or pass it on, and nothing follows you.",
  },
  {
    q: "Do you sell my personal information?",
    a: "Never. We do not sell, rent, or trade your information, and we do not hand it to advertisers. The only companies that touch any of it are the ones that keep the site running: Supabase stores our data, Stripe processes payments (we never see your card number), Resend delivers our emails, Vercel hosts the site, and Google Analytics gives us anonymous visitor counts. You also choose what is public — your name can simply be ‘Anonymous’, and leaving a prayer is always optional. You can request a copy of your data, or ask us to delete it, at hello@prayerbands.com.",
  },
  {
    q: "How long does shipping take?",
    a: "Orders typically ship within 3 business days. Domestic delivery usually arrives within 5–7 business days after shipping; international can take longer. If you have an urgent need, mention 'URGENT' in your message subject.",
  },
  {
    q: "How do I track my order or fix a delivery problem?",
    a: "Use the contact form and choose 'Order & Shipping' as the topic, then enter your order number (it starts with PB-). We'll look into tracking, address corrections, or replacements right away.",
  },
  {
    q: "What if I lose my band?",
    a: "You can order a replacement band that we'll link back into your existing prayer journey, so the chain isn't broken. Reach out through the contact form and select 'Order & Shipping' if you need help with this.",
  },
  {
    q: "Can I attach my band to my account if I have more than one?",
    a: "Yes. When you tap a new band while signed in, you can claim it to your account. All of your bands then appear together in your dashboard, no matter how many you own.",
  },
  {
    q: "How do subscriptions work?",
    a: "Subscriptions ship new bands to you on a schedule — monthly, quarterly, or a monthly bundle — at a discount off retail. You choose your band color and size, and can change them anytime from your dashboard. Cancel whenever you like, with no cancellation fee.",
  },
  {
    q: "Do you offer bulk pricing for churches and ministries?",
    a: "We do. Bulk packs are available for congregations, youth groups, and mission organizations, with discounts on larger orders. Choose 'Partnership & Bulk Orders' on the contact form and tell us about your group.",
  },
  {
    q: "Is my prayer private?",
    a: "When you add a prayer you choose its visibility. Private prayers stay within the band's network; if you choose to share one publicly on the Prayer Wall, you can post anonymously or with just your first name and last initial.",
  },
  {
    q: "How quickly will I hear back from you?",
    a: "We reply to messages within 1–2 business days. Ministry and partnership questions are handled with special care, so those may take a little extra time to answer thoroughly.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .faq-hero {
          text-align: center; padding: 72px 24px 56px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .faq-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 16px;
        }
        .faq-title {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700;
          font-size: clamp(34px, 5.5vw, 56px); line-height: 1.1; color: #F5EDD8; margin-bottom: 18px;
        }
        .faq-title em { font-style: italic; color: #C8A96E; }
        .faq-sub { font-size: 16px; font-weight: 300; color: rgba(245,237,216,0.78); max-width: 520px; margin: 0 auto; line-height: 1.7; }
        .faq-wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px 72px; }
        .faq-item {
          background: #FFFDF8; border: 1px solid rgba(10,22,40,0.10);
          border-radius: 10px; margin-bottom: 12px; overflow: hidden;
          box-shadow: 0 2px 10px rgba(10,22,40,0.05);
        }
        .faq-q {
          width: 100%; text-align: left; background: none; border: none; cursor: pointer;
          padding: 20px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
          font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 600; color: #15223B;
        }
        .faq-icon { color: #C8A96E; font-size: 22px; flex-shrink: 0; transition: transform 0.2s; }
        .faq-a {
          padding: 0 22px 22px; font-size: 15px; line-height: 1.75; color: #4A5260; max-width: 640px;
        }
        .faq-cta { text-align: center; margin-top: 36px; font-size: 15px; color: #5C6573; }
        .faq-cta a { color: #9A7A35; font-weight: 600; text-decoration: none; }
        .faq-cta a:hover { text-decoration: underline; }
      `}</style>

      <SiteHeader />

      <section className="faq-hero">
        <div className="faq-eyebrow">✝ Help Center</div>
        <h1 className="faq-title">Frequently Asked<br /><em>Questions</em></h1>
        <p className="faq-sub">Everything you need to know about bands, prayers, shipping, and subscriptions.</p>
      </section>

      <div className="faq-wrap">
        {FAQS.map((f, i) => (
          <div key={i} className="faq-item">
            <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span>{f.q}</span>
              <span className="faq-icon" style={{ transform: open === i ? "rotate(45deg)" : "none" }}>+</span>
            </button>
            {open === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
        <p className="faq-cta">
          Still have a question? <Link href="/contact">Get in touch →</Link>
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
