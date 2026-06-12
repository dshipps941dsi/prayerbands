import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Prayer Circles — Prayer Bands",
  description: "A Prayer Circle is a small, private group that gathers around a shared prayer need. Create one, share a code, and pray together.",
};

const VALUES = [
  { icon: "🙏", title: "Gather Around a Need", body: "A person healing, a family in crisis, a season of seeking — a circle focuses a group's prayer on one specific need, together." },
  { icon: "🔒", title: "Private & Invite-Only", body: "Circles aren't public. The person who starts one shares a short join code, so only the people they invite can see and pray." },
  { icon: "✝", title: "Pray as One", body: "Members add requests, mark when they've interceded, and watch encouragement build — a quiet record that someone is always praying." },
];

const STEPS = [
  { num: "01", title: "Create a Circle", body: "Give it a name and a short description of what you're praying for. It takes less than a minute." },
  { num: "02", title: "Share the Code", body: "Every circle gets a unique join code (like GRACE7). Text it, email it, or share the link with the people you want praying." },
  { num: "03", title: "They Join", body: "No account is needed to view a circle — anyone with the code can read it. Signing in lets them post a request or mark a prayer." },
  { num: "04", title: "Pray Together", body: "Add needs as they come, tap to intercede, and keep the circle going for as long as the season lasts." },
];

export default function PrayerCirclesPage() {
  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .pc-hero {
          text-align: center; padding: 84px 24px 64px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .pc-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 16px;
        }
        .pc-title {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700;
          font-size: clamp(36px, 6vw, 60px); line-height: 1.08; color: #F5EDD8; margin-bottom: 20px;
        }
        .pc-title em { font-style: italic; color: #C8A96E; }
        .pc-sub { font-size: 17px; font-weight: 300; color: rgba(245,237,216,0.80); max-width: 560px; margin: 0 auto 32px; line-height: 1.8; }
        .pc-hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .pc-btn {
          display: inline-block; text-decoration: none; font-family: 'Cinzel', serif;
          font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
          padding: 14px 28px; border-radius: 8px;
        }
        .pc-btn-gold { background: #C8A96E; color: #0A1628; border: 1px solid #C8A96E; }
        .pc-btn-ghost { background: transparent; color: #F5EDD8; border: 1px solid rgba(200,169,110,0.55); }
        .pc-wrap { max-width: 760px; margin: 0 auto; padding: 64px 24px 8px; }
        .pc-lead {
          font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-style: italic;
          line-height: 1.6; color: #15223B; text-align: center; margin-bottom: 16px;
        }
        .pc-rule { width: 56px; height: 2px; background: linear-gradient(90deg, #C8A96E, #E2C98A); margin: 8px auto 40px; }
        .pc-p { font-size: 16px; line-height: 1.85; color: #4A5260; margin-bottom: 22px; }
        .pc-values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1000px; margin: 0 auto; padding: 40px 24px 8px; }
        .pc-card {
          background: #FFFDF8; border: 1px solid rgba(200,169,110,0.30); border-radius: 12px;
          padding: 28px 24px; text-align: center; box-shadow: 0 2px 12px rgba(10,22,40,0.05);
        }
        .pc-card-icon { font-size: 30px; margin-bottom: 14px; }
        .pc-card-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-weight: 700; color: #15223B; margin-bottom: 10px; }
        .pc-card-body { font-size: 14.5px; line-height: 1.7; color: #5C6573; }
        .pc-steps-section { max-width: 920px; margin: 0 auto; padding: 64px 24px 16px; }
        .pc-section-label { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #9A7A35; text-align: center; margin-bottom: 10px; }
        .pc-section-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(28px, 4vw, 40px); font-weight: 700; color: #15223B; text-align: center; margin-bottom: 36px; }
        .pc-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .pc-step {
          background: #FFFDF8; border: 1px solid rgba(200,169,110,0.30); border-left: 4px solid #C8A96E;
          border-radius: 10px; padding: 22px 24px; box-shadow: 0 1px 6px rgba(10,22,40,0.05);
        }
        .pc-step-num { font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; color: #C8A96E; letter-spacing: 0.1em; margin-bottom: 8px; }
        .pc-step-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 700; color: #15223B; margin-bottom: 8px; }
        .pc-step-body { font-size: 14.5px; line-height: 1.7; color: #5C6573; }
        .pc-cta { text-align: center; padding: 56px 24px 84px; }
        .pc-cta-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; font-weight: 700; color: #15223B; margin-bottom: 8px; }
        .pc-cta-sub { font-size: 15px; color: #5C6573; margin-bottom: 24px; }
        @media (max-width: 760px) { .pc-values, .pc-steps { grid-template-columns: 1fr; } }
      `}</style>

      <SiteHeader />

      <section className="pc-hero">
        <div className="pc-eyebrow">✝ Prayer Circles</div>
        <h1 className="pc-title">Pray Together,<br /><em>in One Accord</em></h1>
        <p className="pc-sub">A Prayer Circle is a small, private group that gathers around a single prayer need — and keeps praying until the season passes.</p>
        <div className="pc-hero-cta">
          <Link href="/circles/new" className="pc-btn pc-btn-gold">Start a Circle</Link>
          <Link href="/circles" className="pc-btn pc-btn-ghost">Join with a Code</Link>
        </div>
      </section>

      <div className="pc-wrap">
        <p className="pc-lead">&ldquo;For where two or three gather in my name, there am I with them.&rdquo; — Matthew 18:20</p>
        <div className="pc-rule" />
        <p className="pc-p">
          Some prayers are too heavy to carry alone. A new diagnosis, a wandering child, a marriage in a hard place,
          a community walking through loss — these are the moments when we most need others standing with us.
        </p>
        <p className="pc-p">
          A <strong>Prayer Circle</strong> is a simple, private space for exactly that. One person starts a circle around a
          specific need, shares a short join code, and the people they invite gather inside to pray. Members can add
          requests as things develop, mark when they&rsquo;ve interceded, and see — at a glance — that they are not
          praying alone. It&rsquo;s the small group around the hospital bed, made possible from anywhere in the world.
        </p>
        <p className="pc-p">
          Circles are <strong>invite-only</strong>. There&rsquo;s no public feed and no searching — the only way in is the
          code the creator shares. Anyone with that code can quietly read along; signing in lets them post a request or
          add their prayers to the circle.
        </p>
      </div>

      <div className="pc-values">
        {VALUES.map((v) => (
          <div key={v.title} className="pc-card">
            <div className="pc-card-icon">{v.icon}</div>
            <div className="pc-card-title">{v.title}</div>
            <div className="pc-card-body">{v.body}</div>
          </div>
        ))}
      </div>

      <div className="pc-steps-section">
        <div className="pc-section-label">How It Works</div>
        <h2 className="pc-section-title">From a need to a circle, in minutes</h2>
        <div className="pc-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="pc-step">
              <div className="pc-step-num">{s.num}</div>
              <div className="pc-step-title">{s.title}</div>
              <div className="pc-step-body">{s.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pc-cta">
        <div className="pc-cta-title">Gather your circle</div>
        <div className="pc-cta-sub">Start one around a need on your heart, or join one you&rsquo;ve been invited to.</div>
        <div className="pc-hero-cta">
          <Link href="/circles/new" className="pc-btn pc-btn-gold">Start a Circle</Link>
          <Link href="/circles" className="pc-btn pc-btn-ghost" style={{ color: "#0A1628", borderColor: "rgba(10,22,40,0.25)" }}>Join with a Code</Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
