import Link from "next/link";
import ShareSheet from "@/components/ShareSheet";

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
        .pbf-social { display: flex; gap: 12px; margin-top: 22px; }
        .pbf-social a {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(200,169,110,0.30);
          color: rgba(245,237,216,0.6); transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .pbf-social a:hover { color: #080F1E; background: #E2C98A; border-color: #E2C98A; }
        .pbf-social svg { width: 17px; height: 17px; }
        .pbf-bottom {
          border-top: 1px solid rgba(200,169,110,0.18);
          padding-top: 32px;
          display: flex; justify-content: space-between; align-items: center;
          gap: 16px; flex-wrap: wrap;
        }
        .pbf-copy { font-size: 0.78rem; color: rgba(245,237,216,0.3); }
        .pbf-copy a { color: rgba(245,237,216,0.45); text-decoration: none; }
        .pbf-copy a:hover { color: #E2C98A; }
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
            <div className="pbf-brand">Prayer Bands</div>
            <div className="pbf-tagline">
              A living chain of prayer, passed hand to hand, carried by faith around the world.
            </div>
            <div className="pbf-social">
              <a href="https://facebook.com/prayerbands" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z"/></svg>
              </a>
              <a href="https://instagram.com/prayer_bands" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="https://twitter.com/prayerbands" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.74-8.84L1.25 2.25H8.1l4.71 6.23 5.43-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z"/></svg>
              </a>
              <a href="https://tiktok.com/@prayerbands" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v12.97a2.32 2.32 0 1 1-2.32-2.32c.24 0 .47.04.69.1v-3.36a5.66 5.66 0 0 0-.69-.04 5.66 5.66 0 1 0 5.66 5.66V9.46a7.55 7.55 0 0 0 4.42 1.42V7.55a4.28 4.28 0 0 1-3.4-1.73Z"/></svg>
              </a>
              <a href="https://youtube.com/@prayerbands" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.13c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <div className="pbf-col-title">Platform</div>
            <Link href="/store" className="pbf-link">Get Bands</Link>
            <Link href="/subscribe" className="pbf-link">Subscribe</Link>
            <Link href="/prayer-wall" className="pbf-link">Prayer Wall</Link>
            <Link href="/prayer-circles" className="pbf-link">Prayer Circles</Link>
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
          <div className="pbf-copy">© {new Date().getFullYear()} Prayer Bands. All rights reserved. &nbsp;·&nbsp; <Link href="/site-map">Site Map</Link></div>
          <ShareSheet
            url="https://prayerbands.com"
            title="Prayer Bands"
            text="Carry His Word around the world — join the Prayer Bands movement. 🙏"
            label="Share Prayer Bands"
            variant="ghost"
          />
          <div className="pbf-verse">&ldquo;Pray without ceasing.&rdquo; — 1 Thessalonians 5:17</div>
        </div>
      </div>
    </footer>
  );
}
