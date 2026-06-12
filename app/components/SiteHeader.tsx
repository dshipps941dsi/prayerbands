// Shared top navigation for standalone pages that would otherwise have no way
// back to the rest of the site (contact, subscribe, reset-password, etc.).
// Self-contained styles so it drops into any page without clashing.

import Logo from "@/components/Logo";

const LINKS = [
  { label: "Shop", href: "/store", primary: true },
  { label: "Prayer Wall", href: "/prayer-wall", primary: false },
  { label: "Contact", href: "/contact", primary: true },
  { label: "Sign In", href: "/signin", primary: false },
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
        /* On phones, keep just the logo (home link) to avoid crowding/overflow;
           full nav returns on wider screens. */
        @media (max-width: 560px) {
          .site-header-nav { display: none; }
        }
      `}</style>
    </header>
  );
}
