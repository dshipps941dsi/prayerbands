import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Site Map — Prayer Bands",
  description: "Every public Prayer Bands page in one place.",
};

// Public pages, grouped. `note` flags pages that need a real ID/param and so
// can't be opened blind — they're listed for reference with an example path.
type Entry = { href: string; label: string; desc: string; note?: string };

const GROUPS: { title: string; intro: string; entries: Entry[] }[] = [
  {
    title: "Main Pages",
    intro: "Open to everyone, no sign-in required.",
    entries: [
      { href: "/", label: "Home", desc: "Landing page, live prayer map and stats." },
      { href: "/store", label: "Store", desc: "Browse and order bands." },
      { href: "/subscribe", label: "Subscribe", desc: "Recurring band plans (sign-in only at checkout)." },
      { href: "/prayer-wall", label: "Prayer Wall", desc: "Public wall of prayers left on bands." },
      { href: "/prayer-circles", label: "Prayer Circles", desc: "Explainer for the prayer-circles concept." },
      { href: "/circles", label: "Join a Circle", desc: "Enter a join code to preview/join a circle." },
      { href: "/about", label: "Our Story", desc: "Mission and background." },
      { href: "/faq", label: "FAQ", desc: "Frequently asked questions." },
      { href: "/contact", label: "Contact", desc: "Contact form." },
      { href: "/privacy", label: "Privacy Policy", desc: "Privacy policy." },
    ],
  },
  {
    title: "Sign-in & Account",
    intro: "Public entry points to the authenticated areas.",
    entries: [
      { href: "/signin", label: "Sign In", desc: "Account-type chooser." },
      { href: "/signin/personal", label: "Personal Sign In", desc: "Individual account sign-in." },
      { href: "/signin/org", label: "Church Sign In", desc: "Ministry / organization sign-in." },
      { href: "/reset-password", label: "Reset Password", desc: "Request a password reset link." },
    ],
  },
  {
    title: "Dashboards & Account",
    intro: "Require sign-in. Open while logged in to the matching account type.",
    entries: [
      { href: "/dashboard", label: "My Dashboard", desc: "Personal dashboard (individual account)." },
      { href: "/org/dashboard", label: "Church Dashboard", desc: "Ministry dashboard (org account)." },
      { href: "/settings", label: "Account Settings", desc: "Edit name, change password, sign out." },
    ],
  },
  {
    title: "Admin",
    intro: "Admin login only (dshipps941@gmail.com).",
    entries: [
      { href: "/admin", label: "Admin Home", desc: "Orders, shipments, sales, prayers, pricing." },
      { href: "/admin/orgs", label: "Churches", desc: "Manage organizations, generate & assign bands." },
      { href: "/admin/bands", label: "Band Management", desc: "Inventory and band records." },
      { href: "/admin/products", label: "Products", desc: "Store product catalog." },
      { href: "/admin/contacts", label: "Contacts", desc: "Contact-form submissions." },
    ],
  },
  {
    title: "Needs a Real ID / Token",
    intro: "These render off a band ID, subdomain, or token — open one from real data; the example paths below won't resolve on their own.",
    entries: [
      { href: "/band/PB-XXXXX", label: "Band Journey", desc: "A band's journey page.", note: "Replace PB-XXXXX with a real band ID." },
      { href: "/r/PB-XXXXX", label: "Short Band Link", desc: "Tap-target redirect printed on bands.", note: "Needs a real band ID." },
      { href: "/blessing/PB-XXXXX", label: "Blessing", desc: "Blessing screen for a band.", note: "Needs a real band ID." },
      { href: "/dedicate/PB-XXXXX", label: "Gift Dedication", desc: "Add a gift message to a band.", note: "Needs a band ID + ?token=." },
      { href: "/church/subdomain", label: "Church Landing", desc: "A ministry's branded landing page.", note: "Replace 'subdomain' with a real church subdomain." },
      { href: "/register?id=PB-XXXXX", label: "Register Redirect", desc: "Legacy entry that forwards to /band/[id].", note: "Needs ?id=<band ID>." },
    ],
  },
];

const cardBg = "#FFFDF8";
const navyHeading = "#15223B";
const gold = "#C8A96E";
const goldText = "#9A7A35";
const secondary = "#5C6573";
const borderNavy = "rgba(10,22,40,0.12)";

export default function SiteMapPage() {
  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .sm-hero {
          text-align: center; padding: 72px 24px 52px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .sm-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 14px;
        }
        .sm-title {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600;
          font-size: clamp(34px, 6vw, 52px); color: #F5EDD8; margin: 0 0 12px; line-height: 1.05;
        }
        .sm-sub {
          color: rgba(245,237,216,0.6); font-size: 15px; max-width: 540px; margin: 0 auto; line-height: 1.6;
        }
        .sm-wrap { max-width: 980px; margin: 0 auto; padding: 48px 24px 72px; }
        .sm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
        @media (max-width: 680px) { .sm-grid { grid-template-columns: 1fr; } }
        .sm-card {
          display: block; text-decoration: none; background: ${cardBg};
          border: 1px solid ${borderNavy}; border-radius: 10px; padding: 16px 18px;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .sm-card:hover { border-color: ${gold}; box-shadow: 0 4px 14px rgba(10,22,40,0.10); transform: translateY(-1px); }
        .sm-card-label { font-weight: 600; font-size: 15px; color: ${navyHeading}; margin-bottom: 3px; }
        .sm-card-path { font-family: monospace; font-size: 12px; color: ${goldText}; margin-bottom: 7px; word-break: break-all; }
        .sm-card-desc { font-size: 13px; color: ${secondary}; line-height: 1.5; }
        .sm-card-note { font-size: 11.5px; color: #b8763a; margin-top: 8px; font-style: italic; }
      `}</style>

      <SiteHeader />

      <div className="sm-hero">
        <div className="sm-eyebrow">For Testing</div>
        <h1 className="sm-title">Site Map</h1>
        <p className="sm-sub">Every page in one place — public, account, and admin. Tap through to test each one.</p>
      </div>

      <div className="sm-wrap">
        {GROUPS.map(group => (
          <section key={group.title} style={{ marginBottom: 44 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 600, color: navyHeading, margin: "0 0 4px" }}>{group.title}</h2>
            <p style={{ fontSize: 13.5, color: secondary, margin: 0, lineHeight: 1.55 }}>{group.intro}</p>
            <div className="sm-grid">
              {group.entries.map(e => (
                <Link key={e.href} href={e.href} className="sm-card" target="_blank" rel="noopener noreferrer">
                  <div className="sm-card-label">{e.label}</div>
                  <div className="sm-card-path">{e.href}</div>
                  <div className="sm-card-desc">{e.desc}</div>
                  {e.note && <div className="sm-card-note">⚑ {e.note}</div>}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
