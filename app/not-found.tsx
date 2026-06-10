import Logo from "@/components/Logo";

const CREAM = "#FAF6EF";
const DARK = "#2C1810";
const GOLD = "#B8860B";
const GRAY = "#7A6A5A";
const serif = "'Playfair Display', Georgia, serif";
const body = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const QUICK_LINKS = [
  { label: "Shop", href: "/store" },
  { label: "Prayer Wall", href: "/prayer-wall" },
  { label: "Sign In", href: "/signin" },
];

export default function NotFound() {
  return (
    <div style={{ background: CREAM, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", color: DARK }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');`}</style>

      <a href="/" aria-label="PrayerBands home" style={{ textDecoration: "none", marginBottom: 32 }}>
        <Logo size={40} withName nameColor={DARK} nameSize={22} />
      </a>

      <div style={{ fontFamily: body, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
        404 — Page not found
      </div>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, marginBottom: 12, lineHeight: 1.3, maxWidth: 360 }}>
        This page wandered off the path.
      </div>
      <div style={{ fontFamily: body, fontSize: 15, color: GRAY, fontStyle: "italic", lineHeight: 1.7, marginBottom: 32, maxWidth: 380 }}>
        The page you're looking for doesn't exist or may have moved. Let's get you back on the journey.
      </div>

      <a href="/" style={{ display: "inline-block", padding: "15px 36px", background: GOLD, color: "#0f0d09", borderRadius: 12, fontFamily: serif, fontSize: 16, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(184,134,11,0.25)" }}>
        Return home →
      </a>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20, marginTop: 28 }}>
        {QUICK_LINKS.map((l) => (
          <a key={l.href} href={l.href} style={{ fontFamily: body, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: GRAY, textDecoration: "none" }}>
            {l.label}
          </a>
        ))}
      </div>

      <div style={{ fontFamily: body, fontSize: 12, color: "#B8A898", fontStyle: "italic", marginTop: 40, maxWidth: 320, lineHeight: 1.6 }}>
        Scanned a band? Check the ID on your wristband and try the link again.
      </div>
    </div>
  );
}
