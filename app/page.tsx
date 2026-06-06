'use client'
import { useState, useEffect, useRef } from "react";
import Logo from "@/components/Logo";
import Icon, { type IconName } from "@/components/Icon";

const NAV_LINKS = [
  { label: "Our Story", href: "#story" },
  { label: "How It Works", href: "#how" },
  { label: "Mission", href: "#mission" },
  { label: "Prayer Wall", href: "#wall" },
  { label: "Get Bands", href: "#store", cta: true },
];

const JOURNEY_STEPS = [
  {
    icon: "🙏",
    title: "Receive a Band",
    desc: "Someone places a PrayerBand on your wrist. That act alone is a prayer for you — no app required, no obligation.",
    color: "#C8A96E",
  },
  {
    icon: "✦",
    title: "Scan & See Your Journey",
    desc: "Tap the NFC chip or visit PrayerBands.com. See every prayer left for you, and every place the band has traveled.",
    color: "#7BAE8E",
  },
  {
    icon: "💫",
    title: "Pass It Forward",
    desc: "When you feel led, pass your band to someone else. Your prayer travels with it — forever woven into its story.",
    color: "#7B8FAE",
  },
];

const PRAYERS = [
  {
    band: "PB-47291",
    location: "Nashville, TN",
    time: "2 hours ago",
    prayer: "Lord, cover whoever holds this band with Your peace that passes all understanding.",
    initials: "M.R.",
    color: "#C8A96E",
  },
  {
    band: "PB-18834",
    location: "Lagos, Nigeria",
    time: "5 hours ago",
    prayer: "Father, let Your light shine through every hand this band passes through.",
    initials: "A.O.",
    color: "#7BAE8E",
  },
  {
    band: "PB-92011",
    location: "São Paulo, Brazil",
    time: "8 hours ago",
    prayer: "May this band carry hope to someone who needs it today. In Jesus' name.",
    initials: "C.F.",
    color: "#7B8FAE",
  },
  {
    band: "PB-33107",
    location: "Seoul, South Korea",
    time: "Yesterday",
    prayer: "I pray for healing, restoration, and renewal for everyone this touches.",
    initials: "J.K.",
    color: "#B07BAE",
  },
  {
    band: "PB-65498",
    location: "Birmingham, UK",
    time: "Yesterday",
    prayer: "God, let this small band carry Your immeasurable love around the world.",
    initials: "S.H.",
    color: "#AE7B7B",
  },
  {
    band: "PB-20044",
    location: "Austin, TX",
    time: "2 days ago",
    prayer: "Bless the hands that hold this. You know exactly who they are.",
    initials: "D.W.",
    color: "#6E8FAE",
  },
];

const STATS = [
  { value: "14,200+", label: "Bands in the World" },
  { value: "47", label: "Countries Reached" },
  { value: "91,000+", label: "Prayers Left" },
  { value: "∞", label: "Chains of Grace" },
];

function useScrollReveal(ref: React.RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function RevealSection({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  const ref = useRef(null);
  const visible = useScrollReveal(ref);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default function PrayerBandsHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activePrayer, setActivePrayer] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: "#FDFAF5", color: "#2C1A0E", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        .nav-link { 
          font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.12em; 
          text-transform: uppercase; color: #5C3D2E; text-decoration: none; 
          transition: color 0.2s; cursor: pointer; background: none; border: none; padding: 0;
        }
        .nav-link:hover { color: #C8A96E; }
        .cta-btn {
          font-family: 'Lato', sans-serif; font-size: 13px; letter-spacing: 0.12em;
          text-transform: uppercase; background: #C8A96E; color: #fff;
          border: none; padding: 10px 22px; cursor: pointer; border-radius: 3px;
          transition: background 0.2s, transform 0.15s;
        }
        .cta-btn:hover { background: #B8944A; transform: translateY(-1px); }
        .cta-btn-outline {
          font-family: 'Lato', sans-serif; font-size: 14px; letter-spacing: 0.1em;
          text-transform: uppercase; background: transparent; color: #C8A96E;
          border: 1.5px solid #C8A96E; padding: 13px 32px; cursor: pointer; border-radius: 3px;
          transition: all 0.2s;
        }
        .cta-btn-outline:hover { background: #C8A96E; color: #fff; }
        .prayer-card {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 8px; padding: 24px;
          transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;
        }
        .prayer-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(44,26,14,0.10); }
        .step-card {
          background: #fff; border: 1px solid #E8DFD0; border-radius: 10px; padding: 36px 28px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(44,26,14,0.09); }
        .stat-item { text-align: center; padding: 24px 16px; }
        .divider { width: 48px; height: 2px; background: #C8A96E; margin: 0 auto; }
        .section-label {
          font-family: 'Lato', sans-serif; font-size: 11px; letter-spacing: 0.22em;
          text-transform: uppercase; color: #C8A96E; margin-bottom: 12px; display: block;
        }
        .mobile-menu {
          position: fixed; inset: 0; background: #FDFAF5; z-index: 200;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 40px;
        }
        .band-tag {
          font-family: 'Lato', sans-serif; font-size: 10px; letter-spacing: 0.18em;
          text-transform: uppercase; padding: 3px 10px; border-radius: 20px;
          display: inline-block;
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
          .hero-inner { padding: 48px 20px !important; }
          .hero-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          .hero-grid > div:last-child { max-width: 100% !important; margin: 0 auto; overflow: visible; }
          .hero-stats { flex-wrap: wrap; gap: 22px !important; }
          .hero-copy { max-width: 100% !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .prayers-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .mission-inner { grid-template-columns: 1fr !important; }
          .footer-cols { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(253,250,245,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #E8DFD0" : "none",
        transition: "all 0.3s ease",
        padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => scrollTo("#hero")}>
            <Logo size={34} />
            <span className="playfair" style={{ fontSize: 20, fontWeight: 600, color: "#2C1A0E", letterSpacing: "0.02em" }}>PrayerBands</span>
          </div>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {NAV_LINKS.map(link =>
              link.cta
                ? <button key={link.label} className="cta-btn" onClick={() => scrollTo(link.href)}>{link.label}</button>
                : <button key={link.label} className="nav-link" onClick={() => scrollTo(link.href)}>{link.label}</button>
            )}
            <a href="/subscribe" className="nav-link" style={{ color: "#C8A96E", textDecoration: "none" }}>Subscribe</a>
            <a href="/signin" className="nav-link" style={{ color: "#7BAE8E", textDecoration: "none" }}>Sign In</a>
          </div>

          {/* Hamburger */}
          <button
            className="hamburger"
            style={{ display: "none", flexDirection: "column", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 4 }}
            onClick={() => setMenuOpen(true)}
          >
            {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 24, height: 1.5, background: "#2C1A0E" }} />)}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <button onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: 24, right: 32, background: "none", border: "none", fontSize: 28, cursor: "pointer", color: "#2C1A0E" }}>×</button>
          {NAV_LINKS.map(link => (
            <button key={link.label} className="nav-link" style={{ fontSize: 18, letterSpacing: "0.15em" }} onClick={() => scrollTo(link.href)}>{link.label}</button>
          ))}
          <a href="/subscribe" className="nav-link" style={{ fontSize: 18, color: "#C8A96E", textDecoration: "none" }}>Subscribe</a>
          <a href="/signin" className="nav-link" style={{ fontSize: 18, color: "#7BAE8E", textDecoration: "none" }}>Sign In</a>
        </div>
      )}

      {/* HERO */}
      <section id="hero" style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: 68 }}>
        {/* Background texture */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 40%, rgba(200,169,110,0.10) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(123,174,142,0.08) 0%, transparent 55%)",
        }} />
        {/* Subtle cross motif */}
        <div style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)", fontSize: 400, color: "rgba(200,169,110,0.06)", fontFamily: "serif", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>✝</div>

        <div className="hero-inner" style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 32px", width: "100%", position: "relative" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            {/* Left */}
            <div>
              <span className="section-label" style={{ animationDelay: "0s" }}>A Movement of Prayer</span>
              <h1 className="playfair" style={{ fontSize: "clamp(42px, 6vw, 72px)", lineHeight: 1.1, fontWeight: 700, color: "#2C1A0E", marginBottom: 24 }}>
                Every Band<br />
                <em style={{ color: "#C8A96E", fontStyle: "italic" }}>Carries a Prayer</em>
              </h1>
              <div style={{ width: 48, height: 2, background: "#C8A96E", marginBottom: 28 }} />
              <p className="lato hero-copy" style={{ fontSize: 18, lineHeight: 1.8, color: "#6B4C35", maxWidth: 460, marginBottom: 40, fontWeight: 300 }}>
                A wristband. A unique ID. A digital journey around the world. When you place a PrayerBand on someone's wrist, you are praying for them — no words required.
              </p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <a href="/store" style={{ textDecoration: "none" }}><button className="cta-btn" style={{ fontSize: 14, padding: "14px 36px" }}>Get Bands</button></a>
                <button className="cta-btn-outline" onClick={() => scrollTo("#how")}>See How It Works</button>
              </div>
              <div className="lato hero-stats" style={{ marginTop: 48, display: "flex", gap: 40 }}>
                {[["14,200+", "Bands Active"], ["47", "Countries"], ["91K+", "Prayers"]].map(([num, lbl]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#C8A96E" }}>{num}</div>
                    <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9B7B62", marginTop: 2 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – Band Visualization */}
<div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden" }}>
  <div style={{ position: "relative", width: "min(320px, 80vw)", height: "min(320px, 80vw)" }}>
                {/* Glow */}
                <div style={{ position: "absolute", inset: 20, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,110,0.18) 0%, transparent 70%)" }} />
                {/* Band ring */}
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: "28px solid transparent",
                  borderImage: "none",
                  background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #C8A96E, #7BAE8E, #7B8FAE, #C8A96E) border-box",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>✝</div>
                    <div className="lato" style={{ fontSize: 11, letterSpacing: "0.2em", color: "#9B7B62", textTransform: "uppercase" }}>PrayerBands.com</div>
                    <div className="playfair" style={{ fontSize: 18, color: "#C8A96E", marginTop: 8, fontStyle: "italic" }}>PB-47291</div>
                  </div>
                </div>
                {/* Orbit dots */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <div key={i} style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: `rotate(${deg}deg) translateX(min(160px, 40vw)) translateY(-50%)`,
                    width: 8, height: 8, borderRadius: "50%",
                    background: ["#C8A96E","#7BAE8E","#7B8FAE","#C8A96E","#AE7B7B","#6E8FAE"][i],
                    boxShadow: `0 0 8px 2px ${["#C8A96E","#7BAE8E","#7B8FAE","#C8A96E","#AE7B7B","#6E8FAE"][i]}44`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.5 }}>
          <div className="lato" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9B7B62" }}>Scroll</div>
          <div style={{ width: 1, height: 36, background: "linear-gradient(#C8A96E, transparent)" }} />
        </div>
      </section>

      {/* STORY */}
      <section id="story" style={{ padding: "100px 32px", background: "#F5EFE4" }}>
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-label">Our Story</span>
              <h2 className="playfair" style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 600, lineHeight: 1.2, marginBottom: 24 }}>
                Born from a Simple Conviction
              </h2>
              <div className="divider" />
            </div>
          </RevealSection>

          <RevealSection>
            <div style={{ display: "grid", gap: 32 }}>
              {[
                { quote: false, text: "It started with a question: what if the act of giving someone something small could be a complete prayer in itself?" },
                { quote: true, text: "\"I'm praying for you\" means everything — but it can feel empty without evidence. A PrayerBand is evidence. It's a physical covenant that says: I have placed you before God, and this band will carry that prayer wherever it travels." },
                { quote: false, text: "Every band holds a unique ID. Every tap of an NFC chip opens a digital record — not just of who has held it, but of every prayer ever prayed through it. Communities form. Chains of intercession stretch across cities, continents, generations." },
                { quote: false, text: "You don't have to be a pastor to start a movement. You just have to be willing to slip a band on someone's wrist." },
              ].map((block, i) => (
                <p
                  key={i}
                  className={block.quote ? "playfair" : "lato"}
                  style={{
                    fontSize: block.quote ? 22 : 17,
                    lineHeight: 1.85,
                    color: block.quote ? "#5C3D2E" : "#6B4C35",
                    fontStyle: block.quote ? "italic" : "normal",
                    fontWeight: block.quote ? 400 : 300,
                    paddingLeft: block.quote ? 24 : 0,
                    borderLeft: block.quote ? "3px solid #C8A96E" : "none",
                  }}
                >
                  {block.text}
                </p>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "100px 32px", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-label">How It Works</span>
              <h2 className="playfair" style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 600, lineHeight: 1.2, marginBottom: 24 }}>
                Prayer Made Tangible
              </h2>
              <div className="divider" />
            </div>
          </RevealSection>

          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {JOURNEY_STEPS.map((step, i) => (
              <RevealSection key={i} style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="step-card">
                  <div style={{ fontSize: 40, marginBottom: 20 }}>{step.icon}</div>
                  <div className="lato" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: step.color, marginBottom: 10, fontWeight: 700 }}>Step {i + 1}</div>
                  <h3 className="playfair" style={{ fontSize: 22, fontWeight: 600, marginBottom: 14, color: "#2C1A0E" }}>{step.title}</h3>
                  <p className="lato" style={{ fontSize: 15, lineHeight: 1.75, color: "#6B4C35", fontWeight: 300 }}>{step.desc}</p>
                  <div style={{ marginTop: 24, width: 28, height: 2, background: step.color }} />
                </div>
              </RevealSection>
            ))}
          </div>

          {/* NFC callout */}
          <RevealSection>
            <div style={{ marginTop: 56, background: "linear-gradient(135deg, #2C1A0E, #4A2E1A)", borderRadius: 12, padding: "40px 48px", display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
              <div style={{ fontSize: 48 }}>📡</div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 className="playfair" style={{ fontSize: 24, color: "#FDFAF5", marginBottom: 10 }}>NFC-Enabled Bands</h3>
                <p className="lato" style={{ fontSize: 15, color: "#C8A96E", lineHeight: 1.75, fontWeight: 300 }}>Each band contains an NFC chip — just tap any smartphone to instantly open the band's journey page. No app download needed.</p>
              </div>
              <button className="cta-btn" style={{ whiteSpace: "nowrap" }} onClick={() => {}}>Learn More</button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* MISSION */}
      <section id="mission" style={{ padding: "100px 32px", background: "#2C1A0E", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 30% 50%, rgba(200,169,110,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,174,142,0.07) 0%, transparent 50%)" }} />
        <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative" }}>
          <div className="mission-inner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <RevealSection>
              <span className="section-label" style={{ color: "#C8A96E" }}>Our Mission</span>
              <h2 className="playfair" style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 600, color: "#FDFAF5", lineHeight: 1.2, marginBottom: 28 }}>
                A Band Around<br />
                <em style={{ color: "#C8A96E" }}>Every Wrist on Earth</em>
              </h2>
              <div style={{ width: 48, height: 2, background: "#C8A96E", marginBottom: 32 }} />
              <p className="lato" style={{ fontSize: 16, lineHeight: 1.85, color: "#C8B49A", fontWeight: 300, marginBottom: 24 }}>
                We believe the Church is not a building — it's a network of people praying for one another across every divide. PrayerBands exists to make that network visible, trackable, and impossible to ignore.
              </p>
              <p className="lato" style={{ fontSize: 16, lineHeight: 1.85, color: "#C8B49A", fontWeight: 300 }}>
                Every registration is a data point in a global map of intercession. Every passed band is a thread connecting strangers through a shared act of faith.
              </p>
            </RevealSection>

            <RevealSection>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[
                  { icon: "🌍", label: "Global Reach", desc: "Bands tracked across 47 countries and counting" },
                  { icon: "⛪", label: "Church Packs", desc: "Bulk orders with custom ministry prefixes" },
                  { icon: "🔗", label: "Prayer Chains", desc: "Infinite-depth lineage — your prayers ripple forever" },
                  { icon: "📊", label: "Ministry Insights", desc: "See your community's impact on a live dashboard" },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: "rgba(253,250,245,0.05)", border: "1px solid rgba(200,169,110,0.15)",
                    borderRadius: i === 0 ? "8px 0 0 0" : i === 1 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 0 8px 0",
                    padding: "28px 24px",
                  }}>
                    <div style={{ fontSize: 30, marginBottom: 12 }}>{item.icon}</div>
                    <div className="playfair" style={{ fontSize: 16, color: "#FDFAF5", marginBottom: 8, fontWeight: 600 }}>{item.label}</div>
                    <div className="lato" style={{ fontSize: 13, color: "#9B7B62", lineHeight: 1.6, fontWeight: 300 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "64px 32px", background: "#F5EFE4", borderTop: "1px solid #E8DFD0", borderBottom: "1px solid #E8DFD0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {STATS.map((stat, i) => (
              <RevealSection key={i}>
                <div className="stat-item" style={{ borderRight: i < STATS.length - 1 ? "1px solid #E8DFD0" : "none" }}>
                  <div className="playfair" style={{ fontSize: 42, fontWeight: 700, color: "#C8A96E", marginBottom: 8 }}>{stat.value}</div>
                  <div className="lato" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9B7B62" }}>{stat.label}</div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* PRAYER WALL FEED */}
      <section id="wall" style={{ padding: "100px 32px", background: "#FDFAF5" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <RevealSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="section-label">Live Prayer Wall</span>
              <h2 className="playfair" style={{ fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 600, lineHeight: 1.2, marginBottom: 24 }}>
                Prayers From Around the World
              </h2>
              <div className="divider" style={{ marginBottom: 16 }} />
              <p className="lato" style={{ fontSize: 15, color: "#9B7B62", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
                Each card below represents a real prayer left on a real band, traveling through real hands.
              </p>
            </div>
          </RevealSection>

          <div className="prayers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {PRAYERS.map((p, i) => (
              <RevealSection key={i} style={{ transitionDelay: `${(i % 3) * 0.1}s` }}>
                <div
                  className="prayer-card"
                  onClick={() => setActivePrayer(activePrayer === i ? null : i)}
                  style={{ borderTop: `3px solid ${p.color}` }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="lato" style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{p.initials}</span>
                      </div>
                      <div>
                        <span className="band-tag" style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}44` }}>{p.band}</span>
                        <div className="lato" style={{ fontSize: 11, color: "#9B7B62", marginTop: 3 }}>📍 {p.location}</div>
                      </div>
                    </div>
                    <div className="lato" style={{ fontSize: 11, color: "#C8B49A", textAlign: "right" }}>{p.time}</div>
                  </div>
                  <p className="playfair" style={{ fontSize: 15, lineHeight: 1.8, color: "#5C3D2E", fontStyle: "italic" }}>"{p.prayer}"</p>
                </div>
              </RevealSection>
            ))}
          </div>

          <RevealSection>
            <div style={{ textAlign: "center", marginTop: 52 }}>
              <a href="/prayer-wall" style={{ textDecoration: "none" }}><button className="cta-btn-outline">See Full Prayer Wall</button></a>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* STORE CTA */}
      <section id="store" style={{ padding: "100px 32px", background: "linear-gradient(160deg, #F5EFE4 0%, #EDE3D1 100%)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <RevealSection>
            <span className="section-label">Get Started</span>
            <h2 className="playfair" style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 600, lineHeight: 1.15, marginBottom: 24 }}>
              Start Your Chain<br />
              <em style={{ color: "#C8A96E" }}>of Intercession</em>
            </h2>
            <div className="divider" style={{ marginBottom: 32 }} />
            <p className="lato" style={{ fontSize: 17, lineHeight: 1.8, color: "#6B4C35", maxWidth: 520, margin: "0 auto 48px", fontWeight: 300 }}>
              Individual bands. Church packs. Mission quantities. Every order ships NFC-enabled and engraved, ready to carry a prayer.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/store" style={{ textDecoration: "none" }}><button className="cta-btn" style={{ fontSize: 15, padding: "16px 44px" }}>Shop Bands</button></a>
              <a href="/store#packs" style={{ textDecoration: "none" }}><button className="cta-btn-outline">Church & Bulk Orders</button></a>
            </div>
            <div className="lato" style={{ marginTop: 32, fontSize: 13, color: "#9B7B62", letterSpacing: "0.08em" }}>
              Starting at $5 per band · Ships worldwide · NFC + Laser-engraved ID
            </div>
          </RevealSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#1A0F06", padding: "72px 32px 40px", color: "#C8B49A" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div className="footer-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 56, marginBottom: 56 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Logo size={30} color="#FDFAF5" />
                <span className="playfair" style={{ fontSize: 18, color: "#FDFAF5", fontWeight: 600 }}>PrayerBands</span>
              </div>
              <p className="lato" style={{ fontSize: 13, lineHeight: 1.85, fontWeight: 300, maxWidth: 280 }}>
                A global ministry platform connecting people through prayer, one wristband at a time.
              </p>
              <div style={{ display: "flex", gap: 14, marginTop: 24 }}>
                {[
                  { label: "IG", icon: "instagram" as IconName },
                  { label: "FB", icon: "facebook" as IconName },
                  { label: "TW", icon: "twitter" as IconName },
                  { label: "YT", icon: null },
                ].map(s => (
                  <div key={s.label} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(200,169,110,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    {s.icon
                      ? <Icon name={s.icon} size={15} color="#C8A96E" bg="#1A0F06" />
                      : <span className="lato" style={{ fontSize: 10, color: "#C8A96E", fontWeight: 700 }}>{s.label}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: "Ministry", links: ["Our Story", "Mission", "Prayer Wall", "Band Journeys"] },
              { title: "Store", links: ["Individual Bands", "Church Packs", "Custom Orders", "Track My Order"] },
              { title: "Account", links: ["Sign In", "My Dashboard", "My Bands", "Settings"] },
            ].map(col => (
              <div key={col.title}>
                <div className="lato" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#C8A96E", marginBottom: 20, fontWeight: 700 }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ marginBottom: 12 }}>
                    <a className="lato" style={{ fontSize: 13, color: "#9B7B62", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
                       onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = "#C8A96E"}
onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = "#9B7B62"}>{link}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(200,169,110,0.12)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div className="lato" style={{ fontSize: 12, color: "#5C3D2E", fontWeight: 300 }}>
              © 2026 PrayerBands.com · Carrying His word around the world
            </div>
            <div style={{ display: "flex", gap: 28 }}>
              {["Privacy", "Terms", "Contact"].map(l => (
                <a key={l} className="lato" style={{ fontSize: 12, color: "#5C3D2E", textDecoration: "none", cursor: "pointer" }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}