"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// Recipient-focused help center. A table-of-contents rail on the left drives a
// single content pane on the right — everything a person holding a band can do,
// in the order they'll meet it. Content only; no auth or data dependencies.

type Block =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "tip"; text: string };

type Section = {
  id: string;
  icon: string;
  nav: string; // short label for the rail
  title: string;
  blurb: string;
  blocks: Block[];
  cta?: { label: string; href: string };
};

const SECTIONS: Section[] = [
  {
    id: "start",
    icon: "✝︎",
    nav: "What is a band?",
    title: "What a Prayer Band is",
    blurb: "A wristband with a tiny chip and a unique ID that carries a living chain of prayer.",
    blocks: [
      { type: "p", text: "Every Prayer Band holds a small NFC chip and a one-of-a-kind ID (it starts with PB-). Tap the band to the back of your phone — or visit its printed link — and the band's own page opens. No app to download." },
      { type: "p", text: "That page is the band's story: the prayers attached to it, everyone who has held it, and a map of everywhere it has traveled. As the band passes from person to person, the chain of prayer grows." },
      { type: "tip", text: "Nothing to install and no account required to begin. Tapping the band is all it takes to open it." },
    ],
    cta: { label: "Get a band", href: "/store" },
  },
  {
    id: "register",
    icon: "🙏",
    nav: "Register & pray",
    title: "Register your band & leave a prayer",
    blurb: "Add your name and a prayer the first time you tap — no account needed.",
    blocks: [
      { type: "p", text: "The first time a band is tapped, it invites you to register it. This is the moment it comes alive." },
      { type: "steps", items: [
        "Tap your band (or open its link) to reach its page.",
        "Add your first name and write a short prayer or blessing.",
        "Choose whether your prayer is private to the band's chain or shared publicly.",
        "Save — your prayer becomes the first link in this band's journey.",
      ] },
      { type: "tip", text: "You don't need to sign up to hold a band or leave a prayer. An account is completely optional — see the next section." },
    ],
  },
  {
    id: "account",
    icon: "🔐",
    nav: "Save to an account",
    title: "Save your band to an account (optional)",
    blurb: "Keep all your bands in one place, with no password to remember.",
    blocks: [
      { type: "p", text: "If you'd like to keep track of your bands and come back to them, you can save one to a free account. It's optional and takes a few seconds." },
      { type: "steps", items: [
        "Choose 'save to an account' after registering your band.",
        "Enter your email — we send you a 6-digit code.",
        "Type the code on the same page. That's it, you're in.",
        "Prefer one tap? You can also continue with Google or Facebook.",
      ] },
      { type: "tip", text: "No password to create or remember. The code signs you in, and every band you claim appears together in your dashboard." },
    ],
    cta: { label: "Open my dashboard", href: "/my-band" },
  },
  {
    id: "verse",
    icon: "🌅",
    nav: "Daily verse tap",
    title: "Tap in for your daily verse",
    blurb: "Tap your band each day to receive a fresh verse — and watch your walk grow, one day at a time.",
    blocks: [
      { type: "p", text: "Make it a daily habit. Tap your band each morning and a verse of the day is waiting — a small moment of scripture to carry with you." },
      { type: "steps", items: [
        "Tap your band to open it and see today's verse.",
        "Tap a theme — like peace, strength, or hope — for a verse that fits what you're facing.",
        "Each day you tap in, your walk counts up — 'Day 12 of your walk.'",
        "Keep tapping in day after day to build a streak — the days you've shown up in a row.",
        "Miss a day? No worry — it quietly starts fresh, never penalized.",
      ] },
      { type: "tip", text: "No account needed to begin — your walk is saved on your device, and once you sign in it follows you across your phone and tablet." },
    ],
  },
  {
    id: "journal",
    icon: "📓",
    nav: "Prayer journal",
    title: "Keep a prayer journal",
    blurb: "Write down what you're praying for on your band — and mark the moment it's answered.",
    blocks: [
      { type: "p", text: "Each band can hold your own private prayer journal — a personal place to record what you're bringing to God and to look back on how He's moved." },
      { type: "steps", items: [
        "Add a prayer with a title and, if you like, a few details.",
        "Your entries stay private to you on this band — no one else sees them.",
        "When God answers, mark it answered and add a short testimony of what happened.",
      ] },
      { type: "tip", text: "The prayer journal is a free-account feature. Saving your band to an account (see 'Save to an account') unlocks it and keeps your entries safe across devices." },
    ],
    cta: { label: "See your bands", href: "/my-band" },
  },
  {
    id: "journey",
    icon: "🗺️",
    nav: "Follow the journey",
    title: "Follow your band's journey",
    blurb: "See the live map, the prayers, and every hand that has carried it.",
    blocks: [
      { type: "p", text: "Each band's page is a living record. Open it any time to see how far it has traveled and how many people have paused to pray." },
      { type: "steps", items: [
        "The map shows each place the band has been carried.",
        "The prayer feed shows the prayers people have added along the way.",
        "A running count marks how many have prayed over this band.",
      ] },
      { type: "tip", text: "Come back whenever you like — the journey keeps growing as the band moves from person to person." },
    ],
  },
  {
    id: "pass",
    icon: "🤝",
    nav: "Pass it on",
    title: "Pass your band on",
    blurb: "Hand it to someone new and keep the chain of prayer unbroken.",
    blocks: [
      { type: "p", text: "A Prayer Band is meant to move. When you're ready, pass it to someone else — a friend, a stranger, anyone who needs prayer — and the band carries everything before it forward." },
      { type: "steps", items: [
        "From the band's page, choose to pass it on.",
        "The next person taps the band and registers themselves as the new holder.",
        "The full history stays intact — nothing is lost, the chain simply lengthens.",
      ] },
      { type: "tip", text: "You can keep following a band's journey even after you've passed it along." },
    ],
  },
  {
    id: "gift",
    icon: "🎁",
    nav: "Gift & dedicate",
    title: "Give a band as a gift",
    blurb: "Add a blessing or dedication for whoever receives it.",
    blocks: [
      { type: "p", text: "Bands make meaningful gifts. Before you hand one over, you can attach a personal blessing or dedication that the recipient sees when they first tap it." },
      { type: "steps", items: [
        "Open the gift dedication for your band.",
        "Write your message — a blessing, a scripture, a note of encouragement.",
        "When the recipient taps the band, your dedication greets them.",
      ] },
      { type: "tip", text: "Giving a band to a group or church? See the shop for bulk options." },
    ],
    cta: { label: "Shop bands", href: "/store" },
  },
  {
    id: "request",
    icon: "📣",
    nav: "Request prayer",
    title: "Ask others to pray with you",
    blurb: "Share a request and let people mark that they've prayed.",
    blocks: [
      { type: "p", text: "When you're carrying a need, you can send out a prayer request. The people connected to your band can pray alongside you and let you know they have." },
      { type: "steps", items: [
        "Share a prayer request from your band or dashboard.",
        "The people in your prayer network are invited to pray.",
        "As each person prays, they tap 'I prayed' — so you can feel the support gathering.",
      ] },
      { type: "tip", text: "Everyone can choose how much they hear from you, so requests are always welcome, never pushy." },
    ],
  },
  {
    id: "circles",
    icon: "⭕",
    nav: "Prayer circles",
    title: "Pray together in a circle",
    blurb: "Create or join a group and lift each other up with a simple code.",
    blocks: [
      { type: "p", text: "Prayer circles let a group — a family, a small group, a youth ministry — pray together in one place." },
      { type: "steps", items: [
        "Create a circle, or join an existing one with its join code.",
        "Preview a circle before you commit to joining.",
        "Share requests and pray for one another within the circle.",
      ] },
      { type: "tip", text: "A join code is all someone needs to find your circle — easy to share on a card, a screen, or in a text." },
    ],
    cta: { label: "Join a circle", href: "/circles" },
  },
  {
    id: "network",
    icon: "🌐",
    nav: "Your prayer network",
    title: "Your prayer network",
    blurb: "The chain of people your bands have connected you to — always on your terms.",
    blocks: [
      { type: "p", text: "As bands pass between people, a gentle network forms of those who've held the same bands. It's how a prayer request can reach the people already part of your band's story." },
      { type: "steps", items: [
        "Your network grows naturally as bands change hands.",
        "You decide how much you hear — from anyone, or no one.",
        "Every prayer email includes a one-tap way to opt out, per person or from all of it.",
      ] },
      { type: "tip", text: "You're always in control. Opting out is one tap and takes effect right away." },
    ],
  },
  {
    id: "wall",
    icon: "📖",
    nav: "The prayer wall",
    title: "The public prayer wall",
    blurb: "A shared wall of prayers anyone can read and add to.",
    blocks: [
      { type: "p", text: "The Prayer Wall is the public, communal side of Prayer Bands — a place to read prayers others have shared and to add one of your own." },
      { type: "p", text: "When you post to the wall you choose how you appear: anonymously, or with just your first name and last initial. Private prayers on your bands are never posted here unless you choose to share them." },
    ],
    cta: { label: "Visit the prayer wall", href: "/prayer-wall" },
  },
  {
    id: "manage",
    icon: "⚙️",
    nav: "Privacy & help",
    title: "Privacy, your account & help",
    blurb: "Control your prayers, your details, and what happens if a band is lost.",
    blocks: [
      { type: "p", text: "You're in charge of your prayers and your information. Every prayer you add has a visibility choice, and you can manage your name and sign-in details from your settings." },
      { type: "steps", items: [
        "Private prayers stay within a band's chain; public ones you post yourself.",
        "Lost a band? You can order a replacement that links back into your journey so the chain isn't broken.",
        "Manage your name, sign-in, and preferences from account settings.",
      ] },
      { type: "tip", text: "Still stuck? The contact form gets you a real reply within a couple of business days." },
    ],
    cta: { label: "Contact us", href: "/contact" },
  },
];

export default function HowItWorksPage() {
  const [active, setActive] = useState(0);
  const s = SECTIONS[active];

  function go(i: number) {
    setActive(i);
    // Bring the content pane back into view on smaller screens where the rail
    // sits above the content.
    if (typeof document !== "undefined") {
      document.getElementById("hc-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .hc-hero {
          text-align: center; padding: 72px 24px 56px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .hc-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 16px;
        }
        .hc-title {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700;
          font-size: clamp(34px, 5.5vw, 56px); line-height: 1.1; color: #F5EDD8; margin-bottom: 18px;
        }
        .hc-title em { font-style: italic; color: #C8A96E; }
        .hc-sub { font-size: 16px; font-weight: 300; color: rgba(245,237,216,0.78); max-width: 540px; margin: 0 auto; line-height: 1.7; }

        .hc-shell {
          max-width: 1080px; margin: 0 auto; padding: 44px 24px 76px;
          display: grid; grid-template-columns: 264px 1fr; gap: 40px; align-items: start;
        }
        /* Rail */
        .hc-rail { position: sticky; top: 74px; }
        .hc-rail-title {
          font-family: 'Cinzel', serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.22em; text-transform: uppercase; color: #9A7A35; margin: 0 0 14px 12px;
        }
        .hc-rail-list { display: flex; flex-direction: column; gap: 2px; }
        .hc-rail-item {
          display: flex; align-items: center; gap: 11px; width: 100%; text-align: left;
          background: none; border: none; cursor: pointer;
          padding: 10px 12px; border-radius: 9px;
          border-left: 3px solid transparent;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #5C6573;
          transition: background 0.14s, color 0.14s, border-color 0.14s;
        }
        .hc-rail-item:hover { background: rgba(200,169,110,0.10); color: #15223B; }
        .hc-rail-item.active {
          background: #FFFDF8; color: #15223B; font-weight: 600;
          border-left-color: #C8A96E; box-shadow: 0 2px 10px rgba(10,22,40,0.06);
        }
        .hc-rail-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          font-size: 11px; font-weight: 600; font-family: 'Cinzel', serif;
          background: rgba(200,169,110,0.16); color: #9A7A35;
        }
        .hc-rail-item.active .hc-rail-num { background: #C8A96E; color: #0A1628; }

        /* Content pane */
        .hc-content { min-width: 0; }
        .hc-card {
          background: #FFFDF8; border: 1px solid rgba(10,22,40,0.10);
          border-radius: 14px; padding: 40px 42px 36px;
          box-shadow: 0 3px 16px rgba(10,22,40,0.06);
        }
        .hc-kicker {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Cinzel', serif; font-size: 10.5px; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase; color: #9A7A35; margin-bottom: 14px;
        }
        .hc-icon { font-size: 20px; line-height: 1; }
        .hc-h {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700;
          font-size: clamp(26px, 4vw, 36px); line-height: 1.12; color: #15223B; margin: 0 0 10px;
        }
        .hc-blurb { font-size: 16px; color: #5C6573; line-height: 1.6; margin: 0 0 26px; max-width: 620px; }
        .hc-p { font-size: 15.5px; line-height: 1.78; color: #43506A; margin: 0 0 18px; max-width: 640px; }
        .hc-steps { list-style: none; padding: 0; margin: 0 0 20px; max-width: 640px; }
        .hc-step {
          position: relative; padding: 4px 0 18px 44px; font-size: 15px; line-height: 1.65; color: #43506A;
          border-left: 1.5px solid rgba(200,169,110,0.35); margin-left: 14px;
        }
        .hc-step:last-child { border-left-color: transparent; padding-bottom: 2px; }
        .hc-step-dot {
          position: absolute; left: -13px; top: 2px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 50%;
          background: #0E1E38; color: #E2C98A; font-size: 12px; font-weight: 600; font-family: 'Cinzel', serif;
        }
        .hc-tip {
          display: flex; gap: 11px; align-items: flex-start;
          background: rgba(200,169,110,0.11); border: 1px solid rgba(200,169,110,0.3);
          border-radius: 10px; padding: 14px 16px; margin: 4px 0 6px; max-width: 640px;
        }
        .hc-tip-mark { color: #9A7A35; font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .hc-tip-text { font-size: 14px; line-height: 1.6; color: #5a5330; }
        .hc-cta {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 24px;
          background: #0E1E38; color: #F5EDD8; text-decoration: none;
          font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
          padding: 13px 24px; border-radius: 999px; transition: background 0.16s, transform 0.16s;
        }
        .hc-cta:hover { background: #15223B; transform: translateY(-1px); }

        .hc-pager {
          display: flex; justify-content: space-between; gap: 12px; margin-top: 24px;
        }
        .hc-pager button {
          flex: 1; background: none; cursor: pointer; text-align: left;
          border: 1px solid rgba(10,22,40,0.12); border-radius: 10px; padding: 12px 16px;
          transition: border-color 0.15s, background 0.15s; color: inherit;
        }
        .hc-pager button:hover:not(:disabled) { border-color: #C8A96E; background: #FFFDF8; }
        .hc-pager button:disabled { opacity: 0.4; cursor: default; }
        .hc-pager .next { text-align: right; }
        .hc-pager-label { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A7A35; font-family: 'Cinzel', serif; }
        .hc-pager-name { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 17px; font-weight: 600; color: #15223B; margin-top: 2px; }

        @media (max-width: 860px) {
          .hc-shell { grid-template-columns: 1fr; gap: 22px; }
          .hc-rail { position: static; }
          .hc-rail-list { flex-direction: row; flex-wrap: wrap; gap: 8px; }
          .hc-rail-item { width: auto; border-left: none; border: 1px solid rgba(10,22,40,0.12); padding: 8px 13px; }
          .hc-rail-item.active { border-color: #C8A96E; border-left: 1px solid #C8A96E; }
          .hc-card { padding: 30px 24px 28px; }
        }
      `}</style>

      <SiteHeader />

      <section className="hc-hero">
        <div className="hc-eyebrow">✝︎ Help Center</div>
        <h1 className="hc-title">How Prayer<br /><em>Bands Work</em></h1>
        <p className="hc-sub">Everything your band can do — from your very first tap to passing it around the world. Pick a topic to begin.</p>
      </section>

      <div className="hc-shell">
        <aside className="hc-rail">
          <p className="hc-rail-title">Contents</p>
          <div className="hc-rail-list">
            {SECTIONS.map((sec, i) => (
              <button
                key={sec.id}
                className={`hc-rail-item${i === active ? " active" : ""}`}
                onClick={() => go(i)}
                aria-current={i === active ? "true" : undefined}
              >
                <span className="hc-rail-num">{i + 1}</span>
                <span>{sec.nav}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="hc-content" id="hc-content">
          <article className="hc-card">
            <div className="hc-kicker">
              <span className="hc-icon">{s.icon}</span>
              <span>Step {active + 1} of {SECTIONS.length}</span>
            </div>
            <h2 className="hc-h">{s.title}</h2>
            <p className="hc-blurb">{s.blurb}</p>

            {s.blocks.map((b, i) => {
              if (b.type === "p") return <p key={i} className="hc-p">{b.text}</p>;
              if (b.type === "steps")
                return (
                  <ol key={i} className="hc-steps">
                    {b.items.map((it, j) => (
                      <li key={j} className="hc-step">
                        <span className="hc-step-dot">{j + 1}</span>
                        {it}
                      </li>
                    ))}
                  </ol>
                );
              return (
                <div key={i} className="hc-tip">
                  <span className="hc-tip-mark">✦</span>
                  <span className="hc-tip-text">{b.text}</span>
                </div>
              );
            })}

            {s.cta && (
              <Link href={s.cta.href} className="hc-cta">
                {s.cta.label} <span aria-hidden>→</span>
              </Link>
            )}
          </article>

          <div className="hc-pager">
            <button className="prev" onClick={() => go(active - 1)} disabled={active === 0}>
              <div className="hc-pager-label">← Previous</div>
              {active > 0 && <div className="hc-pager-name">{SECTIONS[active - 1].nav}</div>}
            </button>
            <button className="next" onClick={() => go(active + 1)} disabled={active === SECTIONS.length - 1}>
              <div className="hc-pager-label">Next →</div>
              {active < SECTIONS.length - 1 && <div className="hc-pager-name">{SECTIONS[active + 1].nav}</div>}
            </button>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
