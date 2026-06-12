"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Request a Feature" },
  { value: "other", label: "Other" },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is a PrayerBand and how does it work?",
    a: "A PrayerBand is a wristband with a tiny NFC chip and a unique ID. Tap it with your phone (or visit its link) to read the prayers attached to it and add your own. Each band builds a living chain of prayer as it passes from person to person.",
  },
  {
    q: "Do I need an app to use my band?",
    a: "No app required. Most modern phones read NFC tags automatically — just tap the band to the back of your phone and a link opens. You can also visit the band's page directly in any web browser.",
  },
  {
    q: "How long does shipping take?",
    a: "Orders typically ship within 3 business days. Domestic delivery usually arrives within 5–7 business days after shipping; international can take longer. If you have an urgent need, mention 'URGENT' in your message subject.",
  },
  {
    q: "How do I track my order or fix a delivery problem?",
    a: "Use the form above and choose 'Order & Shipping' as the topic, then enter your order number (it starts with PB-). We'll look into tracking, address corrections, or replacements right away.",
  },
  {
    q: "What if I lose my band?",
    a: "You can order a replacement band that we'll link back into your existing prayer journey, so the chain isn't broken. Reach out through the form and select 'Order & Shipping' if you need help with this.",
  },
  {
    q: "Can I attach my band to my account if I have more than one?",
    a: "Yes. When you tap a new band while signed in, you can claim it to your account. All of your bands then appear together in your dashboard, no matter how many you own.",
  },
  {
    q: "How do subscriptions work?",
    a: "Subscriptions ship new bands to you on a schedule — monthly, quarterly, or a monthly bundle — at a discount off retail. You can cancel anytime, with no cancellation fee.",
  },
  {
    q: "Do you offer bulk pricing for churches and ministries?",
    a: "We do. Bulk packs are available for congregations, youth groups, and mission organizations, with discounts on larger orders. Choose 'Partnership & Bulk Orders' above and tell us about your group.",
  },
  {
    q: "Is my prayer private?",
    a: "When you add a prayer you choose its visibility. Private prayers stay within the band's network; if you choose to share one publicly on the Prayer Wall, you can post anonymously or with just your first name and last initial.",
  },
  {
    q: "How quickly will I hear back from you?",
    a: "We reply to messages within 1–2 business days. Ministry and partnership questions are handled with special care, so those may take a little extra time to answer thoroughly.",
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: "Use the form above and choose 'Report a Bug' or 'Request a Feature' as the topic. For bugs, tell us what you were doing, what you expected, and what happened instead (and the band ID or page if relevant) — the more detail, the faster we can fix it. For feature ideas, describe what you'd love to see and why; we read every suggestion.",
  },
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
  orderNumber: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    category: "",
    orderNumber: "",
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

  // Always open at the top (the page is tall with an FAQ below the form).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Debounced AI FAQ lookup
  const lookupFaq = useCallback(async (query: string) => {
    if (query.length < 20 || query === lastQuery.current) return;
    lastQuery.current = query;
    setFaqDismissed(false);
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

      <SiteHeader />

      {/* Navy + gold hero band — carries the home-page identity onto this page */}
      <div className="contact-hero">
        <div className="contact-hero-grid" />
        <div className="contact-hero-inner">
          <h1>Get in Touch</h1>
          <div className="contact-hero-rule" />
          <p className="contact-subtitle">
            We&rsquo;re here to help you on your prayer journey. Expect a reply within 1–2 business days.
          </p>
        </div>
      </div>

      <div className="contact-page">
        <div className="contact-inner">
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

                  {/* Order number — only for Order & Shipping */}
                  {form.category === "order" && (
                    <div className="field-group field-full">
                      <label htmlFor="orderNumber">Order Number</label>
                      <input
                        id="orderNumber"
                        name="orderNumber"
                        value={form.orderNumber}
                        onChange={handleChange}
                        placeholder="e.g. PB-12345 or your order/receipt number"
                        autoComplete="off"
                      />
                    </div>
                  )}

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

                {/* Inline AI suggestions — slide in between the message and Submit */}
                {!faqDismissed && (faqLoading || faqMatches.length > 0) && (
                  <div className={`inline-suggestions ${hasHighConfidenceMatch ? "inline-suggestions--high" : ""}`}>
                    {faqLoading && faqMatches.length === 0 ? (
                      <div className="suggestions-loading">
                        <span className="pulse-dot" />
                        <span className="pulse-dot" />
                        <span className="pulse-dot" />
                        <span>Looking for answers…</span>
                      </div>
                    ) : (
                      <>
                        <div className="suggestions-header">
                          <span className="suggestions-icon">✦</span>
                          <span className="suggestions-title">
                            {hasHighConfidenceMatch ? "We may already have an answer for you" : "Related help topics"}
                          </span>
                          <button className="suggestions-dismiss" onClick={() => setFaqDismissed(true)} aria-label="Dismiss suggestions">
                            ×
                          </button>
                        </div>
                        <div className="suggestions-list">
                          {faqMatches.map((match, i) => (
                            <details key={i} className={`suggestion-item suggestion-item--${match.confidence}`}>
                              <summary className="suggestion-question">{match.question}</summary>
                              <div className="suggestion-answer">{match.answer}</div>
                            </details>
                          ))}
                        </div>
                        {hasHighConfidenceMatch && (
                          <p className="suggestions-footer">
                            Does this answer your question? If not, finish the form below and we&rsquo;ll get back to you.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

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

          {/* Static FAQ section */}
          <FaqSection />
        </div>
      </div>

      <SiteFooter />
      <style>{styles}</style>
    </>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq-section">
      <div className="faq-section-head">
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers to the questions we hear most. Still stuck? Send us a note above.</p>
      </div>

      <div className="faq-list">
        {FAQ_ITEMS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={i} className={`faq-item ${open ? "faq-item--open" : ""}`}>
              <button
                className="faq-q"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
              >
                <span>{item.q}</span>
                <span className="faq-toggle">{open ? "–" : "+"}</span>
              </button>
              <div className="faq-a-wrap" style={{ maxHeight: open ? 400 : 0 }}>
                <p className="faq-a">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
          <a href="/prayer-wall" className="success-btn success-btn--ghost">Visit Prayer Wall</a>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

  .contact-page {
    min-height: 100vh;
    background: #F6F1E4;
    background-image:
      radial-gradient(ellipse at 20% 20%, rgba(200,169,110,0.09) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(201,207,214,0.10) 0%, transparent 60%);
    padding: 48px 24px 80px;
    font-family: 'Inter', system-ui, sans-serif;
    color: #2A3344;
  }

  .contact-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* Navy + gold hero band */
  .contact-hero {
    position: relative;
    overflow: hidden;
    text-align: center;
    padding: 56px 24px 48px;
    background:
      radial-gradient(ellipse 70% 80% at 50% 0%, rgba(200,169,110,0.14) 0%, transparent 60%),
      linear-gradient(180deg, #0A1628 0%, #0E1E38 55%, #0A1628 100%);
    border-bottom: 1px solid rgba(200,169,110,0.34);
  }

  .contact-hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(200,169,110,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(200,169,110,0.05) 1px, transparent 1px);
    background-size: 64px 64px;
    -webkit-mask-image: radial-gradient(ellipse 60% 70% at 50% 30%, black 0%, transparent 80%);
    mask-image: radial-gradient(ellipse 60% 70% at 50% 30%, black 0%, transparent 80%);
    pointer-events: none;
  }

  .contact-hero-inner {
    position: relative;
    max-width: 1100px;
    margin: 0 auto;
  }

  .cross-ornament {
    font-size: 28px;
    color: #9A7A35;
    opacity: 0.85;
    margin-bottom: 12px;
    display: block;
    letter-spacing: 2px;
  }

  .contact-hero h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    color: #F5EDD8;
    margin: 0 0 14px;
    letter-spacing: -0.5px;
  }

  .contact-hero-rule {
    width: 56px;
    height: 2px;
    margin: 0 auto 16px;
    background: linear-gradient(90deg, #C8A96E, #E2C98A);
    border-radius: 2px;
  }

  .contact-subtitle {
    font-size: 1.05rem;
    color: rgba(245,237,216,0.78);
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.65;
    font-style: italic;
  }

  /* Layout — single centered column (better on mobile, suggestions in context) */
  .contact-layout {
    max-width: 680px;
    margin: 0 auto;
  }

  /* Main form card */
  .parchment-card {
    background: #FFFDF8;
    border: 1px solid rgba(200,169,110,0.34);
    border-radius: 12px;
    padding: 36px 40px;
    box-shadow:
      0 2px 16px rgba(10,22,40,0.06),
      0 1px 3px rgba(10,22,40,0.05),
      inset 0 0 0 1px rgba(255,255,255,0.7);
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
    font-family: 'Cinzel', serif;
    font-size: 0.72rem;
    font-weight: 600;
    color: #5C6573;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .required {
    color: #C8A96E;
    font-weight: 700;
  }

  .char-count {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: #5C6573;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
  }

  .field-group input,
  .field-group select,
  .field-group textarea {
    background: #F6F1E4;
    border: 1.5px solid rgba(200,169,110,0.34);
    border-radius: 8px;
    padding: 11px 14px;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #15223B;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .field-group select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239A7A35' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-color: #F6F1E4;
    padding-right: 40px;
    cursor: pointer;
  }

  .field-group input:focus,
  .field-group select:focus,
  .field-group textarea:focus {
    border-color: #C8A96E;
    background: #FFFDF8;
    box-shadow: 0 0 0 3px rgba(200,169,110,0.15);
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

  /* Inline AI suggestions (between the message field and Submit) */
  .inline-suggestions {
    background: linear-gradient(135deg, rgba(200,169,110,0.10), rgba(236,238,241,0.45));
    border: 1.5px solid rgba(200,169,110,0.34);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
    animation: fadeSlideIn 0.25s ease;
  }

  .inline-suggestions--high {
    border-color: rgba(200,169,110,0.65);
    background: linear-gradient(135deg, rgba(200,169,110,0.16), rgba(255,253,248,0.6));
  }

  .suggestions-loading {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #5C6573;
    font-style: italic;
  }

  .suggestions-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .suggestions-icon { color: #9A7A35; font-size: 0.9rem; flex-shrink: 0; }

  .suggestions-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.02rem;
    font-weight: 600;
    color: #15223B;
    flex: 1;
  }

  .suggestions-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: #5C6573;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0 2px;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .suggestions-dismiss:hover { color: #15223B; }

  .suggestions-list { display: flex; flex-direction: column; gap: 6px; }

  .suggestion-item {
    border: 1px solid rgba(200,169,110,0.20);
    border-radius: 7px;
    overflow: hidden;
    background: rgba(255,253,248,0.7);
  }

  .suggestion-item.suggestion-item--high { border-color: rgba(200,169,110,0.45); }

  .suggestion-question {
    cursor: pointer;
    padding: 10px 14px;
    list-style: none;
    font-family: 'Inter', sans-serif;
    font-size: 0.88rem;
    font-weight: 500;
    color: #2A3344;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    user-select: none;
  }

  .suggestion-question::-webkit-details-marker { display: none; }

  .suggestion-question::after {
    content: '+';
    color: #9A7A35;
    font-size: 1.05rem;
    flex-shrink: 0;
  }

  details[open] .suggestion-question::after { content: '−'; }

  .suggestion-answer {
    padding: 0 14px 12px;
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    color: #2A3344;
    line-height: 1.65;
  }

  .suggestions-footer {
    margin: 10px 0 0;
    font-size: 0.8rem;
    color: #5C6573;
    font-style: italic;
    text-align: center;
  }

  /* Submit button */
  .submit-btn {
    width: 100%;
    background: #C8A96E;
    color: #0A1628;
    border: none;
    border-radius: 8px;
    padding: 15px 24px;
    font-family: 'Cinzel', serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 4px 16px rgba(200,169,110,0.35);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(200,169,110,0.45);
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
    border: 2px solid rgba(10,22,40,0.2);
    border-top-color: #0A1628;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .recaptcha-notice {
    text-align: center;
    font-size: 0.75rem;
    color: #5C6573;
    margin-top: 14px;
    margin-bottom: 0;
    line-height: 1.5;
  }

  .recaptcha-notice a {
    color: #9A7A35;
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
    background: #FFFDF8;
    border: 1.5px solid rgba(200,169,110,0.34);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(10,22,40,0.06);
    animation: fadeSlideIn 0.3s ease;
  }

  .faq-panel--highlight {
    border-color: rgba(200,169,110,0.65);
    box-shadow: 0 4px 20px rgba(200,169,110,0.20);
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
    background: linear-gradient(135deg, rgba(200,169,110,0.10), rgba(236,238,241,0.50));
    border-bottom: 1px solid rgba(200,169,110,0.18);
  }

  .faq-icon {
    font-size: 18px;
    color: #9A7A35;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .faq-panel-header h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #15223B;
    margin: 0 0 3px;
  }

  .faq-panel-header p {
    font-size: 0.8rem;
    color: #5C6573;
    margin: 0;
    font-style: italic;
  }

  .faq-dismiss {
    margin-left: auto;
    background: none;
    border: none;
    color: #5C6573;
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
    transition: color 0.15s;
  }

  .faq-dismiss:hover { color: #15223B; }

  .faq-searching {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 14px 18px;
    font-size: 0.85rem;
    color: #5C6573;
    font-style: italic;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #C8A96E;
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
    border-bottom: 1px solid rgba(200,169,110,0.12);
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
    font-family: 'Inter', sans-serif;
    font-size: 0.88rem;
    color: #2A3344;
    font-weight: 500;
    transition: background 0.15s;
  }

  .faq-match-q:hover { background: rgba(200,169,110,0.06); }

  .faq-confidence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .faq-match--high .faq-confidence-dot { background: #4caf79; }
  .faq-match--medium .faq-confidence-dot { background: #C8A96E; }
  .faq-match--low .faq-confidence-dot { background: #C9CFD6; }

  .faq-chevron {
    margin-left: auto;
    font-size: 10px;
    color: #9A7A35;
    flex-shrink: 0;
  }

  .faq-match-a {
    padding: 4px 18px 14px 36px;
    font-size: 0.85rem;
    color: #2A3344;
    line-height: 1.65;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Info cards — sit in a row beneath the form card */
  .info-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 20px;
  }

  @media (max-width: 600px) {
    .info-cards { grid-template-columns: 1fr; }
  }

  .info-card {
    display: flex;
    gap: 14px;
    background: #ECEEF1;
    border: 1px solid rgba(92,101,115,0.20);
    border-radius: 10px;
    padding: 16px 18px;
  }

  .info-card-icon {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .info-card h4 {
    font-family: 'Cinzel', serif;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #15223B;
    margin: 0 0 5px;
  }

  .info-card p {
    font-size: 0.82rem;
    color: #5C6573;
    line-height: 1.55;
    margin: 0;
  }

  /* Success */
  .success-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F6F1E4;
    padding: 40px 24px;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .success-inner {
    text-align: center;
    max-width: 520px;
    background: #FFFDF8;
    border: 1px solid rgba(200,169,110,0.34);
    border-radius: 16px;
    padding: 52px 48px;
    box-shadow: 0 4px 32px rgba(10,22,40,0.08);
  }

  .success-cross {
    font-size: 36px;
    color: #C8A96E;
    opacity: 0.7;
    margin-bottom: 20px;
    animation: gentleGlow 3s ease-in-out infinite;
  }

  @keyframes gentleGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }

  .success-inner h1 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #15223B;
    margin: 0 0 8px;
  }

  .success-name {
    font-size: 1.05rem;
    color: #9A7A35;
    font-style: italic;
    margin: 0 0 20px;
  }

  .success-body {
    font-size: 0.95rem;
    color: #2A3344;
    line-height: 1.7;
    margin: 0 0 28px;
  }

  .success-divider {
    color: #C8A96E;
    opacity: 0.55;
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
    font-family: 'Cinzel', serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }

  .success-btn--primary {
    background: #C8A96E;
    color: #0A1628;
    box-shadow: 0 3px 12px rgba(200,169,110,0.35);
  }

  .success-btn--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 16px rgba(200,169,110,0.45);
  }

  .success-btn--ghost {
    background: transparent;
    color: #9A7A35;
    border: 1.5px solid rgba(200,169,110,0.45);
  }

  .success-btn--ghost:hover {
    background: rgba(200,169,110,0.08);
  }

  /* ── FAQ section ── */
  .faq-section {
    margin-top: 64px;
  }

  .faq-section-head {
    text-align: center;
    margin-bottom: 32px;
  }

  .faq-section-head h2 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
    font-weight: 700;
    color: #15223B;
    margin: 6px 0 10px;
  }

  .faq-section-head p {
    font-size: 0.95rem;
    color: #5C6573;
    font-style: italic;
    max-width: 460px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .faq-list {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .faq-item {
    background: #FFFDF8;
    border: 1px solid rgba(200,169,110,0.28);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .faq-item--open {
    border-color: rgba(200,169,110,0.60);
    box-shadow: 0 4px 18px rgba(200,169,110,0.12);
  }

  .faq-q {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 18px 22px;
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.05rem;
    font-weight: 600;
    color: #15223B;
    transition: color 0.15s;
  }

  .faq-q:hover { color: #9A7A35; }

  .faq-toggle {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(200,169,110,0.12);
    color: #C8A96E;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
    font-weight: 400;
  }

  .faq-a-wrap {
    overflow: hidden;
    transition: max-height 0.3s ease;
  }

  .faq-a {
    padding: 0 22px 20px;
    margin: 0;
    font-size: 0.92rem;
    color: #2A3344;
    line-height: 1.7;
  }

  /* Hide reCAPTCHA badge (we show custom notice) */
  .grecaptcha-badge { visibility: hidden !important; }
`;
