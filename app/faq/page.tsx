"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { HelpBox } from "@/components/HelpAssistant";

const FAQS = [
  {
    q: "What is a Prayer Band and how does it work?",
    a: "A Prayer Band is a wristband with a tiny NFC chip and a unique ID. Tap it with your phone (or visit its link) to read the prayers attached to it and add your own. Each band builds a living chain of prayer as it passes from person to person.",
  },
  {
    q: "Do I need an app to use my band?",
    a: "No app required. Most modern phones read NFC tags automatically — just tap the band to the back of your phone and a link opens. You can also visit the band’s page directly in any web browser. If you would like an icon on your Home Screen, open the site in Safari (iPhone) or Chrome (Android), tap Share, then “Add to Home Screen”. That also turns on push notifications for iPhone.",
  },
  {
    q: "Is the band waterproof? Does it need charging?",
    a: "Yes, it’s fully waterproof — wear it in the shower, the pool, the ocean, or the sink without a second thought. There’s no battery and no electronics to charge or wear out: the NFC chip inside is passive and draws its tiny bit of power from your phone only in the moment you tap it. So there’s nothing to plug in, nothing to replace, and nothing that water can hurt. It’s built to be worn every day for years.",
  },
  {
    q: "Does the band track my location?",
    a: "No. The chip inside the band is passive — no battery, no GPS, and no way to send anything on its own. It holds one short web link and nothing else. It only does anything when someone deliberately holds a phone within an inch or two of it, so it cannot be read across a room and does nothing at all sitting in a drawer. It does not know who is wearing it, and nothing is ever written back to it. The pins on our map come from the city a person types in when they register a band — not from the band. If that box is left blank, we make one rough, city-level guess from the internet connection at that moment so the pin is not empty. There is no ongoing location, no movement history, and never a street address. Take the band off or pass it on, and nothing follows you.",
  },
  {
    q: "Do I need an account?",
    a: "Not to tap a band and leave a prayer — that works as a guest. An account (free) is what keeps everything together: your bands, your prayer journal, your partners, and your circles, on any phone. Sign in with a one-time code sent to your email, or with Google. Apple sign-in is available on the sign-in page too.",
  },
  {
    q: "I signed in, but my band isn’t showing on my account.",
    a: "Tap the band while you are signed in. If it was registered in your name, the page asks “Is it yours?” — tap Yes and it attaches. If you registered it and then created your account within half an hour, it attaches by itself. All of your bands then appear together under My Bands.",
  },
  {
    q: "Can I attach more than one band to my account?",
    a: "Yes. Tap any band while signed in and claim it. My Bands lists the ones you are wearing separately from the ones you have to give away, and the switcher at the top of the band page moves between them.",
  },
  {
    q: "What is the Prayer Journal?",
    a: "Your journal is your own place to write: prayers, notes, and verses, each dated as you write it. Give a prayer a title (“Mom’s surgery”) and the details beneath it, add an update as things change, and mark it answered when God moves — the whole story stays together in one entry. File entries into lists like Family or Health. Everything is private by default; a prayer can be shared with all your partners or with one group, and then shows you how many are praying.",
  },
  {
    q: "What are Prayer Partners?",
    a: "Prayer Partners are the people you are connected to in prayer — a friend, a spouse, a small group. Once connected, you can share a prayer from your journal with them, see the prayers they share with you, tap to say “I prayed”, and send a quick “prayed for you” note. Partners see only what you choose to share; your journal stays private.",
  },
  {
    q: "How do I connect with a Prayer Partner?",
    a: "Three ways, all from My Band → My Partners. Tap phones: hold your bands to each other’s phones. Scan: show your QR code and let them scan it. Code: read them the code on your band, or type in theirs. Partners you connect with directly are “Direct”; people a band has actually passed between are “Lineage”. Either way you can sort partners into private groups — Youth Group, Baseball Team — that only you can see, and share a prayer with just that group.",
  },
  {
    q: "What is the difference between Prayer Partners and Prayer Circles?",
    a: "Partners are one-to-one connections you make yourself; what you share reaches the people you pick. A circle is a group with a leader — a family, a small group, a team, a ministry — where everyone reads the same prayer wall. Use partners for the people closest to you and circles for a group that prays together.",
  },
  {
    q: "How do Prayer Circles work?",
    a: "Anyone with a band can create a circle and share its join code or link. People need a free account to see the circle. Members who have a band can write prayers under each topic; someone following without a band can tap to say they prayed. The leader and any co-leaders the leader names are the ones who post topics — requests and updates — so the wall stays focused. You are notified in your inbox when a topic is posted, when someone prays under yours, and, if you lead, when someone joins.",
  },
  {
    q: "What happens when I give my band to someone else?",
    a: "Open the band, tap “Pass on”, and write a note for them. The band shows as pending until the person taps it with their own phone — that tap makes it theirs and completes the hand-off, and your note is waiting for them. You stay in its story as the one who gave it, and you become “Lineage” partners. If a week goes by with no tap, we remind you; you can also cancel a hand-off if plans change.",
  },
  {
    q: "I bought several bands to hand out. How does that work?",
    a: "Bands you buy are credited to your account as the giver. They sit under My Bands as “to give away” until each person taps theirs, and a band you addressed to someone at checkout reads “for Sarah”. When a recipient taps and signs up, the band moves to them and you are told. You keep the connection as the giver without ever having to register the band yourself.",
  },
  {
    q: "What if I lose my band?",
    a: "You can order a replacement band that we’ll link back into your existing prayer journey, so the chain isn’t broken. Reach out through the contact form and select “Order & Shipping” if you need help with this.",
  },
  {
    q: "Is my prayer private?",
    a: "You choose. A journal entry is private unless you share it. A prayer left on a band is seen by the people in that band’s story. If you post to the public Prayer Wall, you can post anonymously or with just your first name and last initial.",
  },
  {
    q: "How long does shipping take?",
    a: "Orders typically ship within 3 business days. Domestic delivery usually arrives within 5–7 business days after shipping. Shipping is free on orders of $35 or more.",
  },
  {
    q: "How do I track my order or fix a delivery problem?",
    a: "Use the contact form and choose “Order & Shipping” as the topic, then enter your order number (it starts with PB-). We’ll look into tracking, address corrections, or replacements right away.",
  },
  {
    q: "Can you ship each band to a different person?",
    a: "Yes. Orders normally ship to one address (free over $35) and you hand the bands out. If you’d rather we mail each band directly to a different person, we can — for $4.99 per additional address, since every extra destination is its own package and postage. Place your order, then send us the names and addresses through the contact form; we’ll invoice the shipping and send each band on its way. You can add a name and a personal note for every band at checkout, and we’ll let you know as each person claims theirs.",
  },
  {
    q: "Do you offer bulk pricing for churches and ministries?",
    a: "We do. The store has a Bulk Order tab where you pick styles and sizes in one grid, and larger quantities are discounted. Bulk orders ship to you to hand out. For partnerships, choose “Partnership & Bulk Orders” on the contact form and tell us about your group.",
  },
  {
    q: "How do subscriptions work?",
    a: "Subscriptions ship new bands to you on a schedule — monthly, quarterly, or a monthly bundle — at a discount off retail. You choose your band color and size, and can change them anytime from your dashboard. Bands from a subscription are credited to you to give away. Cancel whenever you like, with no cancellation fee.",
  },
  {
    q: "Do I earn anything when someone I gave a band to buys their own?",
    a: "Yes. Every account has a referral link. When someone orders through it, you earn credit toward your own future bands. You will find your link and your balance under your account.",
  },
  {
    q: "Do you sell my personal information?",
    a: "Never. We do not sell, rent, or trade your information, and we do not hand it to advertisers. The only companies that touch any of it are the ones that keep the site running: Supabase stores our data, Stripe processes payments (we never see your card number), Resend delivers our emails, Vercel hosts the site, and Google Analytics gives us anonymous visitor counts. You also choose what is public — your name can simply be “Anonymous”, and leaving a prayer is always optional. You can request a copy of your data, or ask us to delete it, at hello@prayerbands.com.",
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
        <div className="faq-eyebrow">✝︎ Help Center</div>
        <h1 className="faq-title">Frequently Asked<br /><em>Questions</em></h1>
        <p className="faq-sub">Bands, accounts, your journal, partners and circles, giving bands away, orders and subscriptions.</p>
      </section>

      <div className="faq-wrap">
        <div style={{ background: "#FFFDF8", border: "1px solid rgba(10,22,40,0.10)", borderRadius: 12, padding: "20px 22px", marginBottom: 28, boxShadow: "0 2px 10px rgba(10,22,40,0.05)" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 700, color: "#15223B", marginBottom: 4 }}>Ask a question</div>
          <div style={{ fontSize: 14, color: "#5C6573", marginBottom: 14 }}>How something works, or how to do it. Answered from our help guide.</div>
          <HelpBox place="site" />
        </div>
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
