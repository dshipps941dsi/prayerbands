"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import PrayerBandsLogo from "@/components/PrayerBandsLogo";
import SiteFooter from "@/components/SiteFooter";

// ─── Types ────────────────────────────────────────────────────────────────────
type MapPoint = { lat: number; lng: number; name: string; loc: string; band: string; prayer: string };
type FeedPrayer = { initials: string; name: string; location: string; text: string; band: string; time: string };

// ─── Sample fallbacks (used until real activity surpasses the floor) ────────────
const SAMPLE_FEED: FeedPrayer[] = [
  { initials: "S.P.", name: "Sarah P.", location: "Dallas, TX", text: "Please pray for healing and peace as I go through this uncertain time.", band: "PB-47291", time: "2h ago" },
  { initials: "J.D.", name: "John D.", location: "Phoenix, AZ", text: "Starting a new job search. Would love your prayers!", band: "PB-18834", time: "5h ago" },
  { initials: "E.R.", name: "Emily R.", location: "Tampa, FL", text: "Our baby is finally home! Thank you for all your prayers.", band: "PB-92011", time: "1d ago" },
  { initials: "D.M.", name: "David M.", location: "Columbus, OH", text: "Deployment next week. Pray for my family.", band: "PB-33107", time: "1d ago" },
];

const TOP_COUNTRIES_SAMPLE = [
  { country: "United States", count: 128942 },
  { country: "Canada", count: 18732 },
  { country: "Australia", count: 9614 },
  { country: "Philippines", count: 7808 },
  { country: "United Kingdom", count: 6215 },
];

const STEPS = [
  { num: "1", img: "/home/step-1.png", title: "Wear Your Band", desc: "A daily reminder of your faith on your wrist." },
  { num: "2", img: "/home/step-2.png", title: "Tap Your Phone", desc: "NFC technology makes it simple. Just tap & go." },
  { num: "3", img: "/home/step-3.png", title: "Connect", desc: "Join prayer circles and encourage others." },
  { num: "4", img: "/home/step-4.png", title: "Receive Daily Verses", desc: "Get a new, personalized verse every day." },
  { num: "5", img: "/home/step-5.png", title: "See Your Impact", desc: "Track where your band has traveled and the lives it's touched." },
];

const TOPICS = [
  { label: "Anxiety", verse: "Do not be anxious about anything…", ref: "Philippians 4:6" },
  { label: "Grief", verse: "Blessed are those who mourn…", ref: "Matthew 5:4" },
  { label: "Strength", verse: "I can do all things through Christ…", ref: "Philippians 4:13" },
  { label: "Hope", verse: "For I know the plans I have for you…", ref: "Jeremiah 29:11" },
];

const GIFTS = [
  { ico: "chat", label: "Encourage a friend" },
  { ico: "star", label: "Celebrate a milestone" },
  { ico: "heart", label: "Offer hope in hard times" },
  { ico: "people", label: "Welcome someone to your group" },
];

const STORIES = [
  { q: "I wore my band every day in the hospital. Knowing so many people were praying for me gave me strength.", a: "Jason, Texas" },
  { q: "Our small group prayed together for months. God answered in ways we couldn't even imagine.", a: "Michelle, Ohio" },
  { q: "I gave my band to a complete stranger. Now we pray for each other every single week.", a: "David, California" },
  { q: "The prayers lifted me up during my darkest season. I'll never forget the love of this community.", a: "Amanda, Florida" },
  { q: "This band started in the U.S. and has traveled across the world. God is truly moving.", a: "Ryan, Missionary" },
];

// Feature chips under the hero — rendered in HTML (not baked into the photo) so
// they stay crisp and reflow on mobile. Matches the 5 icons in the hero art.
const FEATURES: { ico: string; title: string; desc: string; img?: string }[] = [
  { ico: "tap", title: "Tap & Go", desc: "No app. No codes. Just tap.", img: "/home/tap-icon.png" },
  { ico: "people", title: "Pray Together", desc: "Join circles and encourage others.", img: "/home/pray-icon.png" },
  { ico: "book", title: "Daily Verses", desc: "A new, personalized verse every day.", img: "/home/verses-icon.png" },
  { ico: "chart", title: "See Your Impact", desc: "Track your band's journey and the lives it touches.", img: "/home/impact-icon.png" },
  { ico: "heart", title: "Be Encouraged", desc: "Receive prayers, messages and reminders.", img: "/home/encouraged-icon.png" },
];

// ─── Inline icon set ────────────────────────────────────────────────────────────
function Ico({ name, size = 24 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const P: Record<string, React.ReactNode> = {
    tap: <><path d="M9 11V6a2 2 0 1 1 4 0v5" /><path d="M13 11V8a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-1.5a4 4 0 0 1-3.2-1.6L4 15s-1-1.2 0-2 2.2.2 2.2.2L9 15" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 7a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
    book: <><path d="M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z" /><path d="M8 3v16M11 8h4M11 11h4" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" /></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
    chat: <><path d="M4 5h16v11H9l-4 3v-3H4z" /></>,
    celebrate: <><path d="M3 21l5-12 8 8-12 5z" /><path d="M14 3v3M19 8h3M17.5 4.5l2-2M14 11l3 3" /></>,
    heart: <path d="M12 20s-7-4.4-9.2-8.3C1.1 8.5 2.5 5 6 5c2 0 3.2 1.3 4 2.4C10.8 6.3 12 5 14 5c3.5 0 4.9 3.5 3.2 6.7C19 15.6 12 20 12 20z" />,
    star: <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z" />,
    gift: <><path d="M4 11h16v9H4z" /><path d="M2 7h20v4H2zM12 7v13" /><path d="M12 7S10 3 7.5 4.5 9 7 12 7zM12 7s2-4 4.5-2.5S15 7 12 7z" /></>,
    map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>,
    cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 8H6" /></>,
  };
  return <svg {...common} aria-hidden>{P[name]}</svg>;
}

// ─── Scroll reveal ──────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, delay = 0, className = "", style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function timeAgo(ts?: string) {
  if (!ts) return "recently";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

// ─── Sample band points for the global map (fallback) ───────────────────────────
const MAP_POINTS: MapPoint[] = [
  { lat: 36.17, lng: -86.78, name: "M.R.", loc: "Nashville, USA", band: "PB-47291", prayer: "Lord, cover whoever holds this band with Your peace that passes all understanding." },
  { lat: 6.52, lng: 3.37, name: "A.O.", loc: "Lagos, Nigeria", band: "PB-18834", prayer: "Father, let Your light shine through every hand this band passes through." },
  { lat: -23.55, lng: -46.63, name: "C.F.", loc: "São Paulo, Brazil", band: "PB-92011", prayer: "May this band carry hope to someone who needs it today. In Jesus' name." },
  { lat: 37.57, lng: 126.98, name: "J.K.", loc: "Seoul, South Korea", band: "PB-33107", prayer: "I pray for healing, restoration, and renewal for everyone this touches." },
  { lat: 51.51, lng: -0.13, name: "S.H.", loc: "London, UK", band: "PB-65498", prayer: "God, let this small band carry Your immeasurable love around the world." },
  { lat: 40.71, lng: -74.0, name: "D.L.", loc: "New York, USA", band: "PB-20114", prayer: "Be near to the brokenhearted in this city. Let them feel You." },
  { lat: -33.87, lng: 151.21, name: "E.W.", loc: "Sydney, Australia", band: "PB-77320", prayer: "Carry my friend through her treatment, Lord. Hold her steady." },
  { lat: 19.08, lng: 72.88, name: "R.P.", loc: "Mumbai, India", band: "PB-51277", prayer: "Provide for the family that holds this next. You see every need." },
  { lat: -1.29, lng: 36.82, name: "G.M.", loc: "Nairobi, Kenya", band: "PB-39845", prayer: "Let revival start in one heart and travel band to band." },
  { lat: 19.43, lng: -99.13, name: "L.G.", loc: "Mexico City, Mexico", band: "PB-60223", prayer: "Paz para mi familia. Peace for whoever wears this next." },
  { lat: 52.52, lng: 13.40, name: "K.B.", loc: "Berlin, Germany", band: "PB-28910", prayer: "Soften hard hearts. Let this little band be a seed of hope." },
  { lat: 43.65, lng: -79.38, name: "T.N.", loc: "Toronto, Canada", band: "PB-44102", prayer: "Watch over my son tonight wherever he is. Bring him home." },
  { lat: 14.6, lng: 120.98, name: "M.S.", loc: "Manila, Philippines", band: "PB-81560", prayer: "Strength for every tired parent holding this band. You are faithful." },
  { lat: 34.05, lng: -118.24, name: "B.C.", loc: "Los Angeles, USA", band: "PB-70488", prayer: "For the one who feels invisible — You see them. You know their name." },
];

// Leaflet world map (unchanged behavior) — tapping a dot opens its prayer.
function GlobalPrayerMap({ points }: { points: MapPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<any>(null);
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const render = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;
      if (instRef.current) { instRef.current.remove(); instRef.current = null; }
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false, scrollWheelZoom: false, worldCopyJump: true, minZoom: 1 });
      instRef.current = map;
      map.setView([22, 8], 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      points.forEach((p) => {
        const dot = L.divIcon({ className: "", html: '<div class="pb-map-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
        L.marker([p.lat, p.lng], { icon: dot }).addTo(map).bindPopup(
          `<div style="font-family:Georgia,serif;max-width:230px">
             <div style="font-family:monospace;font-weight:bold;color:#9A7A35;font-size:12px">${p.band}</div>
             <div style="font-size:13px;color:#15223B;font-weight:600;margin-top:2px">${p.name} · ${p.loc}</div>
             <div style="font-size:13px;color:#2A3344;font-style:italic;line-height:1.55;margin-top:7px;border-left:2px solid #C8A96E;padding-left:9px">"${p.prayer}"</div>
           </div>`
        );
      });
    };
    if ((window as any).L) { render(); return () => { if (instRef.current) { instRef.current.remove(); instRef.current = null; } }; }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }
    let script = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (!script) { script = document.createElement("script"); script.id = "leaflet-js"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; document.head.appendChild(script); }
    script.addEventListener("load", render, { once: true });
    return () => { if (instRef.current) { instRef.current.remove(); instRef.current = null; } };
  }, [points]);
  return <div ref={mapRef} className="prayer-map" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [live, setLive] = useState<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = () => fetch("/api/home-stats").then(r => r.json()).then(setLive).catch(() => {});
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Compact number + aspirational floor: numbers hold at the floor until real
  // activity surpasses it, then show the live figure.
  const compact = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
    : n >= 1_000 ? (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
    : n.toLocaleString();
  const statValue = (real: number | undefined, floor: number) =>
    (typeof real === "number" && real > floor) ? compact(real) : compact(floor) + "+";

  const stats = [
    { value: statValue(live?.stats?.prayers, 12400), label: "Prayers Shared" },
    { value: statValue(live?.stats?.people, 8200), label: "Lives Impacted" },
    { value: statValue(live?.stats?.countries, 32), label: "Countries" },
    { value: statValue(live?.stats?.cities, 640), label: "Cities" },
    { value: statValue(live?.stats?.bands, 5200), label: "Bands Traveled" },
  ];

  const mapPoints: MapPoint[] = useMemo(() => {
    const liveGeo = ((live?.prayers || []) as any[]).filter(p => p.lat != null && p.lng != null);
    return liveGeo.length >= 12
      ? liveGeo.map(p => ({ lat: p.lat, lng: p.lng, name: p.name, loc: p.location, band: p.band, prayer: p.prayer }))
      : MAP_POINTS;
  }, [live]);

  const feed: FeedPrayer[] = useMemo(() => (
    ((live?.prayers || []) as any[]).length >= 4
      ? (live.prayers as any[]).slice(0, 4).map(p => ({ initials: p.initials, name: p.name, location: p.location, text: p.prayer, band: p.band, time: timeAgo(p.registered_at) }))
      : SAMPLE_FEED
  ), [live]);

  const topCountries: { country: string; count: number }[] = useMemo(() => (
    ((live?.topCountries || []) as any[]).length >= 3 ? live.topCountries : TOP_COUNTRIES_SAMPLE
  ), [live]);

  const navLinks = [
    { href: "/store", label: "Shop" },
    { href: "/prayer-circles", label: "Prayer Circles" },
    { href: "/prayer-wall", label: "Prayer Feed" },
    { href: "#map", label: "The Map" },
    { href: "#daily", label: "Daily Verses" },
    { href: "#stories", label: "Stories" },
    { href: "/about", label: "About Us" },
  ];

  return (
    <>
      <style>{styles}</style>

      {/* ── Announcement bar ── */}
      <div className="topbar">
        <span><span className="dot" /> NFC Technology · Just Tap &amp; Go</span>
        <span className="topbar-sep">Free Shipping on Orders $35+</span>
        <span>Designed in the USA 🇺🇸</span>
      </div>

      {/* ── Nav ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo"><PrayerBandsLogo size={30} color="#0A1628" />Prayer&nbsp;<span>Bands</span></Link>
          <div className="nav-links">
            {navLinks.map(l => <Link key={l.label} href={l.href} className="nav-link">{l.label}</Link>)}
          </div>
          <div className="nav-actions">
            <Link href="/signin" className="nav-ico" aria-label="Account"><Ico name="user" size={20} /></Link>
            <Link href="/store" className="nav-ico" aria-label="Shop"><Ico name="cart" size={20} /></Link>
            <button className={`nav-toggle${menuOpen ? " open" : ""}`} aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><span /><span /><span /></button>
          </div>
        </div>
        {menuOpen && (
          <div className="nav-mobile">
            {navLinks.map(l => <Link key={l.label} href={l.href} className="nav-mobile-link" onClick={() => setMenuOpen(false)}>{l.label}</Link>)}
            <Link href="/signin" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── (clean photo: band + phone + mountains; headline overlaid) */}
      <header className="hero">
        <img className="hero-img" src="/home/hero.jpg" alt="A hand wearing a Prayer Band taps a phone showing today's verse, mountains behind" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        <div className="hero-copy">
          <div className="hero-eyebrow">One Band · Endless Reach</div>
          <h1 className="hero-title">One Tap.<br />Endless Prayers.<br /><em>Countless Lives Touched.</em></h1>
          <p className="hero-sub">Tap your Prayer Band to unlock daily scripture, join prayer circles, encourage others, and see the lives your band has touched.</p>
          <div className="hero-actions">
            <Link href="/store" className="btn-primary">Start Your Journey</Link>
            <Link href="/store" className="btn-ghost-light">Shop Bands</Link>
          </div>
        </div>

        {/* Feature bar — translucent strip over the bottom of the hero photo (stacks below on mobile) */}
        <div className="featurebar">
          <div className="container featurebar-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feat">
                <div className="feat-ico">{f.img ? <img src={f.img} alt="" className="feat-ico-img" /> : <Ico name={f.ico} size={24} />}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <section className="stats">
        <div className="container stats-grid">
          {stats.map(s => (
            <Reveal key={s.label} className="stat">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="how">
        <div className="container">
          <Reveal><h2 className="h2 center">How Prayer Bands Work</h2></Reveal>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 90} className="step">
                {s.img ? <img className="step-img" src={s.img} alt={`Step ${s.num}: ${s.title}`} /> : <div className="step-num">{s.num}</div>}
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily encouragement ── */}
      <section id="daily" className="daily">
        <div className="daily-inner">
          <Reveal className="daily-phone">
            <img className="daily-phone-img" src="/home/phone-1.png" alt="Prayer Bands daily verse app screen with topics to browse" />
          </Reveal>
          <Reveal delay={120} className="daily-copy">
            <div className="eyebrow gold">Daily Encouragement</div>
            <h2 className="h2 light">A New Verse Every Day. <em>Right When You Need It.</em></h2>
            <p className="lead">Tap your band and receive personalized scripture for whatever you're facing. Filter by topic and let God's Word meet you where you are.</p>
            <div className="topic-grid">
              {TOPICS.map(t => (
                <div key={t.label} className="topic-card">
                  <div className="topic-label">{t.label}</div>
                  <div className="topic-verse">{t.verse}</div>
                  <div className="topic-ref">{t.ref}</div>
                </div>
              ))}
            </div>
            <Link href="/store" className="btn-primary sm" style={{ marginTop: 28 }}>Explore All Verses</Link>
          </Reveal>
        </div>
      </section>

      {/* ── Prayer circles ── */}
      <section className="circles">
        <div className="container circles-inner">
          <Reveal className="circles-copy">
            <div className="eyebrow gold">Prayer Circles</div>
            <h2 className="h2 light">No One Should <em>Pray Alone.</em></h2>
            <p className="lead">Create private prayer circles for anything you're going through. Invite family, friends, or your community to pray with you and receive real-time updates.</p>
            <Link href="/prayer-circles" className="btn-primary sm">Create a Prayer Circle</Link>
          </Reveal>
          <Reveal delay={120} className="circles-diagram">
            <div className="circ-center"><div className="circ-center-title">Mike's Prayer Circle</div><div className="circ-center-sub">12 members · 18 prayers</div></div>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="circ-node" style={{ transform: `rotate(${i * 45}deg) translate(140px) rotate(-${i * 45}deg)` }}>
                <Ico name="user" size={18} />
              </div>
            ))}
          </Reveal>
          <Reveal delay={200} className="circles-feats">
            {[
              { ico: "share", t: "Share your request", d: "Invite others to pray" },
              { ico: "bell", t: "Get notified", d: "When someone prays" },
              { ico: "chat", t: "Encourage each other", d: "Leave messages of hope" },
              { ico: "celebrate", t: "Celebrate answered prayers", d: "Praise reports & milestones" },
            ].map(f => (
              <div key={f.t} className="circ-feat">
                <div className="circ-feat-ico"><Ico name={f.ico} size={20} /></div>
                <div><div className="circ-feat-t">{f.t}</div><div className="circ-feat-d">{f.d}</div></div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Prayer feed (live) ── */}
      <section id="feed" className="feed">
        <div className="container">
          <Reveal className="feed-head">
            <div>
              <div className="eyebrow">The Prayer Feed</div>
              <h2 className="h2">A Community <em>Built on Faith.</em></h2>
              <p className="lead dark">Submit prayer requests, lift others up, mark prayers as answered, and encourage one another every day.</p>
            </div>
            <Link href="/prayer-wall" className="link-arrow">View all prayers →</Link>
          </Reveal>
          <div className="feed-grid">
            {feed.map((p, i) => (
              <Reveal key={p.band + i} delay={i * 80} className="feed-card">
                <div className="feed-top">
                  <div className="feed-avatar">{p.initials}</div>
                  <div><div className="feed-name">{p.name}</div><div className="feed-meta">requested prayer · {p.time}</div></div>
                </div>
                <div className="feed-text">{p.text}</div>
                <div className="feed-foot"><Ico name="people" size={15} /> praying</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The map (existing Leaflet map kept) ── */}
      <section id="map" className="mapsec">
        <div className="container">
          <Reveal className="map-head">
            <div className="eyebrow gold">The Map</div>
            <h2 className="h2 light">The World Is <em>Your Prayer Room.</em></h2>
            <p className="lead">See where Prayer Bands have traveled and how prayer is connecting people around the world. Tap any dot to read its prayer.</p>
          </Reveal>
          <div className="map-layout">
            <Reveal delay={120} className="map-wrap"><GlobalPrayerMap points={mapPoints} /></Reveal>
            <Reveal delay={200} className="map-side">
              <div className="map-panel-title">Top Countries</div>
              {topCountries.map((c, i) => (
                <div key={c.country} className="map-country">
                  <span className="map-country-rank">{i + 1}</span>
                  <span className="map-country-name">{c.country}</span>
                  <span className="map-country-count">{c.count.toLocaleString()}</span>
                </div>
              ))}
              <Link href="/prayer-wall" className="link-arrow gold" style={{ marginTop: 16, display: "inline-block" }}>View all countries →</Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Send a gift ── */}
      <section className="gift">
        <div className="container gift-inner">
          <Reveal className="gift-visual">
            {/* Image slot: gift box + band photo. */}
            <div className="gift-box"><div className="gift-band">✝ Pray. Trust. Believe.</div></div>
            <div className="gift-note">
              <div className="gift-note-label">A message, just for you</div>
              <div className="gift-note-to">To John</div>
              <div className="gift-note-body">You are stronger than you know and never alone. We are all praying for you!</div>
              <div className="gift-note-from">Love always, Mom &amp; Dad ❤</div>
            </div>
          </Reveal>
          <Reveal delay={120} className="gift-copy">
            <div className="eyebrow gold">Send a Band</div>
            <h2 className="h2 light">Send More <em>Than a Gift.</em></h2>
            <p className="lead">Add a personal message that only the recipient can unlock when they tap their band.</p>
            <div className="gift-occasions">
              {GIFTS.map(g => (
                <div key={g.label} className="gift-occ"><div className="gift-occ-ico"><Ico name={g.ico} size={20} /></div><span>{g.label}</span></div>
              ))}
            </div>
            <Link href="/store" className="btn-primary sm" style={{ marginTop: 28 }}>Send a Band</Link>
          </Reveal>
        </div>
      </section>

      {/* ── See the impact ── */}
      <section id="impact" className="impact">
        <div className="container impact-inner">
          <Reveal className="impact-copy">
            <div className="eyebrow">Your Impact</div>
            <h2 className="h2">See the Impact of <em>Every Prayer.</em></h2>
            <p className="lead dark">From the moment your band is activated, you can see its journey, prayers, and the lives it's touched.</p>
            <Link href="/store" className="btn-dark" style={{ marginTop: 24 }}>Track Your Band</Link>
          </Reveal>
          <Reveal delay={120} className="impact-card">
            <div className="impact-timeline">
              {[
                { d: "Jan 5", t: "Band activated by David" },
                { d: "Jan 8", t: "Given to John in Florida" },
                { d: "Jan 12", t: "Prayer request submitted" },
                { d: "Jan 14", t: "17 people prayed" },
                { d: "Feb 2", t: "Prayer answered — praise report" },
                { d: "Mar 1", t: "John gifted the band to his brother" },
              ].map((e, i) => (
                <div key={i} className="impact-row"><span className="impact-dot" /><span className="impact-date">{e.d}</span><span className="impact-event">{e.t}</span></div>
              ))}
            </div>
            <div className="impact-stats">
              {[{ n: "18", l: "Times Prayed" }, { n: "4", l: "States" }, { n: "11", l: "Encouraged" }, { n: "3", l: "Circles" }].map(s => (
                <div key={s.l} className="impact-stat"><div className="impact-stat-n">{s.n}</div><div className="impact-stat-l">{s.l}</div></div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Stories ── */}
      <section id="stories" className="stories">
        <div className="stories-overlay" />
        <div className="container">
          <Reveal><h2 className="h2 center light">Real Stories. Real Impact.</h2></Reveal>
          <div className="stories-grid">
            {STORIES.map((s, i) => (
              <Reveal key={i} delay={i * 80} className="story-card">
                <div className="story-stars">★★★★★</div>
                <div className="story-q">"{s.q}"</div>
                <div className="story-a">{s.a}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cinzel:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  *,*::before,*::after { box-sizing: border-box; }
  :root {
    --navy:#0A1628; --navy2:#0E1E38; --navy3:#132544;
    --gold:#C8A96E; --gold2:#E2C98A; --goldT:#9A7A35;
    --paper:#FAF7EF; --paper2:#F3EEE1; --cream:#F5EDD8;
    --ink:#15223B; --ink2:#3a4660; --line:rgba(10,22,40,0.10);
    --lineG:rgba(200,169,110,0.22);
  }
  html { scroll-behavior: smooth; }
  body { background: var(--paper); color: var(--ink); font-family: 'Inter', sans-serif; font-weight: 300; line-height: 1.7; overflow-x: hidden; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
  @media (max-width:600px){ .container { padding: 0 20px; } }

  .h2 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:clamp(2rem,4vw,3rem); line-height:1.12; color:var(--ink); letter-spacing:-0.01em; }
  .h2 em { font-style:italic; font-weight:500; color:var(--goldT); }
  .h2.light { color:#fff; } .h2.light em { color:var(--gold2); }
  .h2.center { text-align:center; }
  .eyebrow { font-family:'Cinzel',serif; font-size:0.66rem; font-weight:600; letter-spacing:0.28em; text-transform:uppercase; color:var(--goldT); margin-bottom:14px; }
  .eyebrow.gold { color:var(--gold); }
  .lead { font-size:0.98rem; color:rgba(245,237,216,0.7); line-height:1.85; max-width:480px; margin-top:18px; }
  .lead.dark { color:var(--ink2); }

  .btn-primary { display:inline-block; background:var(--gold); color:var(--navy); font-family:'Cinzel',serif; font-size:0.74rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; padding:16px 34px; border-radius:3px; text-decoration:none; transition:.25s; }
  .btn-primary:hover { background:var(--gold2); transform:translateY(-2px); }
  .btn-primary.sm { padding:13px 26px; font-size:0.68rem; }
  .btn-ghost-light { display:inline-block; background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.4); font-family:'Cinzel',serif; font-size:0.74rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; padding:16px 34px; border-radius:3px; text-decoration:none; transition:.25s; }
  .btn-ghost-light:hover { border-color:var(--gold); color:var(--gold2); }
  .btn-dark { display:inline-block; background:var(--navy); color:var(--gold2); font-family:'Cinzel',serif; font-size:0.7rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; padding:14px 28px; border-radius:3px; text-decoration:none; transition:.25s; }
  .btn-dark:hover { background:var(--navy2); }
  .link-arrow { font-family:'Cinzel',serif; font-size:0.72rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--goldT); text-decoration:none; white-space:nowrap; }
  .link-arrow.gold { color:var(--gold2); }
  .link-arrow:hover { color:var(--gold); }

  /* Topbar */
  .topbar { background:var(--navy); color:rgba(245,237,216,0.8); font-size:0.72rem; letter-spacing:0.06em; display:flex; justify-content:center; gap:34px; align-items:center; padding:9px 20px; position:relative; z-index:101; }
  .topbar .dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--gold); margin-right:6px; }
  @media (max-width:760px){ .topbar .topbar-sep { display:none; } .topbar { gap:18px; font-size:0.66rem; } }

  /* Nav */
  .nav { position:sticky; top:0; z-index:100; background:rgba(250,247,239,0.9); backdrop-filter:blur(12px); border-bottom:1px solid transparent; transition:.3s; }
  .nav.scrolled { background:rgba(250,247,239,0.97); border-color:var(--line); box-shadow:0 6px 24px rgba(10,22,40,0.06); }
  .nav-inner { display:flex; align-items:center; justify-content:space-between; height:72px; max-width:1280px; margin:0 auto; padding:0 32px; }
  @media (max-width:600px){ .nav-inner { padding:0 20px; } }
  .nav-logo { display:inline-flex; align-items:center; gap:9px; font-family:'Cinzel',serif; font-size:1.18rem; font-weight:700; color:var(--ink); letter-spacing:0.06em; text-decoration:none; }
  .nav-logo span { color:var(--goldT); font-weight:500; }
  .nav-links { display:flex; gap:26px; }
  .nav-link { color:var(--ink2); font-size:0.74rem; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; text-decoration:none; transition:.2s; }
  .nav-link:hover { color:var(--goldT); }
  .nav-actions { display:flex; align-items:center; gap:14px; }
  .nav-ico { color:var(--ink); display:inline-flex; transition:.2s; } .nav-ico:hover { color:var(--goldT); }
  .nav-toggle { display:none; flex-direction:column; gap:5px; width:38px; height:38px; background:none; border:none; cursor:pointer; padding:8px; }
  .nav-toggle span { display:block; width:22px; height:2px; background:var(--ink); border-radius:2px; transition:.25s; }
  .nav-toggle.open span:nth-child(1){ transform:translateY(7px) rotate(45deg);} .nav-toggle.open span:nth-child(2){opacity:0;} .nav-toggle.open span:nth-child(3){ transform:translateY(-7px) rotate(-45deg);}
  .nav-mobile { display:flex; flex-direction:column; background:var(--paper); border-top:1px solid var(--line); padding:8px 24px 16px; }
  .nav-mobile-link { color:var(--ink); font-size:0.95rem; letter-spacing:0.05em; text-decoration:none; padding:14px 4px; border-bottom:1px solid var(--line); }
  .nav-mobile-link:last-child { border-bottom:none; color:var(--goldT); font-family:'Cinzel',serif; font-weight:600; }
  @media (max-width:980px){ .nav-links { display:none; } .nav-toggle { display:flex; } }
  @media (min-width:981px){ .nav-mobile { display:none !important; } }

  /* Hero */
  .hero { position:relative; isolation:isolate; background:linear-gradient(160deg,#0A1628,#0E1E38 55%,#0A1628); color:var(--cream); }
  .hero-img { display:block; width:100%; height:auto; position:relative; z-index:0; }
  .hero::after { content:''; position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(103deg,rgba(7,13,26,0.86) 0%,rgba(7,13,26,0.5) 34%,rgba(7,13,26,0) 60%),linear-gradient(180deg,rgba(7,13,26,0.35) 0%,transparent 32%); }
  .hero-copy { position:absolute; z-index:2; top:0; left:0; max-width:540px; padding:clamp(40px,6vw,88px) 0 0 clamp(24px,5vw,72px); }

  /* Feature bar — translucent strip overlaid on the bottom of the hero photo */
  .featurebar { position:absolute; left:0; right:0; bottom:0; z-index:3; background:linear-gradient(180deg,rgba(7,13,26,0.10),rgba(7,13,26,0.62)); backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); border-top:1px solid rgba(255,255,255,0.10); }
  .featurebar-grid { display:grid; grid-template-columns:repeat(5,1fr); }
  .feat { text-align:center; padding:22px 18px; border-right:1px solid rgba(255,255,255,0.10); }
  .feat:last-child { border-right:none; }
  .feat-ico { color:var(--gold2); display:inline-flex; width:42px; height:42px; align-items:center; justify-content:center; margin-bottom:12px; }
  .feat-ico-img { width:38px; height:38px; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45)); }
  .feat-title { font-family:'Cinzel',serif; font-size:0.74rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#fff; margin-bottom:6px; text-shadow:0 1px 6px rgba(0,0,0,0.55); }
  .feat-desc { font-size:0.8rem; color:rgba(245,237,216,0.72); line-height:1.5; max-width:200px; margin:0 auto; text-shadow:0 1px 6px rgba(0,0,0,0.55); }
  .hero-eyebrow { font-family:'Cinzel',serif; font-size:0.66rem; font-weight:600; letter-spacing:0.26em; text-transform:uppercase; color:var(--gold); margin-bottom:22px; }
  .hero-title { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:clamp(2.6rem,5.2vw,4.4rem); line-height:1.05; color:#fff; letter-spacing:-0.01em; }
  .hero-title em { font-style:italic; font-weight:500; color:var(--gold2); }
  .hero-sub { font-size:1.02rem; color:rgba(245,237,216,0.72); line-height:1.8; margin:22px 0 32px; max-width:480px; }
  .hero-actions { display:flex; gap:14px; flex-wrap:wrap; }
  .hero-phone { position:relative; width:230px; height:430px; border-radius:34px; background:linear-gradient(165deg,#16294a,#0a1628); border:1px solid var(--lineG); box-shadow:0 40px 80px rgba(0,0,0,0.5); padding:14px; margin-left:90px; }
  .hero-phone.static { margin-left:0; }
  .hero-phone-notch { position:absolute; top:16px; left:50%; transform:translateX(-50%); width:80px; height:6px; border-radius:4px; background:rgba(255,255,255,0.12); }
  .hero-phone-screen { height:100%; border-radius:24px; background:radial-gradient(ellipse 90% 50% at 50% 0%,rgba(200,169,110,0.16),transparent 60%),linear-gradient(180deg,#0d1f3c,#0a1628); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px 22px; }
  .hp-label { font-family:'Cinzel',serif; font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:18px; }
  .hp-verse { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.42rem; line-height:1.4; color:#fff; }
  .hp-ref { font-family:'Cinzel',serif; font-size:0.66rem; letter-spacing:0.1em; color:var(--gold2); margin-top:14px; }
  .hp-tap { margin-top:26px; font-size:0.66rem; letter-spacing:0.14em; text-transform:uppercase; color:rgba(245,237,216,0.5); border:1px solid var(--lineG); border-radius:20px; padding:8px 18px; }
  .hp-chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:20px; }
  .hp-chips span { font-size:0.6rem; color:var(--gold2); border:1px solid var(--lineG); border-radius:12px; padding:3px 10px; }
  @media (max-width:820px){
    .hero::after { display:none; }
    .hero-copy { position:static; max-width:none; text-align:center; padding:38px 20px 46px; background:linear-gradient(180deg,var(--navy),var(--navy2)); }
    .hero-actions { justify-content:center; }
    .featurebar { position:static; background:var(--navy); backdrop-filter:none; -webkit-backdrop-filter:none; border-top:1px solid var(--lineG); }
    .feat-title, .feat-desc { text-shadow:none; }
    .feat-ico-img { filter:none; }
    .featurebar-grid { grid-template-columns:repeat(2,1fr); }
    .feat { border-right:none; border-bottom:1px solid var(--lineG); padding:28px 18px; }
    .feat:nth-child(odd){ border-right:1px solid var(--lineG); }
    .feat:last-child { grid-column:1 / -1; border-bottom:none; }
  }
  @media (max-width:480px){
    .featurebar-grid { grid-template-columns:1fr; }
    .feat:nth-child(odd){ border-right:none; }
    .hero-phone { width:200px; height:380px; }
  }

  /* Stats */
  .stats { background:var(--navy3); border-top:1px solid var(--lineG); border-bottom:1px solid var(--lineG); }
  .stats-grid { display:grid; grid-template-columns:repeat(5,1fr); padding:42px 32px; }
  .stat { text-align:center; padding:0 14px; border-right:1px solid var(--lineG); }
  .stat:last-child { border-right:none; }
  .stat-value { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:2.5rem; color:var(--gold2); line-height:1; }
  .stat-label { font-size:0.66rem; letter-spacing:0.12em; text-transform:uppercase; color:rgba(245,237,216,0.55); margin-top:8px; }
  @media (max-width:760px){ .stats-grid { grid-template-columns:repeat(2,1fr); gap:28px 0; } .stat:nth-child(2){ border-right:none; } .stat:last-child { grid-column:1/-1; border-right:none; } .stat-value { font-size:2rem; } }

  /* How */
  .how { background:var(--paper); padding:90px 0; }
  .steps { display:grid; grid-template-columns:repeat(5,1fr); gap:24px; margin-top:56px; position:relative; }
  .step { text-align:center; position:relative; }
  /* Dashed connector + chevron from each badge to the next (5-across desktop only) */
  @media (min-width:881px){
    .step:not(:last-child)::after { content:''; position:absolute; top:60px; left:calc(50% + 72px); right:calc(-50% + 44px); border-top:2px dashed rgba(200,169,110,0.5); }
    .step:not(:last-child)::before { content:''; position:absolute; z-index:1; top:55px; right:calc(-50% + 38px); width:9px; height:9px; border-top:2px solid rgba(200,169,110,0.8); border-right:2px solid rgba(200,169,110,0.8); transform:rotate(45deg); }
  }
  .step-num { width:62px; height:62px; margin:0 auto 20px; border-radius:50%; background:linear-gradient(145deg,var(--gold2),var(--gold)); color:var(--navy); font-family:'Cinzel',serif; font-weight:700; font-size:1.4rem; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 24px rgba(200,169,110,0.3); }
  .step-img { display:block; width:120px; height:120px; object-fit:contain; margin:0 auto 20px; }
  .step-title { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.3rem; color:var(--ink); margin-bottom:8px; }
  .step-desc { font-size:0.85rem; color:var(--ink2); line-height:1.7; max-width:200px; margin:0 auto; }
  @media (max-width:880px){ .steps { grid-template-columns:repeat(2,1fr); gap:40px 24px; } }
  @media (max-width:480px){ .steps { grid-template-columns:1fr; } }

  /* Daily — phone bottom-left, copy right, full-width over the mountain bg */
  .daily { background:linear-gradient(180deg,rgba(10,22,40,0.92) 0%,rgba(10,22,40,0.5) 30%,rgba(10,22,40,0.5) 70%,rgba(10,22,40,0.96) 100%),url('/home/daily-topic-bg.jpg') center/cover no-repeat,var(--navy); }
  .daily-inner { display:grid; grid-template-columns:0.82fr 1.18fr; gap:56px; align-items:end; padding:92px clamp(24px,5vw,80px) 0; }
  .daily-phone { display:flex; justify-content:center; align-items:flex-end; }
  .daily-phone-img { display:block; width:330px; max-width:34vw; height:auto; filter:drop-shadow(0 30px 60px rgba(0,0,0,0.55)); }
  .daily-copy { max-width:720px; padding-bottom:92px; }
  .topic-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:28px 0 0; max-width:560px; }
  .topic-card { background:rgba(200,169,110,0.06); border:1px solid var(--lineG); border-radius:10px; padding:18px 20px; }
  .topic-label { font-family:'Cinzel',serif; font-size:0.66rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--gold2); margin-bottom:8px; }
  .topic-verse { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1rem; color:var(--cream); line-height:1.4; }
  .topic-ref { font-size:0.72rem; color:rgba(245,237,216,0.5); margin-top:8px; }
  @media (max-width:880px){
    .daily-inner { grid-template-columns:1fr; gap:36px; padding:72px 24px 0; }
    .daily-copy { order:1; text-align:center; max-width:none; padding-bottom:0; }
    .daily-copy .lead, .topic-grid { margin-left:auto; margin-right:auto; }
    .daily-phone { order:2; }
    .daily-phone-img { width:280px; max-width:72vw; }
  }
  @media (max-width:460px){ .topic-grid { grid-template-columns:1fr; } }

  /* Circles */
  .circles { background:linear-gradient(180deg,var(--navy2),var(--navy)); padding:96px 0; }
  .circles-inner { display:grid; grid-template-columns:1fr 0.9fr 1fr; gap:48px; align-items:center; }
  .circles-diagram { position:relative; width:340px; height:340px; margin:0 auto; }
  .circ-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:150px; height:150px; border-radius:50%; background:linear-gradient(145deg,var(--gold2),var(--gold)); color:var(--navy); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:14px; box-shadow:0 16px 40px rgba(200,169,110,0.35); z-index:2; }
  .circ-center-title { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:1rem; line-height:1.2; }
  .circ-center-sub { font-size:0.66rem; margin-top:6px; opacity:.8; }
  .circ-node { position:absolute; top:50%; left:50%; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; background:var(--navy3); border:1px solid var(--lineG); color:var(--gold2); display:flex; align-items:center; justify-content:center; }
  .circ-feat { display:flex; gap:13px; align-items:flex-start; margin-bottom:24px; }
  .circ-feat-ico { flex-shrink:0; width:42px; height:42px; border-radius:10px; border:1px solid var(--lineG); color:var(--gold2); display:flex; align-items:center; justify-content:center; }
  .circ-feat-t { font-family:'Cinzel',serif; font-size:0.74rem; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:#fff; }
  .circ-feat-d { font-size:0.82rem; color:rgba(245,237,216,0.55); }
  @media (max-width:980px){ .circles-inner { grid-template-columns:1fr; gap:48px; } .circles-feats { max-width:420px; margin:0 auto; } }

  /* Feed */
  .feed { background:var(--paper2); padding:90px 0; }
  .feed-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; margin-bottom:48px; flex-wrap:wrap; }
  .feed-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
  .feed-card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:22px; box-shadow:0 6px 20px rgba(10,22,40,0.04); }
  .feed-top { display:flex; align-items:center; gap:11px; margin-bottom:14px; }
  .feed-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,var(--gold2),var(--gold)); color:var(--navy); font-family:'Cinzel',serif; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .feed-name { font-weight:600; font-size:0.92rem; color:var(--ink); }
  .feed-meta { font-size:0.72rem; color:var(--ink2); }
  .feed-text { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:1.08rem; color:var(--ink); line-height:1.55; min-height:84px; }
  .feed-foot { display:flex; align-items:center; gap:7px; margin-top:14px; padding-top:14px; border-top:1px solid var(--line); font-size:0.74rem; letter-spacing:0.04em; color:var(--goldT); }
  @media (max-width:980px){ .feed-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:520px){ .feed-grid { grid-template-columns:1fr; } }

  /* Map */
  .mapsec { background:linear-gradient(180deg,var(--navy),var(--navy2)); padding:96px 0; }
  .map-head { text-align:center; margin-bottom:8px; }
  .map-head .lead { margin:18px auto 0; }
  .map-layout { display:grid; grid-template-columns:1fr 300px; gap:24px; margin-top:40px; align-items:stretch; }
  .map-wrap { border-radius:14px; overflow:hidden; border:1px solid var(--lineG); box-shadow:0 20px 60px rgba(0,0,0,0.4); }
  .prayer-map { height:480px; width:100%; background:#0a1628; }
  .map-side { background:rgba(200,169,110,0.05); border:1px solid var(--lineG); border-radius:14px; padding:24px; }
  .map-panel-title { font-family:'Cinzel',serif; font-size:0.7rem; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold); margin-bottom:18px; }
  .map-country { display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--lineG); }
  .map-country:last-of-type { border-bottom:none; }
  .map-country-rank { width:22px; height:22px; border-radius:50%; background:rgba(200,169,110,0.15); color:var(--gold2); font-size:0.7rem; font-weight:600; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .map-country-name { flex:1; color:var(--cream); font-size:0.86rem; }
  .map-country-count { color:var(--gold2); font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1rem; }
  @media (max-width:880px){ .map-layout { grid-template-columns:1fr; } .prayer-map { height:380px; } }

  /* Gift */
  .gift { background:linear-gradient(180deg,var(--navy2),var(--navy)); padding:96px 0; }
  .gift-inner { display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
  .gift-visual { position:relative; }
  .gift-box { height:280px; border-radius:16px; background:radial-gradient(ellipse 70% 60% at 50% 40%,rgba(200,169,110,0.12),transparent 70%),linear-gradient(145deg,#13243f,#0a1628); border:1px solid var(--lineG); display:flex; align-items:center; justify-content:center; box-shadow:0 26px 60px rgba(0,0,0,0.4); }
  .gift-band { width:74%; height:64px; border-radius:34px; background:linear-gradient(145deg,#0e1f3a,#070f1e); border:1px solid var(--lineG); display:flex; align-items:center; justify-content:center; font-family:'Cinzel',serif; font-size:0.7rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--gold2); }
  .gift-note { position:absolute; right:-12px; bottom:-28px; width:230px; background:#fffdf8; border-radius:12px; padding:18px 20px; box-shadow:0 20px 50px rgba(0,0,0,0.35); transform:rotate(3deg); }
  .gift-note-label { font-family:'Cinzel',serif; font-size:0.56rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--goldT); margin-bottom:8px; }
  .gift-note-to { font-family:'Cormorant Garamond',serif; font-weight:700; font-size:1.1rem; color:var(--ink); }
  .gift-note-body { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:0.92rem; color:var(--ink2); line-height:1.5; margin:6px 0 10px; }
  .gift-note-from { font-size:0.78rem; color:var(--goldT); }
  .gift-occasions { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:26px; max-width:440px; }
  .gift-occ { display:flex; align-items:center; gap:11px; }
  .gift-occ-ico { width:40px; height:40px; border-radius:10px; border:1px solid var(--lineG); color:var(--gold2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .gift-occ span { font-size:0.84rem; color:rgba(245,237,216,0.75); }
  @media (max-width:880px){ .gift-inner { grid-template-columns:1fr; gap:72px; } .gift-note { right:0; } }

  /* Impact */
  .impact { background:var(--paper); padding:90px 0; }
  .impact-inner { display:grid; grid-template-columns:0.9fr 1.1fr; gap:56px; align-items:center; }
  .impact-card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:32px; box-shadow:0 14px 40px rgba(10,22,40,0.06); }
  .impact-timeline { position:relative; padding-left:8px; }
  .impact-row { display:flex; align-items:center; gap:14px; padding:9px 0; }
  .impact-dot { width:10px; height:10px; border-radius:50%; background:var(--gold); flex-shrink:0; box-shadow:0 0 0 4px rgba(200,169,110,0.15); }
  .impact-date { font-family:'Cinzel',serif; font-size:0.66rem; letter-spacing:0.06em; color:var(--goldT); width:48px; flex-shrink:0; }
  .impact-event { font-size:0.86rem; color:var(--ink); }
  .impact-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:24px; padding-top:24px; border-top:1px solid var(--line); }
  .impact-stat { text-align:center; }
  .impact-stat-n { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.9rem; color:var(--goldT); line-height:1; }
  .impact-stat-l { font-size:0.62rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink2); margin-top:6px; }
  @media (max-width:880px){ .impact-inner { grid-template-columns:1fr; gap:40px; } }

  /* Stories */
  .stories { position:relative; background:url('/home/real-stories-bg.jpg') center/cover no-repeat,#070f1e; padding:96px 0; overflow:hidden; }
  .stories-overlay { position:absolute; inset:0; background:linear-gradient(180deg,rgba(7,13,26,0.86) 0%,rgba(7,13,26,0.72) 42%,rgba(7,13,26,0.9) 100%); }
  .stories .container { position:relative; z-index:1; }
  .stories-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; margin-top:52px; }
  .story-card { background:rgba(200,169,110,0.05); border:1px solid var(--lineG); border-radius:12px; padding:26px 22px; }
  .story-stars { color:var(--gold); font-size:0.7rem; letter-spacing:3px; margin-bottom:14px; }
  .story-q { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:0.98rem; color:rgba(245,237,216,0.86); line-height:1.6; margin-bottom:18px; }
  .story-a { font-family:'Cinzel',serif; font-size:0.66rem; letter-spacing:0.1em; color:var(--gold2); }
  @media (max-width:1040px){ .stories-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:560px){ .stories-grid { grid-template-columns:1fr; } }

  .pb-map-dot { width:12px; height:12px; border-radius:50%; background:#0E1E38; border:2px solid #C8A96E; box-shadow:0 0 0 0 rgba(200,169,110,0.6); animation:pbPulse 2.6s ease-out infinite; cursor:pointer; }
  @keyframes pbPulse { 0%{box-shadow:0 0 0 0 rgba(226,201,138,0.5);} 70%{box-shadow:0 0 0 12px rgba(226,201,138,0);} 100%{box-shadow:0 0 0 0 rgba(226,201,138,0);} }
  .leaflet-popup-content-wrapper { border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,0.3); }
  .leaflet-popup-content { margin:14px 16px; }
`;
