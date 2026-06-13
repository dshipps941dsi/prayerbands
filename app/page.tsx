"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import PrayerBandsLogo from "@/components/PrayerBandsLogo";
import SiteFooter from "@/components/SiteFooter";

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

// Home stats are computed live from /api/home-stats with an aspirational floor.

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

// ─── Sample band points for the global prayer map ──────────────────────────────
const MAP_POINTS = [
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
  { lat: -34.6, lng: -58.38, name: "P.A.", loc: "Buenos Aires, Argentina", band: "PB-19073", prayer: "Que esta oración encuentre a quien más la necesite hoy." },
  { lat: 34.05, lng: -118.24, name: "B.C.", loc: "Los Angeles, USA", band: "PB-70488", prayer: "For the one who feels invisible — You see them. You know their name." },
  { lat: -33.92, lng: 18.42, name: "N.D.", loc: "Cape Town, South Africa", band: "PB-55619", prayer: "Bind up wounds in this nation. Let healing pass hand to hand." },
  { lat: 35.68, lng: 139.69, name: "H.T.", loc: "Tokyo, Japan", band: "PB-31204", prayer: "A whisper of hope to a quiet heart. You are not far." },
  { lat: 4.71, lng: -74.07, name: "V.R.", loc: "Bogotá, Colombia", band: "PB-66730", prayer: "Cubre a quien lleva esta banda con tu amor. Amén." },
  { lat: 41.88, lng: -87.63, name: "J.W.", loc: "Chicago, USA", band: "PB-48817", prayer: "For my neighbor in the hospital — let her know she's prayed over." },
  { lat: 48.86, lng: 2.35, name: "A.D.", loc: "Paris, France", band: "PB-22945", prayer: "Que cette prière voyage loin et touche un cœur fatigué." },
];

// Leaflet world map of sample band points; tapping a dot opens its prayer.
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

type MapPoint = { lat: number; lng: number; name: string; loc: string; band: string; prayer: string };

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
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activePrayer, setActivePrayer] = useState(0);
  const [live, setLive] = useState<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const load = () => fetch("/api/home-stats").then(r => r.json()).then(setLive).catch(() => {});
    load();
    // Refresh the live data only every 30 minutes — the map is expensive to
    // rebuild, so we don't want it churning on a short interval (especially on
    // mobile). Memoized below so it only re-renders when the data changes.
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Stat numbers stay at an aspirational floor until real activity surpasses it.
  const statValue = (real: number | undefined, floor: number) =>
    (typeof real === "number" && real > floor) ? real.toLocaleString() : floor.toLocaleString() + "+";
  const displayStats = [
    { value: statValue(live?.stats?.prayers, 12400), label: "Prayers Recorded" },
    { value: statValue(live?.stats?.countries, 38), label: "Countries Reached" },
    { value: statValue(live?.stats?.bands, 5200), label: "Bands in the World" },
    { value: "1", label: "God Glorified" },
  ];
  // Map + ticker switch from the curated sample to real prayers once there's
  // enough. Memoized on `live` so the page re-rendering (e.g. the 4s ticker
  // highlight) doesn't hand the map a new array each time and force a full,
  // flickery rebuild — it now only rebuilds when the data actually changes.
  const mapPoints: MapPoint[] = useMemo(() => {
    const liveGeo = ((live?.prayers || []) as any[]).filter(p => p.lat != null && p.lng != null);
    return liveGeo.length >= 12
      ? liveGeo.map(p => ({ lat: p.lat, lng: p.lng, name: p.name, loc: p.location, band: p.band, prayer: p.prayer }))
      : MAP_POINTS;
  }, [live]);
  const tickerPrayers: Prayer[] = useMemo(() => (
    ((live?.prayers || []) as any[]).length >= 5
      ? (live.prayers as any[]).slice(0, 6).map(p => ({ initials: p.initials, location: p.location, text: p.prayer, band: p.band, time: timeAgo(p.registered_at) }))
      : PRAYERS
  ), [live]);

  useEffect(() => {
    const t = setInterval(() => setActivePrayer(p => (p + 1) % tickerPrayers.length), 4000);
    return () => clearInterval(t);
  }, [tickerPrayers.length]);

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
          max-width: none; margin: 0;
          padding: 0 48px;
          height: 72px;
          display: flex; align-items: center; justify-content: space-between;
        }
        @media (max-width: 600px) { .nav-inner { padding: 0 20px; } }
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

        /* ── Global Prayer Map ── */
        .globe {
          padding: 90px 0;
          background:
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,169,110,0.10) 0%, transparent 60%),
            linear-gradient(180deg, var(--navy) 0%, var(--navy2) 100%);
        }
        .prayer-map-wrap {
          margin-top: 44px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(200,169,110,0.30);
          box-shadow: 0 20px 60px rgba(0,0,0,0.40);
        }
        .prayer-map { height: 480px; width: 100%; background: #E8E4D8; }
        @media (max-width: 700px) { .prayer-map { height: 380px; } .globe { padding: 64px 0; } }
        .pb-map-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: #0E1E38;
          border: 2px solid #C8A96E;
          box-shadow: 0 0 0 0 rgba(200,169,110,0.6);
          animation: pbPulse 2.6s ease-out infinite;
          cursor: pointer;
        }
        @keyframes pbPulse {
          0% { box-shadow: 0 0 0 0 rgba(226,201,138,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(226,201,138,0); }
          100% { box-shadow: 0 0 0 0 rgba(226,201,138,0); }
        }
        .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .leaflet-popup-content { margin: 14px 16px; }

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
          font-size: 0.68rem; letter-spacing: 0.2em;
          color: rgba(245,237,216,0.8);
          text-transform: uppercase;
        }
        .prayer-item {
          padding: 22px 26px;
          border-bottom: 1px solid rgba(200,169,110,0.16);
          transition: background 0.4s, border-color 0.4s;
        }
        .prayer-item:last-child { border-bottom: none; }
        .prayer-meta {
          display: flex; align-items: center; gap: 11px;
          margin-bottom: 12px;
        }
        .prayer-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, var(--gold2), var(--gold));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700;
          color: var(--navy); flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .prayer-who {
          font-size: 0.92rem; font-weight: 600;
          color: #FFFFFF;
        }
        .prayer-where {
          font-size: 0.78rem; color: rgba(245,237,216,0.7);
        }
        .prayer-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.18rem; font-style: italic;
          color: #F5EDD8;
          line-height: 1.6;
        }
        .prayer-band {
          margin-top: 10px;
          font-family: 'Cinzel', serif;
          font-size: 0.66rem; letter-spacing: 0.16em;
          color: var(--gold2);
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

        /* ── Mission statement band ── */
        .creed {
          padding: 130px 0;
          background:
            radial-gradient(ellipse 60% 90% at 50% 0%, rgba(200,169,110,0.12) 0%, transparent 60%),
            linear-gradient(180deg, var(--navy) 0%, var(--navy2) 55%, var(--navy) 100%);
          border-top: 1px solid rgba(200,169,110,0.18);
          border-bottom: 1px solid rgba(200,169,110,0.18);
          text-align: center;
        }
        .creed .container { max-width: 860px; }
        .creed-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); margin-bottom: 26px;
        }
        .creed-line {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300;
          font-size: clamp(25px, 3.8vw, 40px); line-height: 1.35; color: var(--cream);
        }
        .creed-line b { font-weight: 600; color: var(--gold2); }
        .creed-closer {
          margin-top: 20px; font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(23px, 3.4vw, 34px); color: var(--gold2); font-weight: 600;
        }

        /* ── Daily tap callout ── */
        .daily { padding: 130px 0; }
        .daily-inner { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 72px; align-items: center; }
        .daily-card {
          background: linear-gradient(165deg, var(--navy2), var(--navy));
          border: 1px solid rgba(200,169,110,0.32); border-radius: 22px;
          padding: 38px 34px; box-shadow: 0 24px 70px rgba(10,22,40,0.20);
        }
        .daily-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .daily-pulse { width: 11px; height: 11px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 0 rgba(200,169,110,0.6); animation: dailyPulse 2.4s infinite; }
        @keyframes dailyPulse { 0% { box-shadow: 0 0 0 0 rgba(200,169,110,0.5);} 70% { box-shadow: 0 0 0 12px rgba(200,169,110,0);} 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0);} }
        .daily-card-label { font-family: 'Cinzel', serif; font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
        .daily-verse { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: clamp(22px, 2.8vw, 28px); line-height: 1.5; color: var(--cream); margin: 0 0 16px; }
        .daily-ref { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.08em; color: var(--gold2); }
        .daily-tapnote { margin-top: 26px; padding-top: 20px; border-top: 1px solid rgba(200,169,110,0.18); font-size: 13px; color: rgba(245,237,216,0.55); display: flex; align-items: center; gap: 8px; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .mission-inner, .wall-inner, .ministry-inner, .daily-inner { grid-template-columns: 1fr; gap: 48px; }
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
          .daily, .creed { padding: 80px 0; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className={`nav${scrolled || menuOpen ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><PrayerBandsLogo size={26} color="#E2C98A" />Prayer&nbsp;<span>Bands</span></Link>
          <div className="nav-links">
            <Link href="#mission" className="nav-link">Our Mission</Link>
            <Link href="#how" className="nav-link">How It Works</Link>
            <Link href="#wall" className="nav-link">Prayer Network</Link>
            <Link href="/prayer-circles" className="nav-link">Prayer Circles</Link>
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
            <Link href="/prayer-circles" className="nav-mobile-link" onClick={() => setMenuOpen(false)}>Prayer Circles</Link>
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
            {displayStats.map((s) => (
              <Reveal key={s.label} className="stat-item">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mission statement ── */}
      <section className="creed section">
        <div className="container">
          <Reveal>
            <div className="creed-eyebrow">Why We Exist</div>
            <div className="creed-line">
              We believe in the power of <b>prayer</b>.<br />
              We believe in the power of <b>community</b>.
            </div>
            <div className="creed-closer">That&rsquo;s why we created Prayer Bands.</div>
          </Reveal>
        </div>
      </section>

      {/* ── Global Prayer Map ── */}
      <section className="globe section">
        <div className="container">
          <Reveal>
            <div className="section-label" style={{ textAlign: "center", display: "block" }}>The Prayer Network</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>Prayers Crossing<br /><em>the Earth</em></h2>
            <p className="section-body" style={{ textAlign: "center", maxWidth: 560, margin: "16px auto 0" }}>
              Every dot is a band carrying a prayer somewhere in the world. Tap one to read the prayer attached to it.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="prayer-map-wrap">
              <GlobalPrayerMap points={mapPoints} />
            </div>
          </Reveal>
        </div>
      </section>

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

      {/* ── Daily Tap ── */}
      <section id="daily" className="daily section">
        <div className="container">
          <div className="daily-inner">
            <Reveal>
              <div className="section-label">A Daily Rhythm</div>
              <h2 className="section-title">Tap Your Band<br /><em>Every Day</em></h2>
              <p className="section-body" style={{ marginTop: "24px" }}>
                Your band isn&rsquo;t only for the day you pass it on. Tap it each morning and it opens to a fresh verse and a moment to pray — a small, steady habit that anchors your day in scripture.
              </p>
              <p className="section-body" style={{ marginTop: "16px" }}>
                Day after day, those quiet taps add up: a rhythm of prayer that grows your faith and keeps you connected to everyone holding a band alongside you.
              </p>
              <div style={{ marginTop: "36px" }}>
                <Link href="/store" className="btn-primary">Start Your Daily Habit</Link>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="daily-card">
                <div className="daily-card-top">
                  <div className="daily-pulse" />
                  <div className="daily-card-label">Today&rsquo;s Verse</div>
                </div>
                <p className="daily-verse">&ldquo;This is the day that the Lord has made; let us rejoice and be glad in it.&rdquo;</p>
                <div className="daily-ref">Psalm 118:24</div>
                <div className="daily-tapnote">✝ &nbsp;A new verse and a moment of prayer, every time you tap.</div>
              </div>
            </Reveal>
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
                {tickerPrayers.map((p, i) => (
                  <div
                    key={p.band}
                    className="prayer-item"
                    style={{
                      background: i === activePrayer ? "rgba(200,169,110,0.10)" : "transparent",
                      borderLeft: i === activePrayer ? "3px solid var(--gold)" : "3px solid transparent",
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
      <SiteFooter />
    </>
  );
}
