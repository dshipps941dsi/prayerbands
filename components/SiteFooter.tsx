import Link from "next/link";

// Shared site footer — self-contained navy + gold styling so it renders
// correctly on any page regardless of that page's own CSS. Used across the
// public-facing pages for a consistent base.
export default function SiteFooter() {
  return (
    <footer className="pbf">
      <style>{`
        .pbf {
          background: #080F1E;
          border-top: 1px solid rgba(200,169,110,0.18);
          padding: 60px 0 40px;
          font-family: 'Inter', sans-serif;
        }
        .pbf-inner {
          max-width: 1160px; margin: 0 auto; padding: 0 32px;
        }
        .pbf-grid {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px;
          margin-bottom: 48px;
        }
        .pbf-brand {
          font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 600;
          color: #E2C98A; letter-spacing: 0.08em; margin-bottom: 16px;
        }
        .pbf-tagline {
          font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic;
          color: rgba(245,237,216,0.45); font-size: 0.92rem; line-height: 1.7;
          max-width: 260px;
        }
        .pbf-col-title {
          font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase;
          color: #C8A96E; margin-bottom: 20px;
        }
        .pbf-link {
          display: block; color: rgba(245,237,216,0.5);
          font-size: 0.85rem; text-decoration: none; margin-bottom: 12px;
          transition: color 0.2s;
        }
        .pbf-link:hover { color: #E2C98A; }
        .pbf-bottom {
          border-top: 1px solid rgba(200,169,110,0.18);
          padding-top: 32px;
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
        }
        .pbf-copy { font-size: 0.78rem; color: rgba(245,237,216,0.3); }
        .pbf-verse {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic; font-size: 0.85rem; color: rgba(200,169,110,0.5);
        }
        @media (max-width: 900px) { .pbf-grid { grid-template-columns: 1fr 1fr; gap: 40px; } }
        @media (max-width: 600px) { .pbf-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="pbf-inner">
        <div className="pbf-grid">
          <div>
            <div className="pbf-brand">PrayerBands</div>
            <div className="pbf-tagline">
              A living chain of prayer, passed hand to hand, carried by faith around the world.
            </div>
          </div>
          <div>
            <div className="pbf-col-title">Platform</div>
            <Link href="/store" className="pbf-link">Get Bands</Link>
            <Link href="/subscribe" className="pbf-link">Subscribe</Link>
            <Link href="/prayer-wall" className="pbf-link">Prayer Wall</Link>
            <Link href="/dashboard" className="pbf-link">My Dashboard</Link>
          </div>
          <div>
            <div className="pbf-col-title">About</div>
            <Link href="/about" className="pbf-link">Our Story</Link>
            <Link href="/contact" className="pbf-link">Contact</Link>
            <Link href="/faq" className="pbf-link">FAQ</Link>
          </div>
          <div>
            <div className="pbf-col-title">Account</div>
            <Link href="/signin" className="pbf-link">Sign In</Link>
            <Link href="/signin" className="pbf-link">Create Account</Link>
            <Link href="/dashboard" className="pbf-link">Dashboard</Link>
          </div>
        </div>
        <div className="pbf-bottom">
          <div className="pbf-copy">© {new Date().getFullYear()} PrayerBands. All rights reserved.</div>
          <div className="pbf-verse">&ldquo;Pray without ceasing.&rdquo; — 1 Thessalonians 5:17</div>
        </div>
      </div>
    </footer>
  );
}
