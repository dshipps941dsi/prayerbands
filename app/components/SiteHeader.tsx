// Shared top navigation for standalone pages that would otherwise have no way
// back to the rest of the site (contact, subscribe, reset-password, etc.).
// Self-contained styles so it drops into any page without clashing.

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
        <a href="/" className="site-header-logo" aria-label="PrayerBands home">
          <span className="site-header-cross">✝</span>
          <span className="site-header-name">PrayerBands</span>
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
        .site-header {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(253,250,245,0.97);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          border-bottom: 1px solid #E8DFD0;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .site-header-inner {
          max-width: 1160px; margin: 0 auto; height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; gap: 14px;
        }
        .site-header-logo { display: flex; align-items: center; gap: 9px; text-decoration: none; flex-shrink: 0; }
        .site-header-cross {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #C8A96E, #B8944A);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: #fff;
        }
        .site-header-name { font-size: 18px; font-weight: 700; color: #2C1A0E; }
        .site-header-nav { display: flex; align-items: center; gap: 20px; }
        .site-header-link {
          font-size: 12.5px; letter-spacing: 0.08em; text-transform: uppercase;
          color: #5C3D2E; text-decoration: none; white-space: nowrap;
          font-family: 'Lato', Helvetica, Arial, sans-serif; transition: color 0.15s;
        }
        .site-header-link:hover { color: #C8A96E; }
        /* On phones, keep just the logo (home link) to avoid crowding/overflow;
           full nav returns on wider screens. */
        @media (max-width: 560px) {
          .site-header-nav { display: none; }
        }
      `}</style>
    </header>
  );
}
