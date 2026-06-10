"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PrayerBandsLogo from "@/components/PrayerBandsLogo";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Prayer {
  initials: string;
  location: string;
  text: string;
  band: string;
  time: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PRAYERS: Prayer[] = [
  { initials: "M.R.", location: "Nashville, TN", text: "Lord, cover whoever holds this band with Your peace that passes all understanding.", band: "PB-47291", time: "2 hours ago" },
  { initials: "A.O.", location: "Lagos, Nigeria", text: "Father, let Your light shine through every hand this band passes through.", band: "PB-18834", time: "5 hours ago" },
  { initials: "C.F.", location: "São Paulo, Brazil", text: "May this band carry hope to someone who needs it today. In Jesus' name.", band: "PB-92011", time: "8 hours ago" },
  { initials: "J.K.", location: "Seoul, South Korea", text: "I pray for healing, restoration, and renewal for everyone this touches.", band: "PB-33107", time: "Yesterday" },
  { initials: "S.H.", location: "Birmingham, UK", text: "God, let this small band carry Your immeasurable love around the world.", band: "PB-65498", time: "Yesterday" },
];

const STEPS = [
  { num: "01", title: "Get a Band", desc: "Order your NFC-enabled PrayerBand — a durable wristband with a unique ID embedded in a tiny chip." },
  { num: "02", title: "Dedicate It", desc: "Write a prayer for someone. Slip it on their wrist, drop it in the mail, or give it as a gift. The act itself is a blessing." },
  { num: "03", title: "Watch It Travel", desc: "Each time someone taps the band, a new prayer is added. The band builds a living chain — names, places, prayers." },
  { num: "04", title: "Pass It Forward", desc: "When you feel led, pass the band to the next person. Your prayer travels with it — forever woven into its story." },
];

const PLANS = [
  { name: "Monthly Sender", price: "$6.99", period: "/mo", desc: "One band delivered every month — 20% off retail. A steady rhythm of prayer passed forward.", badge: "Most Popular" },
  { name: "Quarterly Sender", price: "$7.49", period: "/quarter", desc: "One band every quarter — 10% off retail. A seasonal commitment to intentional giving.", badge: null },
  { name: "Bundle Sender", price: "$14.24", period: "/mo", desc: "Three bands every month — 25% off retail. For those called to spread prayer widely.", badge: "Most Impact" },
];

const STATS = [
  { value: "12,400+", label: "Prayers Recorded" },
  { value: "38", label: "Countries Reached" },
  { value: "5,200+", label: "Bands in the World" },
  { value: "1", label: "God Glorified" },
];

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Components ───────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activePrayer, setActivePrayer] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActivePrayer(p => (p + 1) % PRAYERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy:   #0A1628;
          --navy2:  #0E1E38;
          --navy3:  #132544;
          --gold:   #C8A96E;
          --gold2:  #E2C98A;
          --gold3:  #F0DFA8;
          --cream:  #F5EDD8;
          --white:  #FFFFFF;
          --muted:  rgba(200,169,110,0.45);
          --border: rgba(200,169,110,0.18);
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--navy);
          color: var(--cream);
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          line-height: 1.7;
          overflow-x: hidden;
        }

        .font-display  { font-family: 'Cormorant Garamond', serif; }
        .font-heading  { font-family: 'Cinzel', serif; }

        /* ── Noise overlay ── */
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }

        /* ── Nav ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.4s, backdrop-filter 0.4s, border-color 0.4s;
          border-bottom: 1px solid transparent;
        }
        .nav.scrolled {
          background: rgba(10,22,40,0.92);
          backdrop-filter: blur(20px);
          border-color: var(--border);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 32px;
          height: 72px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo {
          font-family: 'Cinzel', serif;
          font-size: 1.25rem; font-weight: 600;
          color: var(--gold2);
          letter-spacing: 0.08em;
          text-decoration: none;
        }
        .nav-logo span { color: var(--cream); font-weight: 400; }
        .nav-links { display: flex; align-items: center; gap: 36px; }
        .nav-link {
          color: rgba(245,237,216,0.7);
          font-size: 0.8rem; font-weight: 400;
          letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: var(--gold2); }
        .nav-cta {
          background: transparent;
          border: 1px solid var(--gold);
          color: var(--gold2);
          font-family: 'Cinzel', serif;
          font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 10px 24px;
          border-radius: 2px;
          text-decoration: none;
          transition: background 0.25s, color 0.25s;
        }
        .nav-cta:hover { background: var(--gold); color: var(--navy); }
        .nav-toggle {
          display: none;
          flex-direction: column; justify-content: center; gap: 5px;
          width: 40px; height: 40px;
          background: none; border: none; cursor: pointer; padding: 8px;
        }
        .nav-toggle span {
          display: block; width: 22px; height: 2px;
          background: var(--cream); border-radius: 2px;
          transition: transform 0.25s, opacity 0.25s;
        }
        .nav-toggle.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nav-toggle.open span:nth-child(2) { opacity: 0; }
        .nav-toggle.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
        .nav-mobile {
          display: flex; flex-direction: column;
          background: rgba(10,22,40,0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          padding: 8px 24px 16px;
        }
        .nav-mobile-link {
          color: rgba(245,237,216,0.85);
          font-size: 0.95rem; letter-spacing: 0.08em;
          text-decoration: none;
          padding: 15px 4px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nav-mobile-link:last-child {
          border-bottom: none; color: var(--gold2); font-family: 'Cinzel', serif; font-weight: 600;
        }
        @media (min-width: 601px) { .nav-mobile { display: none !important; } }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 120px 32px 80px;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,169,110,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 20% 80%, rgba(123,174,142,0.05) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 50%, #0A1628 100%);
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(200,169,110,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,169,110,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 80%);
        }
        .hero-corner {
          position: absolute;
          width: 200px; height: 200px;
          border: 1px solid rgba(200,169,110,0.12);
        }
        .hero-corner.tl { top: 80px; left: 40px; border-right: none; border-bottom: none; }
        .hero-corner.tr { top: 80px; right: 40px; border-left: none; border-bottom: none; }
        .hero-corner.bl { bottom: 60px; left: 40px; border-right: none; border-top: none; }
        .hero-corner.br { bottom: 60px; right: 40px; border-left: none; border-top: none; }

        .hero-eyebrow {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem; font-weight: 600;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 28px;
          display: flex; align-items: center; gap: 16px;
          position: relative; z-index: 1;
        }
        .hero-eyebrow::before, .hero-eyebrow::after {
          content: '';
          width: 40px; height: 1px;
          background: var(--gold);
          opacity: 0.5;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3.2rem, 8vw, 7rem);
          font-weight: 300;
          line-height: 1.08;
          color: var(--white);
          letter-spacing: -0.01em;
          margin-bottom: 12px;
          position: relative; z-index: 1;
        }
        .hero-title em {
          font-style: italic;
          color: var(--gold2);
        }
        .hero-title .line2 {
          display: block;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .hero-sub {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.1rem, 2vw, 1.4rem);
          font-style: italic;
          color: rgba(245,237,216,0.65);
          margin-top: 20px;
          margin-bottom: 48px;
          position: relative; z-index: 1;
          max-width: 520px;
        }

        .hero-actions {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
          position: relative; z-index: 1;
        }
        .btn-primary {
          background: var(--gold);
          color: var(--navy);
          font-family: 'Cinzel', serif;
          font-size: 0.78rem; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 16px 40px;
          border: none; border-radius: 2px;
          text-decoration: none;
          transition: background 0.25s, transform 0.2s;
          display: inline-block;
        }
        .btn-primary:hover { background: var(--gold2); transform: translateY(-2px); }
        .btn-ghost {
          background: transparent;
          color: var(--cream);
          font-family: 'Cinzel', serif;
          font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 16px 40px;
          border: 1px solid rgba(245,237,216,0.3);
          border-radius: 2px;
          text-decoration: none;
          transition: border-color 0.25s, color 0.25s;
          display: inline-block;
        }
        .btn-ghost:hover { border-color: var(--gold); color: var(--gold2); }

        .hero-scroll {
          position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
          z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
          color: rgba(200,169,110,0.5);
          font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.25em;
          text-transform: uppercase;
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }
        .hero-scroll-line {
          width: 1px; height: 40px;
          background: linear-gradient(to bottom, var(--gold), transparent);
        }

        /* ── Section base ── */
        .section { position: relative; z-index: 1; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
        .section-label {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.35em; text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 16px;
          display: flex; align-items: center; gap: 16px;
        }
        .section-label::after { content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--gold); opacity: 0.4; }
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 600; line-height: 1.15;
          color: var(--white);
        }
        .section-title em { font-style: italic; color: var(--gold2); font-weight: 300; }
        .section-body {
          font-size: 0.95rem;
          color: rgba(245,237,216,0.65);
          max-width: 520px;
          line-height: 1.9;
        }

        /* ── Mission ── */
        .mission {
          padding: 100px 0;
          background: linear-gradient(180deg, var(--navy) 0%, var(--navy2) 50%, var(--navy) 100%);
        }
        .mission-inner {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center;
        }
        .mission-quote {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-style: italic; font-weight: 300;
          line-height: 1.5;
          color: var(--cream);
          border-left: 3px solid var(--gold);
          padding-left: 32px;
          margin-top: 32px;
        }
        .mission-quote cite {
          display: block;
          font-size: 0.8rem; font-style: normal;
          font-family: 'Cinzel', serif;
          letter-spacing: 0.15em;
          color: var(--gold);
          margin-top: 16px;
        }
        .mission-card {
          background: rgba(200,169,110,0.05);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 40px;
        }
        .mission-stat {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3.5rem; font-weight: 300;
          color: var(--gold2); line-height: 1;
          margin-bottom: 8px;
        }
        .mission-stat-label {
          font-size: 0.8rem; letter-spacing: 0.1em;
          color: rgba(245,237,216,0.55);
          text-transform: uppercase;
        }
        .mission-divider {
          width: 100%; height: 1px;
          background: var(--border);
          margin: 24px 0;
        }

        /* ── Stats bar ── */
        .stats-bar {
          background: var(--navy3);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 48px 0;
        }
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          divide-x: 1px solid var(--border);
          text-align: center; gap: 0;
        }
        .stat-item {
          padding: 0 32px;
          border-right: 1px solid var(--border);
        }
        .stat-item:last-child { border-right: none; }
        .stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.8rem; font-weight: 600;
          color: var(--gold2); line-height: 1;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 0.75rem; letter-spacing: 0.12em;
          color: rgba(245,237,216,0.5);
          text-transform: uppercase;
        }

        /* ── How It Works ── */
        .how { padding: 100px 0; }
        .steps-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;
          margin-top: 64px;
          background: var(--border);
        }
        .step-card {
          background: var(--navy);
          padding: 48px 32px;
          position: relative;
          transition: background 0.3s;
        }
        .step-card:hover { background: var(--navy2); }
        .step-num {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.3em; color: var(--gold);
          margin-bottom: 24px;
        }
        .step-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem; font-weight: 600;
          color: var(--white);
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .step-desc {
          font-size: 0.88rem;
          color: rgba(245,237,216,0.6);
          line-height: 1.85;
        }
        .step-line {
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gold), var(--gold2));
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.4s ease;
        }
        .step-card:hover .step-line { transform: scaleX(1); }

        /* ── Prayer Wall ── */
        .wall {
          padding: 100px 0;
          background:
            radial-gradient(ellipse 70% 60% at 80% 30%, rgba(200,169,110,0.10) 0%, transparent 70%),
            linear-gradient(180deg, var(--navy3) 0%, var(--navy2) 100%);
        }
        .wall-inner {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start;
        }
        .prayer-ticker {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(200,169,110,0.32);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .prayer-ticker-header {
          padding: 20px 28px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
          background: rgba(200,169,110,0.08);
        }
        .live-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #4ade80;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .live-label {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem; letter-spacing: 0.2em;
          color: rgba(245,237,216,0.6);
          text-transform: uppercase;
        }
        .prayer-item {
          padding: 24px 28px;
          border-bottom: 1px solid var(--border);
          transition: opacity 0.5s, transform 0.5s;
        }
        .prayer-item:last-child { border-bottom: none; }
        .prayer-meta {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px;
        }
        .prayer-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--gold), var(--navy3));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; font-size: 0.6rem; font-weight: 600;
          color: var(--navy); flex-shrink: 0;
        }
        .prayer-who {
          font-size: 0.78rem; font-weight: 500;
          color: var(--cream);
        }
        .prayer-where {
          font-size: 0.72rem; color: rgba(245,237,216,0.45);
        }
        .prayer-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem; font-style: italic;
          color: rgba(245,237,216,0.92);
          line-height: 1.7;
        }
        .prayer-band {
          margin-top: 8px;
          font-family: 'Cinzel', serif;
          font-size: 0.6rem; letter-spacing: 0.2em;
          color: var(--gold); opacity: 0.7;
        }
        .wall-cta {
          margin-top: 16px; padding: 16px 28px;
          text-align: center;
          border-top: 1px solid var(--border);
        }
        .wall-cta a {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--gold); text-decoration: none;
          transition: color 0.2s;
        }
        .wall-cta a:hover { color: var(--gold2); }

        /* ── Subscriptions ── */
        .subs { padding: 100px 0; }
        .plans-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
          margin-top: 64px;
          background: var(--border);
        }
        .plan-card {
          background: var(--navy);
          padding: 48px 36px;
          position: relative;
          transition: background 0.3s;
        }
        .plan-card:hover { background: var(--navy2); }
        .plan-card.featured { background: var(--navy3); }
        .plan-badge {
          position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
          background: var(--gold);
          color: var(--navy);
          font-family: 'Cinzel', serif;
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          padding: 5px 16px;
          border-radius: 0 0 4px 4px;
        }
        .plan-name {
          font-family: 'Cinzel', serif;
          font-size: 0.8rem; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 20px;
        }
        .plan-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3.5rem; font-weight: 300;
          color: var(--white); line-height: 1;
        }
        .plan-period {
          font-size: 0.85rem;
          color: rgba(245,237,216,0.4);
          margin-left: 4px;
        }
        .plan-divider { width: 100%; height: 1px; background: var(--border); margin: 24px 0; }
        .plan-desc {
          font-size: 0.88rem;
          color: rgba(245,237,216,0.6);
          line-height: 1.85;
          margin-bottom: 32px;
        }
        .plan-btn {
          display: block; width: 100%; text-align: center;
          background: transparent;
          border: 1px solid var(--gold);
          color: var(--gold2);
          font-family: 'Cinzel', serif;
          font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 14px 24px;
          border-radius: 2px;
          text-decoration: none;
          transition: background 0.25s, color 0.25s;
        }
        .plan-btn:hover, .plan-card.featured .plan-btn {
          background: var(--gold); color: var(--navy);
        }
        .plan-card.featured .plan-btn:hover { background: var(--gold2); }

        /* ── Testimonials ── */
        .testimonials { padding: 100px 0; background: var(--navy2); }
        .testi-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
          margin-top: 64px;
        }
        .testi-card {
          background: rgba(200,169,110,0.04);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 40px;
        }
        .testi-stars {
          color: var(--gold); font-size: 0.8rem;
          margin-bottom: 20px; letter-spacing: 4px;
        }
        .testi-quote {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; font-style: italic;
          color: rgba(245,237,216,0.85);
          line-height: 1.75;
          margin-bottom: 28px;
        }
        .testi-author {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem; letter-spacing: 0.15em;
          color: var(--gold);
        }
        .testi-place {
          font-size: 0.75rem;
          color: rgba(245,237,216,0.4);
          margin-top: 4px;
        }

        /* ── Ministry CTA ── */
        .ministry { padding: 100px 0; }
        .ministry-inner {
          background: rgba(200,169,110,0.06);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 80px;
          display: grid; grid-template-columns: 1fr auto; gap: 60px; align-items: center;
        }
        .ministry-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          font-weight: 600; color: var(--white);
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .ministry-desc {
          font-size: 0.92rem;
          color: rgba(245,237,216,0.6);
          line-height: 1.85;
        }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 60px 0 40px;
          background: #080F1E;
        }
        .footer-inner {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px;
          margin-bottom: 48px;
        }
        .footer-brand {
          font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 600;
          color: var(--gold2); letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .footer-tagline {
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          color: rgba(245,237,216,0.45); font-size: 0.92rem; line-height: 1.7;
          max-width: 260px;
        }
        .footer-col-title {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 20px;
        }
        .footer-link {
          display: block; color: rgba(245,237,216,0.5);
          font-size: 0.85rem; text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.2s;
        }
        .footer-link:hover { color: var(--gold2); }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: 32px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-copy {
          font-size: 0.78rem; color: rgba(245,237,216,0.3);
        }
        .footer-verse {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-size: 0.85rem;
          color: rgba(200,169,110,0.5);
        }

        /* ── Gold section treatment (breaks up the navy; navy text on gold) ── */
        .section--gold { background: linear-gradient(180deg, #E4CE93 0%, #D2B26A 100%); }
        .section--gold .section-label { color: var(--navy); }
        .section--gold .section-label::after { background: var(--navy); opacity: 0.3; }
        .section--gold .section-title { color: var(--navy); }
        .section--gold .section-title em { color: #5A3E12; }
        .section--gold .section-body { color: rgba(10,22,40,0.72); }
        /* How It Works */
        .section--gold .steps-grid { background: rgba(10,22,40,0.18); }
        .section--gold .step-card { background: rgba(255,255,255,0.82); }
        .section--gold .step-card:hover { background: rgba(255,255,255,0.95); }
        .section--gold .step-num { color: #5A3E12; }
        .section--gold .step-title { color: var(--navy); }
        .section--gold .step-desc { color: rgba(10,22,40,0.72); }
        .section--gold .step-line { background: linear-gradient(90deg, var(--navy), #5A3E12); }
        /* Testimonials */
        .section--gold .testi-card { background: rgba(255,255,255,0.4); border-color: rgba(10,22,40,0.15); }
        .section--gold .testi-stars { color: #5A3E12; }
        .section--gold .testi-quote { color: rgba(10,22,40,0.85); }
        .section--gold .testi-author { color: var(--navy); }
        .section--gold .testi-place { color: rgba(10,22,40,0.5); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .mission-inner, .wall-inner, .ministry-inner { grid-template-columns: 1fr; gap: 48px; }
          .steps-grid, .plans-grid { grid-template-columns: 1fr 1fr; }
          .testi-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .footer-inner { grid-template-columns: 1fr 1fr; }
          .hero-corner { display: none; }
          .ministry-inner { padding: 48px; }
        }
        @media (max-width: 600px) {
          .steps-grid, .plans-grid, .stats-grid { grid-template-columns: 1fr; }
          .nav-links { display: none; }
          .nav-toggle { display: flex; }
          .container { padding: 0 20px; }
          .hero { padding: 100px 20px 60px; }
          .footer-inner { grid-template-columns: 1fr; }
          .ministry-inner { padding: 32px; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className={`nav${scrolled || menuOpen ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><PrayerBandsLogo size={26} color="#E2C98A" />Prayer<span>Bands</span></Link>
          <div className="nav-links">
            <Link href="#mission" className="nav-link">Our Mission</Link>
            <Link href="#how" className="nav-link">How It Works</Link>
            <Link href="#wall" className="nav-link">Prayer Network</Link>
            <Link href="/store" className="nav-link">Store</Link>
            <Link href="/contact" className="nav-link">Contact</Link>
            <Link href="/signin" className="nav-cta">Sign In</Link>
          </div>
          <button
            className={`nav-toggle${menuOpen ? " open" : ""}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="nav-mobile">
            <Link href="#mission" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Our Mission</Link>
            <Link href="#how" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>How It Works</Link>
            <Link href="#wall" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Prayer Network</Link>
            <Link href="/store" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Store</Link>
            <Link href="/contact" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Contact</Link>
            <Link href="/signin" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-corner tl" />
        <div className="hero-corner tr" />
        <div className="hero-corner bl" />
        <div className="hero-corner br" />

        <div className="hero-eyebrow" style={{ animationDelay: "0ms", opacity: 1 }}>
          Uniting Believers Through Technology
        </div>

        <h1 className="hero-title">
          <em>Connect</em> Through
          <span className="line2">Prayer, Worldwide</span>
        </h1>

        <p className="hero-sub">
          A simple band. A living prayer chain. Passed hand to hand,
          country to country — carrying faith across every distance.
        </p>

        <div className="hero-actions">
          <Link href="/store" className="btn-primary">Get Your Band</Link>
          <Link href="#how" className="btn-ghost">See How It Works</Link>
        </div>

        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          Scroll
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="stats-bar section">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((s) => (
              <Reveal key={s.label} className="stat-item">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mission ── */}
      <section id="mission" className="mission section">
        <div className="container">
          <div className="mission-inner">
            <Reveal>
              <div className="section-label">Our Mission</div>
              <h2 className="section-title">
                Bringing People Together<br />
                in <em>Prayer</em>, No Matter<br />
                the Distance
              </h2>
              <div className="mission-quote">
                "The prayer of a righteous person is powerful and effective."
                <cite>— James 5:16</cite>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="mission-card">
                <div className="section-body" style={{ maxWidth: "100%", marginBottom: "32px" }}>
                  Every PrayerBand begins with a single act of faith — someone who cares enough to pray for another person. That prayer doesn't disappear. It becomes embedded in the band, carried forward as it passes from hand to hand, building a living chain of intercession that spans cities, countries, and generations.
                </div>
                <div className="mission-divider" />
                <div className="mission-stat">38+</div>
                <div className="mission-stat-label">Countries where bands have traveled</div>
                <div className="mission-divider" />
                <div className="mission-stat">12,400</div>
                <div className="mission-stat-label">Prayers recorded in the network</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="how section section--gold">
        <div className="container">
          <Reveal>
            <div className="section-label">How It Works</div>
            <h2 className="section-title">Four Steps.<br /><em>One Unbroken Chain.</em></h2>
          </Reveal>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 100}>
                <div className="step-card">
                  <div className="step-line" />
                  <div className="step-num">{s.num}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prayer Wall ── */}
      <section id="wall" className="wall section">
        <div className="container">
          <div className="wall-inner">
            <Reveal>
              <div className="section-label">Live Prayer Wall</div>
              <h2 className="section-title">Believers Praying<br /><em>Right Now</em></h2>
              <p className="section-body" style={{ marginTop: "24px" }}>
                Every prayer attached to a band is a real act of faith from a real person. Watch the network grow in real time — names, places, and words of prayer from around the world.
              </p>
              <div style={{ marginTop: "40px" }}>
                <Link href="/prayer-wall" className="btn-primary">View Full Prayer Wall</Link>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="prayer-ticker">
                <div className="prayer-ticker-header">
                  <div className="live-dot" />
                  <div className="live-label">Live — Updating Now</div>
                </div>
                {PRAYERS.map((p, i) => (
                  <div
                    key={p.band}
                    className="prayer-item"
                    style={{
                      opacity: i === activePrayer ? 1 : i === (activePrayer + 1) % PRAYERS.length || i === (activePrayer - 1 + PRAYERS.length) % PRAYERS.length ? 0.78 : 0.55,
                      background: i === activePrayer ? "rgba(200,169,110,0.12)" : "transparent",
                    }}
                  >
                    <div className="prayer-meta">
                      <div className="prayer-avatar">{p.initials}</div>
                      <div>
                        <div className="prayer-who">{p.initials}</div>
                        <div className="prayer-where">{p.location} · {p.time}</div>
                      </div>
                    </div>
                    <div className="prayer-text">&ldquo;{p.text}&rdquo;</div>
                    <div className="prayer-band">{p.band}</div>
                  </div>
                ))}
                <div className="wall-cta">
                  <a href="/prayer-wall">See all prayers →</a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Subscriptions ── */}
      <section id="subscribe" className="subs section">
        <div className="container">
          <Reveal>
            <div className="section-label">Subscription Bands</div>
            <h2 className="section-title">Keep the<br /><em>Chain Growing</em></h2>
            <p className="section-body" style={{ marginTop: "16px" }}>
              Receive new bands on a schedule — so you always have one ready to give. Each band is a prayer waiting to begin its journey.
            </p>
          </Reveal>
          <div className="plans-grid">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 100}>
                <div className={`plan-card${p.badge ? " featured" : ""}`}>
                  {p.badge && <div className="plan-badge">{p.badge}</div>}
                  <div className="plan-name">{p.name}</div>
                  <div>
                    <span className="plan-price">{p.price}</span>
                    <span className="plan-period">{p.period}</span>
                  </div>
                  <div className="plan-divider" />
                  <div className="plan-desc">{p.desc}</div>
                  <Link href="/subscribe" className="plan-btn">Subscribe</Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials section section--gold">
        <div className="container">
          <Reveal>
            <div className="section-label">Stories</div>
            <h2 className="section-title">What People<br /><em>Are Saying</em></h2>
          </Reveal>
          <div className="testi-grid">
            {[
              { q: "I received a band from a stranger at a coffee shop. When I tapped it and read the prayers — I wept. Someone I'd never met had been praying for exactly what I was going through.", a: "Rachel M.", where: "Austin, TX" },
              { q: "We gave 50 bands at our youth retreat. Three months later, kids are still texting me photos of where their bands have traveled. It started conversations about faith I never expected.", a: "Pastor James L.", where: "Atlanta, GA" },
              { q: "My mother passed this band to me on her deathbed. It now holds her prayer. I will pass it to my daughter. This isn't just a product — it's a legacy.", a: "Anonymous", where: "Dublin, Ireland" },
            ].map((t, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="testi-card">
                  <div className="testi-stars">★★★★★</div>
                  <div className="testi-quote">&ldquo;{t.q}&rdquo;</div>
                  <div className="testi-author">{t.a}</div>
                  <div className="testi-place">{t.where}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ministry CTA ── */}
      <section className="ministry section">
        <div className="container">
          <Reveal>
            <div className="ministry-inner">
              <div>
                <div className="section-label">Churches & Ministries</div>
                <div className="ministry-title">Equip Your Congregation<br />to Pray Without Ceasing</div>
                <p className="ministry-desc">
                  Bulk pricing for churches, youth groups, and mission organizations. Give every member a band and watch your prayer culture transform. We offer 10–20% discounts on orders of 50+.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
                <Link href="/store" className="btn-primary">Shop Bulk Orders</Link>
                <Link href="/contact" className="btn-ghost">Talk to Us</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer section">
        <div className="container">
          <div className="footer-inner">
            <div>
              <div className="footer-brand">PrayerBands</div>
              <div className="footer-tagline">
                A living chain of prayer, passed hand to hand, carried by faith around the world.
              </div>
            </div>
            <div>
              <div className="footer-col-title">Platform</div>
              <Link href="/store" className="footer-link">Get Bands</Link>
              <Link href="/subscribe" className="footer-link">Subscribe</Link>
              <Link href="/prayer-wall" className="footer-link">Prayer Wall</Link>
              <Link href="/dashboard" className="footer-link">My Dashboard</Link>
            </div>
            <div>
              <div className="footer-col-title">About</div>
              <Link href="/about" className="footer-link">Our Story</Link>
              <Link href="/contact" className="footer-link">Contact</Link>
              <Link href="/faq" className="footer-link">FAQ</Link>
            </div>
            <div>
              <div className="footer-col-title">Account</div>
              <Link href="/signin" className="footer-link">Sign In</Link>
              <Link href="/signin" className="footer-link">Create Account</Link>
              <Link href="/dashboard" className="footer-link">Dashboard</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} PrayerBands. All rights reserved.</div>
            <div className="footer-verse">"Pray without ceasing." — 1 Thessalonians 5:17</div>
          </div>
        </div>
      </footer>
    </>
  );
}
