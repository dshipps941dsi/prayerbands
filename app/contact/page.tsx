"use client";

import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

const CATEGORIES = [
  { value: "order", label: "Order & Shipping" },
  { value: "ministry", label: "Ministry & Band Journey" },
  { value: "technical", label: "Technical Support" },
  { value: "partnership", label: "Partnership & Bulk Orders" },
  { value: "subscription", label: "Subscription Plans" },
  { value: "other", label: "Other" },
];

interface FaqMatch {
  question: string;
  answer: string;
  confidence: "high" | "medium" | "low";
}

interface FormState {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
  });

  const [faqMatches, setFaqMatches] = useState<FaqMatch[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqDismissed, setFaqDismissed] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [charCount, setCharCount] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastQuery = useRef("");

  // Debounced AI FAQ lookup
  const lookupFaq = useCallback(async (query: string) => {
    if (query.length < 20 || query === lastQuery.current) return;
    lastQuery.current = query;
    setFaqLoading(true);
    // Keep the dismissed state and any already-shown results as-is while the
    // next search runs, so the panel doesn't reset on every keystroke.

    try {
      const res = await fetch("/api/faq-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        // Lock in results: only replace what's shown when the new search
        // actually found something. A longer query that matches nothing no
        // longer wipes out the answers already on screen.
        if (data.matches && data.matches.length > 0) {
          setFaqMatches(data.matches);
        }
      }
    } catch {
      // silently fail — don't block form
    } finally {
      setFaqLoading(false);
    }
  }, []);

  useEffect(() => {
    const combined = `${form.subject} ${form.message}`.trim();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (combined.length >= 20) {
      debounceTimer.current = setTimeout(() => lookupFaq(combined), 800);
    } else if (combined.length < 10) {
      // Only clear once the message is essentially empty — not mid-edit — so
      // results don't disappear while the user is still typing.
      setFaqMatches([]);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [form.subject, form.message, lookupFaq]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "message") setCharCount(value.length);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.category || !form.message) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setSubmitState("loading");
    setErrorMessage("");

    try {
      // Get reCAPTCHA token
      let recaptchaToken = "";
      if (RECAPTCHA_SITE_KEY && window.grecaptcha) {
        await new Promise<void>((resolve) => window.grecaptcha.ready(resolve));
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action: "contact_submit",
        });
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });

      if (res.ok) {
        setSubmitState("success");
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setSubmitState("error");
      }
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setSubmitState("error");
    }
  };

  const hasHighConfidenceMatch = faqMatches.some((m) => m.confidence === "high");

  if (submitState === "success") {
    return <SuccessPage name={form.name} />;
  }

  return (
    <>
      {/* reCAPTCHA v3 script */}
      {RECAPTCHA_SITE_KEY && (
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          async
          defer
        />
      )}

      <div className="contact-page">
        <div className="contact-inner">
          {/* Header */}
          <div className="contact-header">
            <div className="cross-ornament">✝</div>
            <h1>Get in Touch</h1>
            <p className="contact-subtitle">
              We&rsquo;re here to help you on your prayer journey. Expect a reply within 1–2 business days.
            </p>
          </div>

          <div className="contact-layout">
            {/* Left: Form */}
            <div className="form-section">
              <div className="parchment-card">
                <div className="form-grid">
                  {/* Name */}
                  <div className="field-group">
                    <label htmlFor="name">Your Name <span className="required">*</span></label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="First and last name"
                      autoComplete="name"
                    />
                  </div>

                  {/* Email */}
                  <div className="field-group">
                    <label htmlFor="email">Email Address <span className="required">*</span></label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  {/* Category */}
                  <div className="field-group field-full">
                    <label htmlFor="category">Topic <span className="required">*</span></label>
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                    >
                      <option value="">Select a topic…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div className="field-group field-full">
                    <label htmlFor="subject">Subject</label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="Brief summary of your question"
                    />
                  </div>

                  {/* Message */}
                  <div className="field-group field-full">
                    <label htmlFor="message">
                      Message <span className="required">*</span>
                      <span className="char-count">{charCount}/1000</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="How can we help? The more detail you share, the better we can serve you."
                      maxLength={1000}
                      rows={5}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="error-banner">
                    <span>⚠</span> {errorMessage}
                  </div>
                )}

                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={submitState === "loading"}
                >
                  {submitState === "loading" ? (
                    <span className="btn-loading">
                      <span className="spinner" /> Sending…
                    </span>
                  ) : (
                    "Send Message"
                  )}
                </button>

                <p className="recaptcha-notice">
                  Protected by Google reCAPTCHA.{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy
                  </a>{" "}
                  &amp;{" "}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                    Terms
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Right: FAQ Deflection + Info */}
            <div className="side-section">
              {/* AI FAQ Panel */}
              {(faqLoading || (faqMatches.length > 0 && !faqDismissed)) && (
                <div className={`faq-panel ${hasHighConfidenceMatch ? "faq-panel--highlight" : ""}`}>
                  <div className="faq-panel-header">
                    <div className="faq-icon">✦</div>
                    <div>
                      <h3>We may already have an answer</h3>
                      <p>Based on what you&rsquo;re typing…</p>
                    </div>
                    <button className="faq-dismiss" onClick={() => setFaqDismissed(true)}>
                      ×
                    </button>
                  </div>

                  {faqLoading && faqMatches.length === 0 && (
                    <div className="faq-searching">
                      <span className="pulse-dot" />
                      <span className="pulse-dot" />
                      <span className="pulse-dot" />
                      <span>Searching our knowledge base…</span>
                    </div>
                  )}

                  {faqMatches.map((match, i) => (
                    <FaqMatchCard key={i} match={match} />
                  ))}
                </div>
              )}

              {/* Contact info cards */}
              <div className="info-cards">
                <InfoCard
                  icon="⏱"
                  title="Response Time"
                  body="We reply within 1–2 business days. For urgent band delivery issues, mention 'URGENT' in your subject."
                />
                <InfoCard
                  icon="✝"
                  title="Ministry Support"
                  body="Questions about band journeys, prayer chains, and ministry partnerships are handled with special care."
                />
                <InfoCard
                  icon="📦"
                  title="Order Questions"
                  body="For tracking or delivery issues, have your order number ready — it starts with PB-."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </>
  );
}

function FaqMatchCard({ match }: { match: FaqMatch }) {
  const [expanded, setExpanded] = useState(match.confidence === "high");

  return (
    <div className={`faq-match faq-match--${match.confidence}`}>
      <button className="faq-match-q" onClick={() => setExpanded((v) => !v)}>
        <span className="faq-confidence-dot" />
        <span>{match.question}</span>
        <span className="faq-chevron">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="faq-match-a">{match.answer}</div>
      )}
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="info-card">
      <div className="info-card-icon">{icon}</div>
      <div>
        <h4>{title}</h4>
        <p>{body}</p>
      </div>
    </div>
  );
}

function SuccessPage({ name }: { name: string }) {
  return (
    <div className="success-page">
      <div className="success-inner">
        <div className="success-cross">✝</div>
        <h1>Message Received</h1>
        <p className="success-name">Thank you, {name}.</p>
        <p className="success-body">
          We&rsquo;ve received your message and will respond within 1–2 business days.
          In the meantime, your band journey continues — may it carry many prayers forward.
        </p>
        <div className="success-divider">· · ·</div>
        <div className="success-actions">
          <a href="/" className="success-btn success-btn--primary">Return Home</a>
          <a href="/wall" className="success-btn success-btn--ghost">Visit Prayer Wall</a>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

  .contact-page {
    min-height: 100vh;
    background: #faf7f2;
    background-image:
      radial-gradient(ellipse at 20% 20%, rgba(180,140,90,0.08) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(100,130,160,0.06) 0%, transparent 60%),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
    padding: 60px 24px 80px;
    font-family: 'Lora', Georgia, serif;
    color: #3a2f1e;
  }

  .contact-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* Header */
  .contact-header {
    text-align: center;
    margin-bottom: 52px;
  }

  .cross-ornament {
    font-size: 28px;
    color: #b8964a;
    opacity: 0.7;
    margin-bottom: 12px;
    display: block;
    letter-spacing: 2px;
  }

  .contact-header h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    color: #2a1f0e;
    margin: 0 0 14px;
    letter-spacing: -0.5px;
  }

  .contact-subtitle {
    font-size: 1.05rem;
    color: #7a6a52;
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.65;
    font-style: italic;
  }

  /* Layout */
  .contact-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 32px;
    align-items: start;
  }

  @media (max-width: 860px) {
    .contact-layout {
      grid-template-columns: 1fr;
    }
    .side-section {
      order: -1;
    }
  }

  /* Parchment card */
  .parchment-card {
    background: #fffdf7;
    border: 1px solid rgba(184,150,74,0.25);
    border-radius: 12px;
    padding: 36px 40px;
    box-shadow:
      0 2px 16px rgba(100,80,40,0.06),
      0 1px 3px rgba(100,80,40,0.08),
      inset 0 0 0 1px rgba(255,255,255,0.8);
  }

  @media (max-width: 580px) {
    .parchment-card { padding: 24px 20px; }
  }

  /* Form grid */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 580px) {
    .form-grid { grid-template-columns: 1fr; }
  }

  .field-full {
    grid-column: 1 / -1;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .field-group label {
    font-family: 'Playfair Display', serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: #5a4a30;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .required {
    color: #b8964a;
    font-weight: 700;
  }

  .char-count {
    font-family: 'Lora', serif;
    font-size: 0.75rem;
    color: #a09070;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
  }

  .field-group input,
  .field-group select,
  .field-group textarea {
    background: #faf8f3;
    border: 1.5px solid rgba(184,150,74,0.3);
    border-radius: 8px;
    padding: 11px 14px;
    font-family: 'Lora', serif;
    font-size: 0.95rem;
    color: #2a1f0e;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .field-group select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23b8964a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 40px;
    cursor: pointer;
  }

  .field-group input:focus,
  .field-group select:focus,
  .field-group textarea:focus {
    border-color: #b8964a;
    background: #fffdf7;
    box-shadow: 0 0 0 3px rgba(184,150,74,0.12);
  }

  .field-group textarea {
    resize: vertical;
    min-height: 120px;
    line-height: 1.6;
  }

  /* Error */
  .error-banner {
    background: #fef3f3;
    border: 1px solid rgba(200,80,80,0.3);
    border-radius: 8px;
    padding: 12px 16px;
    color: #a04040;
    font-size: 0.9rem;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Submit button */
  .submit-btn {
    width: 100%;
    background: linear-gradient(135deg, #b8964a 0%, #9a7a35 100%);
    color: #fffdf7;
    border: none;
    border-radius: 8px;
    padding: 15px 24px;
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 16px rgba(184,150,74,0.35);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(184,150,74,0.45);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .recaptcha-notice {
    text-align: center;
    font-size: 0.75rem;
    color: #a09070;
    margin-top: 14px;
    margin-bottom: 0;
    line-height: 1.5;
  }

  .recaptcha-notice a {
    color: #b8964a;
    text-decoration: none;
  }

  .recaptcha-notice a:hover {
    text-decoration: underline;
  }

  /* Side section */
  .side-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* FAQ Panel */
  .faq-panel {
    background: #fffdf7;
    border: 1.5px solid rgba(184,150,74,0.3);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(100,80,40,0.07);
    animation: fadeSlideIn 0.3s ease;
  }

  .faq-panel--highlight {
    border-color: rgba(184,150,74,0.6);
    box-shadow: 0 4px 20px rgba(184,150,74,0.18);
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .faq-panel-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    background: linear-gradient(135deg, rgba(184,150,74,0.1), rgba(184,150,74,0.05));
    border-bottom: 1px solid rgba(184,150,74,0.15);
  }

  .faq-icon {
    font-size: 18px;
    color: #b8964a;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .faq-panel-header h3 {
    font-family: 'Playfair Display', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #3a2f1e;
    margin: 0 0 3px;
  }

  .faq-panel-header p {
    font-size: 0.8rem;
    color: #7a6a52;
    margin: 0;
    font-style: italic;
  }

  .faq-dismiss {
    margin-left: auto;
    background: none;
    border: none;
    color: #a09070;
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .faq-dismiss:hover { color: #3a2f1e; }

  .faq-searching {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 14px 18px;
    font-size: 0.85rem;
    color: #7a6a52;
    font-style: italic;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #b8964a;
    border-radius: 50%;
    animation: pulse 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

  .pulse-dot:nth-child(2) { animation-delay: 0.2s; }
  .pulse-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  /* FAQ matches */
  .faq-match {
    border-bottom: 1px solid rgba(184,150,74,0.1);
  }

  .faq-match:last-child { border-bottom: none; }

  .faq-match-q {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 18px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: 'Lora', serif;
    font-size: 0.88rem;
    color: #3a2f1e;
    font-weight: 500;
    transition: background 0.15s;
  }

  .faq-match-q:hover { background: rgba(184,150,74,0.05); }

  .faq-confidence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .faq-match--high .faq-confidence-dot { background: #4caf79; }
  .faq-match--medium .faq-confidence-dot { background: #b8964a; }
  .faq-match--low .faq-confidence-dot { background: #a0aabb; }

  .faq-chevron {
    margin-left: auto;
    font-size: 10px;
    color: #b8964a;
    flex-shrink: 0;
  }

  .faq-match-a {
    padding: 4px 18px 14px 36px;
    font-size: 0.85rem;
    color: #5a4a30;
    line-height: 1.65;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Info cards */
  .info-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-card {
    display: flex;
    gap: 14px;
    background: #fffdf7;
    border: 1px solid rgba(184,150,74,0.2);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .info-card-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .info-card h4 {
    font-family: 'Playfair Display', serif;
    font-size: 0.88rem;
    font-weight: 600;
    color: #3a2f1e;
    margin: 0 0 5px;
  }

  .info-card p {
    font-size: 0.82rem;
    color: #7a6a52;
    line-height: 1.55;
    margin: 0;
  }

  /* Success */
  .success-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #faf7f2;
    padding: 40px 24px;
    font-family: 'Lora', Georgia, serif;
  }

  .success-inner {
    text-align: center;
    max-width: 520px;
    background: #fffdf7;
    border: 1px solid rgba(184,150,74,0.25);
    border-radius: 16px;
    padding: 52px 48px;
    box-shadow: 0 4px 32px rgba(100,80,40,0.08);
  }

  .success-cross {
    font-size: 36px;
    color: #b8964a;
    opacity: 0.6;
    margin-bottom: 20px;
    animation: gentleGlow 3s ease-in-out infinite;
  }

  @keyframes gentleGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.85; }
  }

  .success-inner h1 {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #2a1f0e;
    margin: 0 0 8px;
  }

  .success-name {
    font-size: 1.05rem;
    color: #b8964a;
    font-style: italic;
    margin: 0 0 20px;
  }

  .success-body {
    font-size: 0.95rem;
    color: #5a4a30;
    line-height: 1.7;
    margin: 0 0 28px;
  }

  .success-divider {
    color: #b8964a;
    opacity: 0.5;
    letter-spacing: 8px;
    margin-bottom: 28px;
    font-size: 1rem;
  }

  .success-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .success-btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }

  .success-btn--primary {
    background: linear-gradient(135deg, #b8964a, #9a7a35);
    color: #fffdf7;
    box-shadow: 0 3px 12px rgba(184,150,74,0.3);
  }

  .success-btn--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 16px rgba(184,150,74,0.4);
  }

  .success-btn--ghost {
    background: transparent;
    color: #b8964a;
    border: 1.5px solid rgba(184,150,74,0.4);
  }

  .success-btn--ghost:hover {
    background: rgba(184,150,74,0.07);
  }

  /* Hide reCAPTCHA badge (we show custom notice) */
  .grecaptcha-badge { visibility: hidden !important; }
`;
