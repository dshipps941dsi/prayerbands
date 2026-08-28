import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Our Story — Prayer Bands",
  description: "How Prayer Bands began, and the mission behind a living chain of prayer passed hand to hand.",
};

const VALUES = [
  { icon: "🤝", title: "Passed Hand to Hand", body: "A band is meant to move. You wear it, you pray, and then you give it away — carrying intercession to the next person who needs it." },
  { icon: "🌍", title: "A Global Chain", body: "Every band leaves a trail. As it travels city to city and country to country, its prayer journey becomes visible to everyone who has held it." },
  { icon: "🙏", title: "Prayer Without Ceasing", body: "Each tap is an invitation to pause and pray. The simple act, repeated by strangers, becomes a chain that never breaks." },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#F6F1E4", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#2A3344" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
        .ab-hero {
          text-align: center; padding: 84px 24px 64px;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }
        .ab-eyebrow {
          font-family: 'Cinzel', serif; font-size: 11px; font-weight: 600;
          letter-spacing: 0.25em; text-transform: uppercase; color: #C8A96E; margin-bottom: 16px;
        }
        .ab-title {
          font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700;
          font-size: clamp(36px, 6vw, 60px); line-height: 1.08; color: #F5EDD8; margin-bottom: 20px;
        }
        .ab-title em { font-style: italic; color: #C8A96E; }
        .ab-sub { font-size: 17px; font-weight: 300; color: rgba(245,237,216,0.80); max-width: 560px; margin: 0 auto; line-height: 1.8; }
        .ab-wrap { max-width: 760px; margin: 0 auto; padding: 64px 24px; }
        .ab-lead {
          font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; font-style: italic;
          line-height: 1.6; color: #15223B; text-align: center; margin-bottom: 40px;
        }
        .ab-p { font-size: 16px; line-height: 1.85; color: #4A5260; margin-bottom: 22px; }
        .ab-rule { width: 56px; height: 2px; background: linear-gradient(90deg, #C8A96E, #E2C98A); margin: 8px auto 40px; }
        .ab-values {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
          max-width: 1000px; margin: 0 auto; padding: 0 24px 72px;
        }
        .ab-card {
          background: #FFFDF8; border: 1px solid rgba(200,169,110,0.30); border-radius: 12px;
          padding: 28px 24px; text-align: center; box-shadow: 0 2px 12px rgba(10,22,40,0.05);
        }
        .ab-card-icon { font-size: 30px; margin-bottom: 14px; }
        .ab-card-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; font-weight: 700; color: #15223B; margin-bottom: 10px; }
        .ab-card-body { font-size: 14.5px; line-height: 1.7; color: #5C6573; }
        .ab-cta { text-align: center; padding: 8px 24px 84px; }
        .ab-btn {
          display: inline-block; background: #0E1E38; color: #F5EDD8; text-decoration: none;
          font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; font-weight: 600;
          padding: 15px 34px; border-radius: 6px; border: 1px solid rgba(200,169,110,0.45);
        }
        .ab-btn:hover { background: #15223B; }
        @media (max-width: 760px) { .ab-values { grid-template-columns: 1fr; } }
      `}</style>

      <SiteNav />

      <section className="ab-hero">
        <div className="ab-eyebrow">✝︎ Our Story</div>
        <h1 className="ab-title">A Living Chain<br /><em>of Prayer</em></h1>
        <p className="ab-sub">Prayer Bands began with a simple conviction: that prayer is meant to be shared, and that a small act of faith can travel further than we imagine.</p>
      </section>

      <div className="ab-wrap">
        <p className="ab-lead">&ldquo;Pray without ceasing.&rdquo; — 1 Thessalonians 5:17</p>
        <div className="ab-rule" />
        <p className="ab-p">
          It started with a question: what if a prayer didn't end with the person who prayed it? What if you could
          hand it to someone else — a friend, a stranger, someone in the middle of a hard season — and let it keep going?
        </p>
        <p className="ab-p">
          A PrayerBand is a wristband with a tiny chip and a unique ID. You wear it, you pray over it, and then you pass
          it on. Whoever receives it can tap it, read the prayers already attached, and add their own. Band by band,
          hand by hand, a chain of intercession forms — and you can watch it travel across the map as it goes.
        </p>
        <p className="ab-p">
          What began as a handful of bands shared among friends has become a network of prayers crossing cities,
          countries, and continents. Churches equip their congregations. Families pass bands down through generations.
          Strangers leave prayers for people they'll never meet. Each one is a reminder that no one prays alone.
        </p>
        <p className="ab-p">
          That's the heart of what we're building — not a product, but a way to keep prayer moving through the world.
        </p>
      </div>

      <div className="ab-values">
        {VALUES.map((v) => (
          <div key={v.title} className="ab-card">
            <div className="ab-card-icon">{v.icon}</div>
            <div className="ab-card-title">{v.title}</div>
            <div className="ab-card-body">{v.body}</div>
          </div>
        ))}
      </div>

      <div className="ab-cta">
        <Link href="/store" className="ab-btn">Start Your Band</Link>
      </div>

      <SiteFooter />
    </div>
  );
}
