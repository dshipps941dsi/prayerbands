import Link from "next/link";
import { SOCIAL } from '@/lib/social'
import { SocialIcon } from '@/components/SocialRow'
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
              {SOCIAL.map(s => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} ${s.handle}`}>
                  <SocialIcon name={s.key} size={18} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="pbf-col-title">Platform</div>
            <Link href="/store" className="pbf-link">Get Bands</Link>
            <Link href="/subscribe" className="pbf-link">Subscribe</Link>
            <Link href="/prayer-wall" className="pbf-link">Prayer Wall</Link>
            <Link href="/prayer-circles" className="pbf-link">Prayer Circles</Link>
            <Link href="/my-band" className="pbf-link">My Band</Link>
          </div>
          <div>
            <div className="pbf-col-title">About</div>
            <Link href="/about" className="pbf-link">Our Story</Link>
            <Link href="/how-it-works" className="pbf-link">How It Works</Link>
            <Link href="/contact" className="pbf-link">Contact</Link>
            <Link href="/faq" className="pbf-link">FAQ</Link>
            <Link href="/blog" className="pbf-link">Blog</Link>
          </div>
          <div>
            <div className="pbf-col-title">Account</div>
            <Link href="/signin" className="pbf-link">Sign In</Link>
            <Link href="/signin" className="pbf-link">Create Account</Link>
            <Link href="/my-band" className="pbf-link">My Band</Link>
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
