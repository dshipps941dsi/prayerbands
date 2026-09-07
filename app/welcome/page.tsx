"use client";

import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// /welcome — the onboarding letter that used to ship as a printed insert.
// Now a page, so a single printed QR code (see /fulfill/welcome-qr) can go in
// every shipment instead of reprinting the letter over and over. Copy mirrors
// the Welcome Card and the "When the band arrives" steps in the shipping email.

const NAVY = "#0A1628";
const GOLD = "#C8A96E";
const GOLD_DEEP = "#9A7A35";
const IVORY = "#F7F1E3";
const IVORY_SOFT = "#FBF7EC";
const INK = "#2A2318";
const INK_SOFT = "#574C3B";
const LINE = "rgba(200,169,110,0.38)";

const FEATURES = [
  {
    title: "Daily Scripture",
    desc: "Tap for a verse and encouragement for the day.",
    icon: <><path d="M4 4h11a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-1a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h1z" /></>,
  },
  {
    title: "Prayer Circles",
    desc: "Join others in prayer and support a shared need.",
    icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
  {
    title: "Leave Encouragement",
    desc: "Add a prayer, blessing, or note along the journey.",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    title: "Follow the Story",
    desc: "See where the band has traveled and the lives it has touched.",
    icon: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  },
];

function Phone({ where }: { where: "top" | "middle" }) {
  const cy = where === "top" ? 22 : 60;
  return (
    <svg viewBox="0 0 120 150" width="96" height="120" fill="none" aria-hidden="true" style={{ display: "block", margin: "0 auto 14px" }}>
      <defs>
        <radialGradient id={`glow-${where}`} cx="50%" cy={where === "top" ? "18%" : "50%"} r="42%">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.55" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="30" y="10" width="60" height="128" rx="13" fill={NAVY} />
      <rect x="34" y="14" width="52" height="120" rx="10" fill="#16294a" />
      <rect x="30" y="10" width="60" height="128" rx="13" fill={`url(#glow-${where})`} />
      <circle cx="60" cy={cy} r="17" fill="none" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.45" />
      <circle cx="60" cy={cy} r="10.5" fill="none" stroke={GOLD} strokeWidth="1.5" strokeOpacity="0.85" />
    </svg>
  );
}

export default function WelcomePage() {
  return (
    <div style={{ background: "#060d1c", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        .wc-cinzel { font-family: 'Cinzel', Georgia, serif; }
        .wc-wrap { padding: 40px 20px 64px; display: flex; justify-content: center; }
        .wc-card { width: 100%; max-width: 680px; background: ${IVORY}; border: 1px solid ${LINE}; border-radius: 8px; overflow: hidden; box-shadow: 0 24px 70px rgba(0,0,0,0.45); }
        .wc-banner { background: ${NAVY}; padding: 42px 32px 34px; text-align: center; }
        .wc-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.34em; color: ${GOLD}; text-transform: uppercase; margin: 0 0 16px; }
        .wc-h1 { font-family: 'Cinzel', serif; font-weight: 600; font-size: clamp(24px, 5.4vw, 32px); letter-spacing: 0.16em; text-transform: uppercase; margin: 0; color: #F4EEDF; }
        .wc-flourish { font-style: italic; font-size: 16px; color: rgba(247,241,227,0.72); margin: 8px 0 0; }
        .wc-body { padding: 34px 40px 12px; }
        .wc-lede { font-size: 16.5px; line-height: 1.62; margin: 0 auto; max-width: 52ch; text-align: center; }
        .wc-callout { margin: 26px 0 6px; border: 1px solid ${LINE}; border-radius: 4px; background: ${IVORY_SOFT}; padding: 16px 20px; text-align: center; }
        .wc-sect { display: flex; align-items: center; gap: 14px; margin: 34px 0 20px; }
        .wc-sect span { font-family: 'Cinzel', serif; font-weight: 600; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: ${NAVY}; white-space: nowrap; }
        .wc-sect::before, .wc-sect::after { content: ""; height: 1px; flex: 1; background: ${LINE}; }
        .wc-tap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .wc-tap { border: 1px solid rgba(10,22,40,0.10); border-radius: 6px; background: #fff; padding: 20px 18px 22px; text-align: center; }
        .wc-device { font-family: 'Cinzel', serif; font-weight: 700; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: ${GOLD_DEEP}; margin: 0 0 12px; }
        .wc-journey { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${LINE}; border: 1px solid ${LINE}; border-radius: 6px; overflow: hidden; }
        .wc-feat { background: ${IVORY_SOFT}; padding: 18px 20px; display: flex; gap: 13px; align-items: flex-start; }
        .wc-ic { flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: ${NAVY}; color: ${GOLD}; margin-top: 2px; }
        .wc-feat h3 { font-family: 'Cinzel', serif; font-weight: 600; font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: ${NAVY}; margin: 1px 0 4px; }
        .wc-feat p { margin: 0; font-size: 14.5px; line-height: 1.45; color: ${INK_SOFT}; }
        .wc-close { padding: 4px 40px 40px; text-align: center; }
        .wc-tagline { font-family: 'Cinzel', serif; font-weight: 700; font-size: clamp(20px, 5vw, 26px); letter-spacing: 0.14em; text-transform: uppercase; color: ${NAVY}; margin: 0; }
        .wc-cta { display: inline-block; margin-top: 22px; background: ${GOLD}; color: ${NAVY}; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        @media (max-width: 560px) { .wc-tap-grid, .wc-journey { grid-template-columns: 1fr; } .wc-body { padding: 28px 22px 8px; } .wc-close { padding: 4px 22px 32px; } }
        @page { size: Letter portrait; margin: 0.4in; }
        @media print {
          .wc-wrap { padding: 0; display: block; }
          .wc-card { max-width: none; border: none; box-shadow: none; }
          .wc-feat, .wc-tap, .wc-callout { break-inside: avoid; }
          .wc-banner, .wc-ic { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .wc-noprint { display: none !important; }
        }
      `}</style>

      <div className="wc-noprint"><SiteHeader /></div>

      <main className="wc-wrap">
        <article className="wc-card">
          <header className="wc-banner">
            <p className="wc-eyebrow">One Band &nbsp;&bull;&nbsp; Endless Reach</p>
            <h1 className="wc-h1">Welcome to Prayer Bands</h1>
            <p className="wc-flourish">Welcome to the journey.</p>
          </header>

          <div className="wc-body">
            <p className="wc-lede">
              What you&rsquo;re holding is more than a wristband &mdash; it&rsquo;s <span style={{ color: GOLD_DEEP, fontWeight: 600 }}>a prayer that can travel</span>.
              Each Prayer Band carries an NFC chip that links the physical band to its own digital journey. With one simple tap,
              open daily scripture, join prayer circles, leave encouragement, and see the lives your band touches along the way.
            </p>

            <div className="wc-callout">
              <span className="wc-cinzel" style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: "0.16em", textTransform: "uppercase", color: NAVY, display: "block", marginBottom: 6 }}>
                No App. &nbsp;No Download.
              </span>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: INK_SOFT }}>
                Unlock your phone, hold it near the band&rsquo;s pouch, then tap the notification that appears.
              </p>
            </div>

            <div className="wc-sect"><span>How to Tap Your Band</span></div>
            <div className="wc-tap-grid">
              <div className="wc-tap">
                <p className="wc-device">iPhone</p>
                <Phone where="top" />
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: INK_SOFT }}>Hold the <b style={{ color: INK }}>top</b> of your iPhone near the Prayer Bands pouch for a moment.</p>
              </div>
              <div className="wc-tap">
                <p className="wc-device">Android</p>
                <Phone where="middle" />
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: INK_SOFT }}>Place the <b style={{ color: INK }}>middle of the back</b> of your Android phone against the pouch.</p>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 13.5, color: INK_SOFT, margin: "16px 0 0", lineHeight: 1.5 }}>
              Can&rsquo;t tap? Enter the band ID printed in your order email at{" "}
              <a href="/register" style={{ color: GOLD_DEEP, fontWeight: 600 }}>prayerbands.com/register</a>.
            </p>

            <div className="wc-sect"><span>Your Band. Your Journey.</span></div>
            <div className="wc-journey">
              {FEATURES.map(f => (
                <div className="wc-feat" key={f.title}>
                  <span className="wc-ic" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                  </span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="wc-close">
            <p style={{ fontSize: 15.5, lineHeight: 1.62, color: INK, maxWidth: "48ch", margin: "30px auto 24px" }}>
              Every person who receives a Prayer Band becomes another part of its story.
              A prayer offered today may encourage someone you&rsquo;ll never meet.
            </p>
            <p className="wc-tagline">Tap. &nbsp;Pray. &nbsp;<span style={{ color: GOLD_DEEP }}>Connect.</span></p>
            <p style={{ fontStyle: "italic", fontSize: 15, color: GOLD_DEEP, margin: "12px 0 0" }}>Welcome to the Prayer Bands family.</p>
            <div className="wc-noprint">
              <a className="wc-cta" href="/my-band">Open my band &rarr;</a>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "22px 0 0", color: GOLD }}>
              <span style={{ width: 46, height: 1, background: LINE }} /><span style={{ fontSize: 10, letterSpacing: "0.3em" }}>&#10015;</span><span style={{ width: 46, height: 1, background: LINE }} />
            </div>
          </div>
        </article>
      </main>

      <div className="wc-noprint"><SiteFooter /></div>
    </div>
  );
}
