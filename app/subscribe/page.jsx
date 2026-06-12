'use client'
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly Sender",
    cadence: "Every Month",
    bands: 1,
    interval: "month",
    intervalCount: 1,
    retailPrice: 5.00,
    discount: 20,
    bandPrice: 4.00,
    shipping: 2.99,
    total: 6.99,
    color: "#7B8FAE",
    accent: "#5a7a9e",
    icon: "✝",
    tag: "Most Popular",
    tagColor: "#7B8FAE",
    description: "One band delivered every month. A steady rhythm of prayer passed forward.",
    perks: ["1 band/month", "20% off retail", "$2.99 flat shipping", "Cancel anytime"],
  },
  {
    id: "quarterly",
    name: "Quarterly Sender",
    cadence: "Every 3 Months",
    bands: 1,
    interval: "month",
    intervalCount: 3,
    retailPrice: 5.00,
    discount: 10,
    bandPrice: 4.50,
    shipping: 2.99,
    total: 7.49,
    color: "#7BAE8E",
    accent: "#5a9e7b",
    icon: "✦",
    tag: "Best Value",
    tagColor: "#7BAE8E",
    description: "One band every quarter. A seasonal commitment to intentional giving.",
    perks: ["1 band/quarter", "10% off retail", "$2.99 flat shipping", "Cancel anytime"],
  },
  {
    id: "bundle",
    name: "Bundle Sender",
    cadence: "Every Month",
    bands: 3,
    interval: "month",
    intervalCount: 1,
    retailPrice: 15.00,
    discount: 25,
    bandPrice: 3.75,
    shipping: 2.99,
    total: 14.24,
    color: "#C8A96E",
    accent: "#a88840",
    icon: "❧",
    tag: "Most Impact",
    tagColor: "#C8A96E",
    description: "Three bands every month. For those called to spread prayer widely.",
    perks: ["3 bands/month", "25% off retail", "$2.99 flat shipping", "Cancel anytime"],
  },
];

const BAND_COLORS = [
  { id: "sky", label: "Sky Blue", hex: "#7BB8D4" },
  { id: "sage", label: "Sage Green", hex: "#7BAE8E" },
  { id: "amber", label: "Warm Amber", hex: "#C8A96E" },
  { id: "slate", label: "Slate Blue", hex: "#7B8FAE" },
  { id: "rose", label: "Dusty Rose", hex: "#C47B8E" },
  { id: "ivory", label: "Ivory", hex: "#E8DCC8" },
];

export default function SubscribePage() {
  const [selected, setSelected] = useState("monthly");
  const [bandColor, setBandColor] = useState("sky");
  const [step, setStep] = useState(1); // 1 = plan, 2 = color, 3 = confirm
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [plans, setPlans] = useState(PLANS);
  const [bandDesigns, setBandDesigns] = useState([]);
  const [bandDesign, setBandDesign] = useState('');

  // Anyone can browse plans; an account is only required at checkout so each
  // subscription can link to a profile.
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
    });
  }, []);

  // Pull live prices from the DB so the page matches what Stripe charges.
  // Presentational fields (color, icon, perks, shipping) stay local; the band
  // price / retail are derived from the DB total so the breakdown always sums.
  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(({ plans: db }) => {
      if (!db || !db.length) return;
      setPlans(prev => prev.map(p => {
        const d = db.find(x => x.id === p.id);
        if (!d) return p;
        const total = Number(d.total_price);
        const bands = d.bands_per_cycle ?? p.bands;
        const intervalCount = d.interval_months ?? p.intervalCount;
        const discount = d.discount_percent ?? p.discount;
        const shipping = d.shipping_price != null ? Number(d.shipping_price) : p.shipping;
        const bandPrice = bands > 0 ? Math.max(0, (total - shipping) / bands) : p.bandPrice;
        const retailPrice = discount > 0 ? bandPrice / (1 - discount / 100) : bandPrice;
        return { ...p, name: d.name ?? p.name, total, bands, intervalCount, discount, bandPrice, retailPrice };
      }));
    }).catch(() => {});
  }, []);

  // Band designs come straight from the store catalog (individual bands).
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(({ products }) => {
      const bands = (products || []).filter(p => p.category === 'band');
      setBandDesigns(bands);
      if (bands.length) setBandDesign(prev => prev || bands[0].slug);
    }).catch(() => {});
  }, []);

  const plan = plans.find(p => p.id === selected);
  const color = BAND_COLORS.find(c => c.id === bandColor);
  const selectedDesign = bandDesigns.find(d => d.slug === bandDesign);

  const handleCheckout = async () => {
    if (!authed) {
      window.location.href = '/signin/personal?redirect=' + encodeURIComponent('/subscribe');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected, bandColor, bandDesign })
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #F6F1E4;
          font-family: 'Inter', sans-serif;
          color: #2A3344;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 20% 10%, rgba(200,169,110,0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 90%, rgba(201,207,214,0.18) 0%, transparent 50%),
            #F6F1E4;
        }

        /* ── HERO ── */
        .hero {
          text-align: center;
          padding: 72px 24px 56px;
          position: relative;
          background:
            radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.16) 0%, transparent 60%),
            linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
          border-bottom: 1px solid rgba(200,169,110,0.34);
        }

        .hero-eyebrow {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #C8A96E;
          margin-bottom: 18px;
        }

        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 6vw, 58px);
          font-weight: 700;
          color: #F5EDD8;
          line-height: 1.1;
          margin-bottom: 20px;
        }

        .hero-title em {
          font-style: italic;
          color: #C8A96E;
        }

        .hero-subtitle {
          font-size: 17px;
          font-weight: 300;
          color: rgba(245,237,216,0.78);
          max-width: 520px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        .hero-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #E2C98A, transparent);
          margin: 0 auto;
        }

        /* ── STEPS ── */
        .steps {
          display: flex;
          justify-content: center;
          gap: 0;
          max-width: 480px;
          margin: 44px auto 56px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(201,207,214,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          color: #5C6573;
          background: #F6F1E4;
          flex-shrink: 0;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .step-dot.active {
          background: #C8A96E;
          border-color: #C8A96E;
          color: #0A1628;
          box-shadow: 0 0 0 4px rgba(200,169,110,0.20);
        }

        .step-dot.done {
          background: #9A7A35;
          border-color: #9A7A35;
          color: #fff;
        }

        .step-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5C6573;
        }

        .step-label.active { color: #9A7A35; }
        .step-label.done { color: #9A7A35; }

        .step-line {
          flex: 1;
          height: 1px;
          background: rgba(201,207,214,0.8);
          margin: 0 8px;
        }

        .step-connector {
          display: flex;
          align-items: center;
          flex: 1;
        }

        /* ── SECTION TITLE ── */
        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 600;
          color: #15223B;
          text-align: center;
          margin-bottom: 8px;
        }

        .section-sub {
          font-size: 14px;
          color: #5C6573;
          text-align: center;
          margin-bottom: 36px;
          font-family: 'Inter', sans-serif;
        }

        /* ── PLAN CARDS ── */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          max-width: 960px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .plan-card {
          background: #FFFDF8;
          border: 1px solid rgba(10,22,40,0.12);
          border-radius: 20px;
          padding: 32px 28px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
          box-shadow: 0 2px 12px rgba(10,22,40,0.06);
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(10,22,40,0.10);
        }

        .plan-card.selected {
          border-width: 2px;
          box-shadow: 0 8px 32px rgba(10,22,40,0.12);
          background: #FFFDF8;
          transform: translateY(-4px);
        }

        .plan-tag {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 16px;
          border-radius: 20px;
          font-family: 'Cinzel', serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #0A1628;
          white-space: nowrap;
        }

        .plan-icon {
          font-size: 28px;
          margin-bottom: 12px;
          display: block;
        }

        .plan-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 700;
          color: #15223B;
          margin-bottom: 4px;
        }

        .plan-cadence {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .plan-desc {
          font-size: 14px;
          color: #5C6573;
          line-height: 1.6;
          margin-bottom: 24px;
          font-family: 'Inter', sans-serif;
        }

        .plan-pricing {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }

        .plan-total {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px;
          font-weight: 700;
          color: #15223B;
        }

        .plan-period {
          font-size: 13px;
          color: #5C6573;
          font-family: 'Inter', sans-serif;
        }

        .plan-savings {
          font-size: 12px;
          font-weight: 600;
          color: #9A7A35;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
        }

        .plan-savings::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C8A96E;
        }

        .plan-perks {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .plan-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #2A3344;
          font-family: 'Inter', sans-serif;
        }

        .perk-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #0A1628;
          flex-shrink: 0;
        }

        .select-btn {
          width: 100%;
          margin-top: 24px;
          padding: 14px;
          border-radius: 12px;
          border: 2px solid;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }

        .select-btn.selected-btn {
          color: #0A1628 !important;
          border-color: transparent !important;
        }

        /* ── COLOR PICKER ── */
        .color-section {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }

        .color-card {
          border: 1px solid rgba(201,207,214,0.6);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #FFFDF8;
          box-shadow: 0 1px 6px rgba(10,22,40,0.05);
        }

        .color-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,22,40,0.08);
        }

        .color-card.selected {
          border-width: 2px;
          background: #FFFDF8;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(200,169,110,0.18);
        }

        .color-swatch {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin: 0 auto 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          position: relative;
        }

        .color-swatch::after {
          content: '✓';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #fff;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .color-card.selected .color-swatch::after {
          opacity: 1;
        }

        .color-name {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #2A3344;
          text-transform: uppercase;
        }

        /* ── BAND PREVIEW ── */
        .band-preview {
          background: #FFFDF8;
          border: 1px solid rgba(200,169,110,0.34);
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          margin-bottom: 32px;
          box-shadow: 0 2px 16px rgba(10,22,40,0.06);
        }

        .band-visual {
          width: 200px;
          height: 200px;
          margin: 0 auto 20px;
          position: relative;
        }

        .band-ring {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 28px solid;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 4px 12px rgba(255,255,255,0.3);
          transition: all 0.4s;
          position: relative;
        }

        .band-ring::after {
          content: 'PB-XXXXX';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          color: #5C6573;
        }

        .band-preview-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #15223B;
          margin-bottom: 4px;
        }

        .band-preview-sub {
          font-size: 12px;
          color: #5C6573;
          font-family: 'Inter', sans-serif;
        }

        /* ── SUMMARY ── */
        .summary-card {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .summary-box {
          background: #FFFDF8;
          border: 1px solid rgba(200,169,110,0.34);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 2px 16px rgba(10,22,40,0.06);
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          font-size: 14px;
          color: #2A3344;
          border-bottom: 1px solid rgba(201,207,214,0.50);
          font-family: 'Inter', sans-serif;
        }

        .summary-row:last-child { border-bottom: none; }

        .summary-row.total {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 700;
          color: #15223B;
          padding-top: 16px;
          margin-top: 4px;
          border-top: 2px solid rgba(200,169,110,0.34);
          border-bottom: none;
        }

        .summary-label { font-weight: 400; }
        .summary-value { font-weight: 600; }
        .summary-savings { color: #9A7A35; font-weight: 600; }

        /* ── BUTTONS ── */
        .btn-primary {
          width: 100%;
          padding: 18px;
          border-radius: 14px;
          border: none;
          background: #C8A96E;
          color: #0A1628;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 18px rgba(200,169,110,0.30);
          margin-bottom: 12px;
        }

        .btn-primary:hover {
          background: #E2C98A;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(200,169,110,0.40);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid rgba(201,207,214,0.70);
          background: transparent;
          color: #5C6573;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: rgba(200,169,110,0.34);
          color: #9A7A35;
        }

        /* ── TRUST BADGES ── */
        .trust-row {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
          margin-top: 28px;
          padding: 20px 24px 28px;
          background: #ECEEF1;
          border-top: 1px solid rgba(201,207,214,0.60);
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          color: #5C6573;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .trust-icon {
          font-size: 16px;
        }

        /* ── TESTIMONIALS ── */
        .testimonials {
          max-width: 860px;
          margin: 0 auto;
          padding: 56px 24px 72px;
        }

        .testimonials-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-style: italic;
          text-align: center;
          color: #15223B;
          margin-bottom: 32px;
        }

        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .testimonial-card {
          background: #FFFDF8;
          border: 1px solid rgba(10,22,40,0.12);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 8px rgba(10,22,40,0.05);
        }

        .testimonial-text {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 15px;
          color: #2A3344;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .testimonial-author {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #5C6573;
        }

        /* ── SCRIPTURE ── */
        .scripture-bar {
          background: #ECEEF1;
          border-top: 1px solid rgba(201,207,214,0.60);
          border-bottom: 1px solid rgba(201,207,214,0.60);
          padding: 20px 24px;
          text-align: center;
          margin: 0 0 48px;
        }

        .scripture-text {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 16px;
          color: #2A3344;
          max-width: 560px;
          margin: 0 auto 4px;
          line-height: 1.6;
        }

        .scripture-ref {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #9A7A35;
        }

        /* ── CONTENT SECTIONS ── */
        .content {
          padding: 0 0 40px;
        }

        @media (max-width: 640px) {
          .plans-grid { grid-template-columns: 1fr; }
          .color-grid { grid-template-columns: repeat(2, 1fr); }
          .steps { max-width: 100%; padding: 0 24px; }
          .step-label { display: none; }
        }
      `}</style>

      <div className="page">
        {/* Hero */}
        <div className="hero">
          <p className="hero-eyebrow">✝ Prayer Bands Subscription</p>
          <h1 className="hero-title">
            Commit to Passing<br /><em>Prayer Forward</em>
          </h1>
          <p className="hero-subtitle">
            A band delivered to your door, ready to carry a prayer to someone who needs it.
            Subscribe and make intercession a rhythm of life.
          </p>
          <div className="hero-divider" />
        </div>

        {/* Step Indicators */}
        <div className="steps">
            <div className="step-item">
              <div className={`step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <span className={`step-label ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>Plan</span>
            </div>
            <div className="step-connector">
              <div className="step-line" />
            </div>
            <div className="step-item">
              <div className={`step-dot ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <span className={`step-label ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>Band</span>
            </div>
            <div className="step-connector">
              <div className="step-line" />
            </div>
            <div className="step-item">
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
              <span className={`step-label ${step === 3 ? 'active' : ''}`}>Confirm</span>
            </div>
          </div>

        <div className="scripture-bar">
          <p className="scripture-text">"Pray without ceasing."</p>
          <p className="scripture-ref">1 Thessalonians 5:17</p>
        </div>

        <div className="content">

          {/* ── STEP 1: CHOOSE PLAN ── */}
          {step === 1 && (
            <>
              <p className="section-title">Choose Your Plan</p>
              <p className="section-sub">Every plan includes free cancellation, always.</p>
              <div className="plans-grid">
                {plans.map(p => (
                  <div
                    key={p.id}
                    className={`plan-card ${selected === p.id ? 'selected' : ''}`}
                    style={selected === p.id ? { borderColor: p.color } : {}}
                    onClick={() => setSelected(p.id)}
                  >
                    <div className="plan-tag" style={{ background: p.color }}>{p.tag}</div>

                    <span className="plan-icon" style={{ color: p.color }}>{p.icon}</span>
                    <p className="plan-name">{p.name}</p>
                    <p className="plan-cadence" style={{ color: p.color }}>{p.cadence}</p>
                    <p className="plan-desc">{p.description}</p>

                    <div className="plan-pricing">
                      <span className="plan-total">${p.total.toFixed(2)}</span>
                      <span className="plan-period">/ {p.intervalCount > 1 ? `${p.intervalCount} mo` : 'mo'}</span>
                    </div>
                    <p className="plan-savings">
                      {p.discount}% off retail · {p.bands > 1 ? `${p.bands} bands included` : '1 band included'}
                    </p>

                    <ul className="plan-perks">
                      {p.perks.map((perk, i) => (
                        <li key={i} className="plan-perk">
                          <span className="perk-check" style={{ background: p.color }}>✓</span>
                          {perk}
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`select-btn ${selected === p.id ? 'selected-btn' : ''}`}
                      style={selected === p.id
                        ? { background: p.color }
                        : { borderColor: p.color, color: p.color }
                      }
                      onClick={() => setSelected(p.id)}
                    >
                      {selected === p.id ? '✓ Selected' : 'Select Plan'}
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ maxWidth: 480, margin: '40px auto 0', padding: '0 24px' }}>
                <button className="btn-primary" onClick={() => setStep(2)}>
                  Continue — Choose Your Band →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: CHOOSE BAND DESIGN ── */}
          {step === 2 && (
            <div className="color-section">
              <p className="section-title">Choose Your Band</p>
              <p className="section-sub">Pick the band we&rsquo;ll ship with your subscription. You can set color &amp; size anytime from your dashboard.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 760, margin: '0 auto 8px', textAlign: 'left' }}>
                {bandDesigns.length === 0 && (
                  <p className="section-sub" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Loading bands…</p>
                )}
                {bandDesigns.map(d => {
                  const isSel = bandDesign === d.slug;
                  const accent = d.color || '#C8A96E';
                  return (
                    <div key={d.slug} onClick={() => setBandDesign(d.slug)} style={{
                      cursor: 'pointer',
                      background: '#FFFDF8',
                      border: `2px solid ${isSel ? accent : 'rgba(10,22,40,0.10)'}`,
                      borderRadius: 14,
                      padding: '20px 22px',
                      boxShadow: isSel ? `0 8px 28px ${accent}44` : '0 2px 10px rgba(10,22,40,0.06)',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 26 }}>{d.icon || '✝'}</span>
                        {d.tag && <span style={{ fontSize: 10, fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, border: `1px solid ${accent}55`, borderRadius: 20, padding: '2px 10px' }}>{d.tag}</span>}
                      </div>
                      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#15223B', margin: '0 0 4px' }}>{d.name}</p>
                      <p style={{ fontSize: 13, color: '#5C6573', lineHeight: 1.5, margin: '0 0 12px' }}>{d.description}</p>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: accent }}>{isSel ? '✓ Selected' : 'Select'}</div>
                    </div>
                  );
                })}
              </div>

              <button className="btn-primary" onClick={() => setStep(3)} disabled={!bandDesign}>
                Continue — Review Your Order →
              </button>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back to Plans
              </button>
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 3 && plan && (
            <div className="summary-card">
              <p className="section-title">Review Your Subscription</p>
              <p className="section-sub">Everything looks good? Let's get you set up.</p>

              <div className="summary-box">
                <div className="summary-row">
                  <span className="summary-label">Plan</span>
                  <span className="summary-value">{plan.name}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Cadence</span>
                  <span className="summary-value">{plan.cadence}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Bands per shipment</span>
                  <span className="summary-value">{plan.bands}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Band</span>
                  <span className="summary-value">{selectedDesign ? selectedDesign.name : 'Standard Band'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Band price</span>
                  <span className="summary-value">${(plan.bandPrice * plan.bands).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">You save</span>
                  <span className="summary-savings">
                    ${((plan.retailPrice * plan.bands) - (plan.bandPrice * plan.bands)).toFixed(2)} ({plan.discount}% off)
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Shipping</span>
                  <span className="summary-value">${plan.shipping.toFixed(2)} / shipment</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${plan.total.toFixed(2)} / {plan.intervalCount > 1 ? `${plan.intervalCount} mo` : 'mo'}</span>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? 'Redirecting to Checkout...' : `Subscribe for $${plan.total.toFixed(2)} / ${plan.intervalCount > 1 ? `${plan.intervalCount} mo` : 'mo'} →`}
              </button>
              <button className="btn-secondary" onClick={() => setStep(2)}>
                ← Back to Band
              </button>
            </div>
          )}

        </div>

        {/* Trust */}
        <div className="trust-row">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            Secure Checkout via Stripe
          </div>
          <div className="trust-item">
            <span className="trust-icon">✦</span>
            Cancel Anytime
          </div>
          <div className="trust-item">
            <span className="trust-icon">📦</span>
            Ships Within 3 Days
          </div>
          <div className="trust-item">
            <span className="trust-icon">🙏</span>
            Faith-Driven Ministry
          </div>
        </div>

        {/* Testimonials */}
        <div className="testimonials">
          <p className="testimonials-title">"What subscribers are saying..."</p>
          <div className="testimonial-grid">
            {[
              {
                text: "I started with one band a month and have already passed five on. Every single person I gave one to was moved. This subscription changed my prayer life.",
                author: "Sarah M. — Nashville, TN",
              },
              {
                text: "The bands arrive and I pray over each one before I give it away. Having them come automatically means I'm always ready to act when God nudges me.",
                author: "Pastor James H. — Atlanta, GA",
              },
              {
                text: "I got the bundle plan for my small group. We each take a band and commit to passing it within the month. It's become our accountability ritual.",
                author: "Rebecca L. — Denver, CO",
              },
            ].map((t, i) => (
              <div key={i} className="testimonial-card">
                <p className="testimonial-text">"{t.text}"</p>
                <p className="testimonial-author">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
