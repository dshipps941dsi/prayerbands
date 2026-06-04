'use client'
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

  // Subscribing must be tied to an account so each subscription links to a profile.
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/signin/personal'; return; }
      setAuthed(true);
    });
  }, []);

  const plan = PLANS.find(p => p.id === selected);
  const color = BAND_COLORS.find(c => c.id === bandColor);

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5ECD7', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, color: '#C8A96E', marginBottom: 16 }}>✝</div>
        <div style={{ fontSize: 16, color: '#8B7060' }}>Loading subscription plans…</div>
      </div>
    </div>
  );

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selected, bandColor })
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #F5ECD7;
          font-family: 'Lato', sans-serif;
          color: #3D2B1F;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 20% 10%, rgba(200,169,110,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 90%, rgba(123,143,174,0.10) 0%, transparent 50%),
            #F5ECD7;
        }

        /* ── HERO ── */
        .hero {
          text-align: center;
          padding: 72px 24px 48px;
          position: relative;
        }

        .hero-eyebrow {
          font-family: 'Lato', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #C8A96E;
          margin-bottom: 18px;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(36px, 6vw, 58px);
          font-weight: 700;
          color: #3D2B1F;
          line-height: 1.1;
          margin-bottom: 20px;
        }

        .hero-title em {
          font-style: italic;
          color: #7B8FAE;
        }

        .hero-subtitle {
          font-size: 17px;
          font-weight: 300;
          color: #6B5040;
          max-width: 520px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }

        .hero-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #C8A96E, transparent);
          margin: 0 auto 48px;
        }

        /* ── STEPS ── */
        .steps {
          display: flex;
          justify-content: center;
          gap: 0;
          max-width: 480px;
          margin: 0 auto 56px;
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
          border: 2px solid #D4C4A8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Lato', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #A89070;
          background: #F5ECD7;
          flex-shrink: 0;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }

        .step-dot.active {
          background: #C8A96E;
          border-color: #C8A96E;
          color: #fff;
          box-shadow: 0 0 0 4px rgba(200,169,110,0.2);
        }

        .step-dot.done {
          background: #7BAE8E;
          border-color: #7BAE8E;
          color: #fff;
        }

        .step-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #A89070;
        }

        .step-label.active { color: #C8A96E; }
        .step-label.done { color: #7BAE8E; }

        .step-line {
          flex: 1;
          height: 2px;
          background: #D4C4A8;
          margin: 0 8px;
        }

        .step-connector {
          display: flex;
          align-items: center;
          flex: 1;
        }

        /* ── SECTION TITLE ── */
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 600;
          color: #3D2B1F;
          text-align: center;
          margin-bottom: 8px;
        }

        .section-sub {
          font-size: 14px;
          color: #8B7060;
          text-align: center;
          margin-bottom: 36px;
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
          background: rgba(255,255,255,0.6);
          border: 2px solid #E0D0B8;
          border-radius: 20px;
          padding: 32px 28px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
          backdrop-filter: blur(4px);
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(61,43,31,0.12);
        }

        .plan-card.selected {
          border-width: 2px;
          box-shadow: 0 8px 32px rgba(61,43,31,0.15);
          background: rgba(255,255,255,0.85);
          transform: translateY(-4px);
        }

        .plan-tag {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #fff;
          white-space: nowrap;
        }

        .plan-icon {
          font-size: 28px;
          margin-bottom: 12px;
          display: block;
        }

        .plan-name {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: #3D2B1F;
          margin-bottom: 4px;
        }

        .plan-cadence {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .plan-desc {
          font-size: 14px;
          color: #6B5040;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .plan-pricing {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }

        .plan-total {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #3D2B1F;
        }

        .plan-period {
          font-size: 13px;
          color: #8B7060;
        }

        .plan-savings {
          font-size: 12px;
          font-weight: 700;
          color: #7BAE8E;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .plan-savings::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7BAE8E;
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
          color: #5B4030;
        }

        .perk-check {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #fff;
          flex-shrink: 0;
        }

        .select-btn {
          width: 100%;
          margin-top: 24px;
          padding: 14px;
          border-radius: 12px;
          border: 2px solid;
          font-family: 'Lato', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }

        .select-btn.selected-btn {
          color: #fff !important;
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
          border: 2px solid #E0D0B8;
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255,255,255,0.5);
        }

        .color-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61,43,31,0.1);
        }

        .color-card.selected {
          border-width: 2px;
          background: rgba(255,255,255,0.9);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61,43,31,0.15);
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
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #5B4030;
        }

        /* ── BAND PREVIEW ── */
        .band-preview {
          background: rgba(255,255,255,0.5);
          border: 2px solid #E0D0B8;
          border-radius: 20px;
          padding: 32px;
          text-align: center;
          margin-bottom: 32px;
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
          font-family: 'Lato', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #8B7060;
        }

        .band-preview-label {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          color: #3D2B1F;
          margin-bottom: 4px;
        }

        .band-preview-sub {
          font-size: 12px;
          color: #8B7060;
        }

        /* ── SUMMARY ── */
        .summary-card {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .summary-box {
          background: rgba(255,255,255,0.7);
          border: 2px solid #E0D0B8;
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(4px);
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          font-size: 14px;
          color: #5B4030;
          border-bottom: 1px solid #E8DCC8;
        }

        .summary-row:last-child { border-bottom: none; }

        .summary-row.total {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: #3D2B1F;
          padding-top: 16px;
          margin-top: 4px;
          border-top: 2px solid #D4C4A8;
          border-bottom: none;
        }

        .summary-label { font-weight: 400; }
        .summary-value { font-weight: 700; }
        .summary-savings { color: #7BAE8E; font-weight: 700; }

        /* ── BUTTONS ── */
        .btn-primary {
          width: 100%;
          padding: 18px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #3D2B1F 0%, #5B4030 100%);
          color: #F5ECD7;
          font-family: 'Lato', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 6px 20px rgba(61,43,31,0.3);
          margin-bottom: 12px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(61,43,31,0.4);
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
          border: 2px solid #D4C4A8;
          background: transparent;
          color: #8B7060;
          font-family: 'Lato', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          border-color: #C8A96E;
          color: #C8A96E;
        }

        /* ── TRUST BADGES ── */
        .trust-row {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
          margin-top: 28px;
          padding: 0 24px 24px;
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #8B7060;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .trust-icon {
          font-size: 16px;
        }

        /* ── TESTIMONIALS ── */
        .testimonials {
          max-width: 860px;
          margin: 56px auto 0;
          padding: 0 24px 72px;
        }

        .testimonials-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-style: italic;
          text-align: center;
          color: #3D2B1F;
          margin-bottom: 32px;
        }

        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .testimonial-card {
          background: rgba(255,255,255,0.5);
          border: 1px solid #E0D0B8;
          border-radius: 16px;
          padding: 24px;
        }

        .testimonial-text {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 14px;
          color: #5B4030;
          line-height: 1.7;
          margin-bottom: 16px;
        }

        .testimonial-author {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #A89070;
        }

        /* ── SCRIPTURE ── */
        .scripture-bar {
          background: rgba(61,43,31,0.04);
          border-top: 1px solid #E0D0B8;
          border-bottom: 1px solid #E0D0B8;
          padding: 20px 24px;
          text-align: center;
          margin: 0 0 48px;
        }

        .scripture-text {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 15px;
          color: #6B5040;
          max-width: 560px;
          margin: 0 auto 4px;
          line-height: 1.6;
        }

        .scripture-ref {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #C8A96E;
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
          <p className="hero-eyebrow">✝ PrayerBands Subscription</p>
          <h1 className="hero-title">
            Commit to Passing<br /><em>Prayer Forward</em>
          </h1>
          <p className="hero-subtitle">
            A band delivered to your door, ready to carry a prayer to someone who needs it.
            Subscribe and make intercession a rhythm of life.
          </p>
          <div className="hero-divider" />

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
              <span className={`step-label ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>Color</span>
            </div>
            <div className="step-connector">
              <div className="step-line" />
            </div>
            <div className="step-item">
              <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
              <span className={`step-label ${step === 3 ? 'active' : ''}`}>Confirm</span>
            </div>
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
                {PLANS.map(p => (
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
                  Continue — Choose Your Band Color →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: CHOOSE COLOR ── */}
          {step === 2 && (
            <div className="color-section">
              <p className="section-title">Choose Your Band Color</p>
              <p className="section-sub">This color will ship with every order in your subscription.</p>

              <div className="band-preview">
                <div className="band-visual">
                  <div
                    className="band-ring"
                    style={{ borderColor: color?.hex || '#7BB8D4' }}
                  />
                </div>
                <p className="band-preview-label">{color?.label} Band</p>
                <p className="band-preview-sub">Laser-engraved · NFC enabled · Silicone</p>
              </div>

              <div className="color-grid">
                {BAND_COLORS.map(c => (
                  <div
                    key={c.id}
                    className={`color-card ${bandColor === c.id ? 'selected' : ''}`}
                    style={bandColor === c.id ? { borderColor: c.hex } : {}}
                    onClick={() => setBandColor(c.id)}
                  >
                    <div
                      className="color-swatch"
                      style={{
                        background: c.hex,
                        boxShadow: `0 4px 16px ${c.hex}66`
                      }}
                    />
                    <p className="color-name">{c.label}</p>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={() => setStep(3)}>
                Continue — Review Your Order →
              </button>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back to Plans
              </button>
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 3 && plan && color && (
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
                  <span className="summary-label">Band color</span>
                  <span className="summary-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: color.hex,
                      boxShadow: `0 2px 6px ${color.hex}66`
                    }} />
                    {color.label}
                  </span>
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
                ← Back to Color
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
    </>
  );
}
