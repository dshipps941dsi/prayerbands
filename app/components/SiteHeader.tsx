// Shared top navigation for standalone pages that would otherwise have no way
// back to the rest of the site (contact, subscribe, reset-password, etc.).
// Self-contained styles so it drops into any page without clashing.

import Logo from "@/components/Logo";

const LINKS = [
  { label: "Shop", href: "/store", primary: true },
  { label: "How It Works", href: "/how-it-works", primary: false },
  { label: "Prayer Wall", href: "/prayer-wall", primary: false },
  { label: "Circles", href: "/prayer-circles", primary: false },
  { label: "Contact", href: "/contact", primary: true },
  { label: "Sign In", href: "/signin", primary: false },
];

const SOCIAL: { label: string; href: string; path: string; filled?: boolean }[] = [
  { label: "Facebook", href: "https://facebook.com/prayerbands", path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z", filled: true },
  { label: "Instagram", href: "https://instagram.com/prayer_bands", path: "instagram" },
  { label: "X (Twitter)", href: "https://twitter.com/prayerbands", path: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.74-8.84L1.25 2.25H8.1l4.71 6.23 5.43-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64Z", filled: true },
  { label: "TikTok", href: "https://tiktok.com/@prayerbands", path: "M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v12.97a2.32 2.32 0 1 1-2.32-2.32c.24 0 .47.04.69.1v-3.36a5.66 5.66 0 0 0-.69-.04 5.66 5.66 0 1 0 5.66 5.66V9.46a7.55 7.55 0 0 0 4.42 1.42V7.55a4.28 4.28 0 0 1-3.4-1.73Z", filled: true },
  { label: "YouTube", href: "https://youtube.com/@prayerbands", path: "M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.13c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z", filled: true },
];

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="/" className="site-header-logo" aria-label="Prayer Bands home">
          <Logo size={28} />
          <span className="site-header-name">Prayer Bands</span>
        </a>
        <nav className="site-header-nav">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`site-header-link${l.primary ? "" : " site-header-link--secondary"}`}
            >
              {l.label}
            </a>
          ))}
          <span className="site-header-social">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="site-header-social-link">
                {s.path === "instagram" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={s.path}/></svg>
                )}
              </a>
            ))}
          </span>
        </nav>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        .site-header {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(246,241,228,0.95);
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--pb-border-gold, rgba(200,169,110,0.34));
          font-family: var(--pb-font-display, 'Cormorant Garamond', Georgia, serif);
        }
        .site-header-inner {
          max-width: 1160px; margin: 0 auto; height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; gap: 14px;
        }
        .site-header-logo { display: flex; align-items: center; gap: 9px; text-decoration: none; flex-shrink: 0; }
        .site-header-name {
          font-family: var(--pb-font-heading, 'Cinzel', Georgia, serif);
          font-size: 17px; font-weight: 700; letter-spacing: 0.06em;
          color: var(--pb-ink, #15223B);
        }
        .site-header-nav { display: flex; align-items: center; gap: 22px; }
        .site-header-link {
          font-family: var(--pb-font-heading, 'Cinzel', Georgia, serif);
          font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
          color: var(--pb-slate, #5C6573); text-decoration: none; white-space: nowrap;
          transition: color 0.15s;
        }
        .site-header-link:hover { color: var(--pb-gold-ink, #9A7A35); }
        .site-header-link--secondary { color: var(--pb-ink, #15223B); }
        .site-header-social {
          display: flex; align-items: center; gap: 12px;
          padding-left: 16px; margin-left: 2px;
          border-left: 1px solid var(--pb-border-gold, rgba(200,169,110,0.34));
        }
        .site-header-social-link {
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--pb-slate, #5C6573); transition: color 0.15s;
        }
        .site-header-social-link:hover { color: var(--pb-gold-ink, #9A7A35); }
        .site-header-social-link svg { width: 16px; height: 16px; }
        /* Below the full-nav breakpoint but above phones, drop the social row
           first to keep the primary nav from wrapping. */
        @media (max-width: 780px) { .site-header-social { display: none; } }
        /* On phones, keep just the logo (home link) to avoid crowding/overflow;
           full nav returns on wider screens. */
        @media (max-width: 560px) {
          .site-header-nav { display: none; }
        }
      `}</style>
    </header>
  );
}
