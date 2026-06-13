"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PrayerBandsLogo from "@/components/PrayerBandsLogo";

const ADMIN_EMAIL = "dshipps941@gmail.com";

// All reads/writes go through /api/admin/contacts (service role) because RLS
// blocks the anon client from contact_submissions and faq_entries.

const CATEGORIES = {
  order: "Order & Shipping",
  ministry: "Ministry",
  technical: "Technical",
  partnership: "Partnership",
  subscription: "Subscription",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#4A8A6A",
  in_progress: "#9A7A35",
  resolved: "#5C6573",
  spam: "#c0392b",
};

interface Submission {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string | null;
  message: string;
  status: string;
  faq_candidate: boolean;
  recaptcha_score: number | null;
  created_at: string;
}

interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  view_count: number;
  deflection_count: number;
  sort_order: number;
}

type Tab = "submissions" | "faq";

export default function AdminContactsPage() {
  const [tab, setTab] = useState<Tab>("submissions");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState("new");

  // FAQ editor state
  const [editingFaq, setEditingFaq] = useState<FaqEntry | null>(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "general" });
  const [showNewFaq, setShowNewFaq] = useState(false);

  // Gate the page to the admin account, mirroring the other /admin pages.
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setAuthorized(true);
      else { window.location.href = "/signin"; }
    });
  }, []);

  useEffect(() => {
    if (authorized) loadData();
  }, [statusFilter, authorized]);

  async function loadData() {
    setLoading(true);
    const res = await fetch(`/api/admin/contacts?status=${encodeURIComponent(statusFilter)}`);
    if (res.ok) {
      const { submissions, faqEntries } = await res.json();
      setSubmissions(submissions || []);
      setFaqEntries(faqEntries || []);
    }
    setLoading(false);
  }

  async function api(body: any) {
    return fetch("/api/admin/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function updateStatus(id: string, status: string) {
    await api({ action: "submission_status", id, status });
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function toggleFaqCandidate(id: string, current: boolean) {
    await api({ action: "faq_candidate", id, value: !current });
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, faq_candidate: !current } : s));
    if (selected?.id === id) setSelected((s) => s ? { ...s, faq_candidate: !current } : null);
  }

  async function promoteToFaq(submission: Submission) {
    const res = await api({ action: "promote", submission });
    if (res.ok) {
      const { entry } = await res.json();
      if (entry) {
        setFaqEntries((prev) => [...prev, entry]);
        setEditingFaq(entry);
        setTab("faq");
      }
    }
  }

  async function saveFaqEntry(entry: FaqEntry) {
    await api({ action: "faq_update", entry });
    setFaqEntries((prev) => prev.map((f) => f.id === entry.id ? entry : f));
    setEditingFaq(null);
  }

  async function createFaqEntry() {
    const res = await api({ action: "faq_create", ...newFaq });
    if (res.ok) {
      const { entry } = await res.json();
      if (entry) {
        setFaqEntries((prev) => [...prev, entry]);
        setNewFaq({ question: "", answer: "", category: "general" });
        setShowNewFaq(false);
        setEditingFaq(entry);
      }
    }
  }

  async function togglePublished(entry: FaqEntry) {
    const updated = { ...entry, published: !entry.published };
    await api({ action: "faq_publish", id: entry.id, published: updated.published });
    setFaqEntries((prev) => prev.map((f) => f.id === entry.id ? updated : f));
  }

  const faqCandidates = submissions.filter((s) => s.faq_candidate);

  if (!authorized) return (
    <div style={{ minHeight: "100vh", background: "#F6F1E4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "#9A7A35" }}>
      Checking access…
    </div>
  );

  return (
    <div className="admin-contacts">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <PrayerBandsLogo size={30} color="#C8A96E" />
        <a href="/admin" style={{ color: "#9A7A35", fontSize: 13, textDecoration: "none", fontFamily: "Cinzel, serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>← Admin</a>
      </div>
      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === "submissions" ? "active" : ""}`} onClick={() => setTab("submissions")}>
          Submissions
          {submissions.filter((s) => s.status === "new").length > 0 && (
            <span className="badge">{submissions.filter((s) => s.status === "new").length}</span>
          )}
        </button>
        <button className={`admin-tab ${tab === "faq" ? "active" : ""}`} onClick={() => setTab("faq")}>
          FAQ Manager
          {faqCandidates.length > 0 && <span className="badge badge--amber">{faqCandidates.length} candidates</span>}
        </button>
      </div>

      {/* SUBMISSIONS TAB */}
      {tab === "submissions" && (
        <div className="submissions-layout">
          {/* Sidebar list */}
          <div className="submissions-list">
            <div className="list-filters">
              {["new", "in_progress", "resolved", "spam"].map((s) => (
                <button
                  key={s}
                  className={`filter-btn ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="loading-msg">Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="empty-msg">No {statusFilter} submissions.</div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.id}
                  className={`submission-item ${selected?.id === sub.id ? "selected" : ""}`}
                  onClick={() => setSelected(sub)}
                >
                  <div className="sub-header">
                    <span className="sub-name">{sub.name}</span>
                    <span className="sub-cat">{CATEGORIES[sub.category as keyof typeof CATEGORIES] || sub.category}</span>
                  </div>
                  <div className="sub-preview">{sub.subject || sub.message.slice(0, 60)}…</div>
                  <div className="sub-meta">
                    <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                    {sub.faq_candidate && <span className="faq-badge">FAQ Candidate</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail pane */}
          <div className="submission-detail">
            {!selected ? (
              <div className="empty-detail">Select a submission to view details</div>
            ) : (
              <>
                <div className="detail-header">
                  <div>
                    <h2>{selected.name}</h2>
                    <a href={`mailto:${selected.email}`} className="detail-email">{selected.email}</a>
                  </div>
                  <span className="status-badge" style={{ background: STATUS_COLORS[selected.status] }}>
                    {selected.status}
                  </span>
                </div>

                <div className="detail-meta-row">
                  <span>{CATEGORIES[selected.category as keyof typeof CATEGORIES]}</span>
                  {selected.subject && <span>· {selected.subject}</span>}
                  <span>· {new Date(selected.created_at).toLocaleString()}</span>
                  {selected.recaptcha_score && (
                    <span>· reCAPTCHA: {selected.recaptcha_score.toFixed(2)}</span>
                  )}
                </div>

                <div className="detail-message">{selected.message}</div>

                <div className="detail-actions">
                  <button className="action-btn action-btn--resolve" onClick={() => updateStatus(selected.id, "resolved")}>
                    ✓ Mark Resolved
                  </button>
                  <button className="action-btn action-btn--progress" onClick={() => updateStatus(selected.id, "in_progress")}>
                    In Progress
                  </button>
                  <button className="action-btn action-btn--spam" onClick={() => updateStatus(selected.id, "spam")}>
                    Spam
                  </button>
                  <button
                    className={`action-btn ${selected.faq_candidate ? "action-btn--faq-active" : "action-btn--faq"}`}
                    onClick={() => toggleFaqCandidate(selected.id, selected.faq_candidate)}
                  >
                    {selected.faq_candidate ? "★ FAQ Candidate" : "☆ Mark FAQ Candidate"}
                  </button>
                  <button className="action-btn action-btn--promote" onClick={() => promoteToFaq(selected)}>
                    + Add to FAQ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FAQ TAB */}
      {tab === "faq" && (
        <div className="faq-manager">
          <div className="faq-manager-header">
            <div>
              <h2>FAQ Entries</h2>
              <p>{faqEntries.filter((f) => f.published).length} published · {faqEntries.filter((f) => !f.published).length} drafts</p>
            </div>
            <button className="new-faq-btn" onClick={() => setShowNewFaq(true)}>+ New Entry</button>
          </div>

          {showNewFaq && (
            <div className="faq-edit-card">
              <h3>New FAQ Entry</h3>
              <label>Question</label>
              <input value={newFaq.question} onChange={(e) => setNewFaq((n) => ({ ...n, question: e.target.value }))} placeholder="What question does this answer?" />
              <label>Answer</label>
              <textarea value={newFaq.answer} onChange={(e) => setNewFaq((n) => ({ ...n, answer: e.target.value }))} rows={4} placeholder="Write a clear, helpful answer…" />
              <label>Category</label>
              <select value={newFaq.category} onChange={(e) => setNewFaq((n) => ({ ...n, category: e.target.value }))}>
                {["general","order","ministry","technical","partnership","subscription"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="edit-actions">
                <button className="save-btn" onClick={createFaqEntry}>Create</button>
                <button className="cancel-btn" onClick={() => setShowNewFaq(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="faq-list">
            {faqEntries.map((entry) => (
              <div key={entry.id} className={`faq-entry-row ${!entry.published ? "faq-entry--draft" : ""}`}>
                {editingFaq?.id === entry.id ? (
                  <div className="faq-edit-card">
                    <label>Question</label>
                    <input
                      value={editingFaq.question}
                      onChange={(e) => setEditingFaq((f) => f ? { ...f, question: e.target.value } : f)}
                    />
                    <label>Answer</label>
                    <textarea
                      value={editingFaq.answer}
                      onChange={(e) => setEditingFaq((f) => f ? { ...f, answer: e.target.value } : f)}
                      rows={5}
                    />
                    <div className="edit-row">
                      <div>
                        <label>Category</label>
                        <select
                          value={editingFaq.category}
                          onChange={(e) => setEditingFaq((f) => f ? { ...f, category: e.target.value } : f)}
                        >
                          {["general","order","ministry","technical","partnership","subscription"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Sort Order</label>
                        <input
                          type="number"
                          value={editingFaq.sort_order}
                          onChange={(e) => setEditingFaq((f) => f ? { ...f, sort_order: parseInt(e.target.value) || 100 } : f)}
                          style={{ width: "80px" }}
                        />
                      </div>
                    </div>
                    <div className="edit-actions">
                      <button className="save-btn" onClick={() => saveFaqEntry(editingFaq!)}>Save</button>
                      <button className="cancel-btn" onClick={() => setEditingFaq(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="faq-entry-main">
                      <div className="faq-entry-q">{entry.question}</div>
                      <div className="faq-entry-a">{entry.answer.slice(0, 120)}{entry.answer.length > 120 ? "…" : ""}</div>
                      <div className="faq-entry-stats">
                        <span className="faq-cat-badge">{entry.category}</span>
                        <span>Surfaced {entry.view_count}×</span>
                        <span>{entry.deflection_count} deflections</span>
                      </div>
                    </div>
                    <div className="faq-entry-controls">
                      <button
                        className={`publish-toggle ${entry.published ? "published" : ""}`}
                        onClick={() => togglePublished(entry)}
                      >
                        {entry.published ? "✓ Published" : "Draft"}
                      </button>
                      <button className="edit-faq-btn" onClick={() => setEditingFaq(entry)}>Edit</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{adminStyles}</style>
    </div>
  );
}

const adminStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

  .admin-contacts {
    font-family: 'Inter', sans-serif;
    color: #2A3344;
    min-height: 100vh;
    background: #F6F1E4;
    padding: 24px;
  }
  .admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid rgba(200,169,110,0.34); padding-bottom: 0; }
  .admin-tab { padding: 10px 20px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 0.07em; text-transform: uppercase; color: #5C6573; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: color 0.15s; }
  .admin-tab.active { color: #9A7A35; border-bottom-color: #C8A96E; font-weight: 600; }
  .badge { background: #4A8A6A; color: white; border-radius: 10px; padding: 2px 7px; font-size: 0.72rem; font-family: 'Inter', sans-serif; }
  .badge--amber { background: #C8A96E; color: #0A1628; }

  /* Submissions */
  .submissions-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; height: calc(100vh - 140px); }
  .submissions-list { background: #FFFDF8; border: 1px solid rgba(10,22,40,0.12); border-radius: 10px; overflow-y: auto; box-shadow: 0 2px 10px rgba(10,22,40,0.06); }
  .list-filters { display: flex; gap: 4px; padding: 10px; border-bottom: 1px solid rgba(92,101,115,0.20); flex-wrap: wrap; }
  .filter-btn { padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(10,22,40,0.12); background: none; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; color: #5C6573; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: #C8A96E; color: #0A1628; border-color: #C8A96E; }
  .submission-item { padding: 14px 16px; border-bottom: 1px solid rgba(92,101,115,0.12); cursor: pointer; transition: background 0.15s; }
  .submission-item:hover, .submission-item.selected { background: rgba(200,169,110,0.08); }
  .sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .sub-name { font-weight: 600; font-size: 0.9rem; color: #15223B; }
  .sub-cat { font-size: 0.72rem; color: #9A7A35; background: rgba(200,169,110,0.12); padding: 2px 8px; border-radius: 10px; font-family: 'Cinzel', serif; text-transform: uppercase; letter-spacing: 0.04em; }
  .sub-preview { font-size: 0.82rem; color: #5C6573; margin-bottom: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sub-meta { font-size: 0.75rem; color: #5C6573; display: flex; gap: 8px; align-items: center; }
  .faq-badge { background: rgba(74,138,106,0.14); color: #4A8A6A; padding: 1px 7px; border-radius: 10px; font-size: 0.72rem; }
  .loading-msg, .empty-msg { padding: 24px; text-align: center; color: #5C6573; font-style: italic; }

  /* Detail pane */
  .submission-detail { background: #FFFDF8; border: 1px solid rgba(10,22,40,0.12); border-radius: 10px; padding: 28px; overflow-y: auto; box-shadow: 0 2px 10px rgba(10,22,40,0.06); }
  .empty-detail { display: flex; align-items: center; justify-content: center; height: 200px; color: #5C6573; font-style: italic; }
  .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .detail-header h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; font-weight: 600; margin: 0 0 4px; color: #15223B; }
  .detail-email { color: #9A7A35; font-size: 0.9rem; text-decoration: none; }
  .status-badge { padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.75rem; font-family: 'Cinzel', serif; text-transform: uppercase; letter-spacing: 0.05em; }
  .detail-meta-row { font-size: 0.82rem; color: #5C6573; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 6px; }
  .detail-message { background: #F6F1E4; border: 1px solid rgba(10,22,40,0.12); border-radius: 8px; padding: 16px; font-size: 0.92rem; line-height: 1.65; white-space: pre-wrap; margin-bottom: 20px; color: #2A3344; }
  .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .action-btn { padding: 8px 14px; border-radius: 7px; border: 1px solid transparent; font-family: 'Cinzel', serif; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: all 0.15s; }
  .action-btn--resolve { background: rgba(74,138,106,0.1); color: #4A8A6A; border-color: rgba(74,138,106,0.3); }
  .action-btn--progress { background: rgba(200,169,110,0.12); color: #9A7A35; border-color: rgba(200,169,110,0.34); }
  .action-btn--spam { background: rgba(192,57,43,0.08); color: #c0392b; border-color: rgba(192,57,43,0.28); }
  .action-btn--faq { background: rgba(92,101,115,0.08); color: #5C6573; border-color: rgba(92,101,115,0.28); }
  .action-btn--faq-active { background: rgba(200,169,110,0.16); color: #9A7A35; border-color: rgba(200,169,110,0.5); font-weight: 700; }
  .action-btn--promote { background: #C8A96E; color: #0A1628; border-color: #C8A96E; font-weight: 700; }

  /* FAQ manager */
  .faq-manager { background: #FFFDF8; border: 1px solid rgba(10,22,40,0.12); border-radius: 10px; padding: 28px; box-shadow: 0 2px 10px rgba(10,22,40,0.06); }
  .faq-manager-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .faq-manager-header h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; font-weight: 600; margin: 0 0 4px; color: #15223B; }
  .faq-manager-header p { font-size: 0.85rem; color: #5C6573; margin: 0; }
  .new-faq-btn { background: #C8A96E; color: #0A1628; border: none; border-radius: 7px; padding: 10px 18px; font-family: 'Cinzel', serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; cursor: pointer; }
  .faq-list { display: flex; flex-direction: column; gap: 8px; }
  .faq-entry-row { background: #F6F1E4; border: 1px solid rgba(10,22,40,0.12); border-radius: 8px; padding: 16px 18px; display: flex; align-items: flex-start; gap: 16px; }
  .faq-entry--draft { opacity: 0.7; border-style: dashed; }
  .faq-entry-main { flex: 1; }
  .faq-entry-q { font-weight: 600; font-size: 0.92rem; margin-bottom: 5px; color: #15223B; }
  .faq-entry-a { font-size: 0.83rem; color: #5C6573; margin-bottom: 8px; line-height: 1.5; }
  .faq-entry-stats { display: flex; gap: 10px; font-size: 0.75rem; color: #5C6573; align-items: center; }
  .faq-cat-badge { background: rgba(200,169,110,0.14); color: #9A7A35; padding: 1px 8px; border-radius: 10px; font-family: 'Cinzel', serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .faq-entry-controls { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
  .publish-toggle { padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(200,169,110,0.34); background: none; font-family: 'Cinzel', serif; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #9A7A35; cursor: pointer; white-space: nowrap; }
  .publish-toggle.published { background: rgba(74,138,106,0.14); color: #4A8A6A; border-color: rgba(74,138,106,0.35); }
  .edit-faq-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(10,22,40,0.12); background: none; font-family: 'Cinzel', serif; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #5C6573; cursor: pointer; }

  /* FAQ editor card */
  .faq-edit-card { background: #FFFDF8; border: 1.5px solid rgba(200,169,110,0.34); border-radius: 10px; padding: 20px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; width: 100%; box-shadow: 0 2px 10px rgba(10,22,40,0.06); }
  .faq-edit-card h3 { font-family: 'Cormorant Garamond', Georgia, serif; margin: 0 0 8px; font-size: 1.1rem; font-weight: 600; color: #15223B; }
  .faq-edit-card label { font-size: 0.72rem; font-weight: 600; color: #9A7A35; text-transform: uppercase; letter-spacing: 0.07em; font-family: 'Cinzel', serif; }
  .faq-edit-card input, .faq-edit-card textarea, .faq-edit-card select { border: 1px solid rgba(10,22,40,0.12); border-radius: 7px; padding: 9px 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #2A3344; background: #F6F1E4; outline: none; }
  .faq-edit-card input:focus, .faq-edit-card textarea:focus { border-color: #C8A96E; }
  .faq-edit-card textarea { resize: vertical; }
  .edit-row { display: flex; gap: 16px; }
  .edit-actions { display: flex; gap: 8px; margin-top: 4px; }
  .save-btn { background: #C8A96E; color: #0A1628; border: none; border-radius: 7px; padding: 9px 20px; font-family: 'Cinzel', serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; cursor: pointer; }
  .cancel-btn { background: none; border: 1px solid rgba(10,22,40,0.12); border-radius: 7px; padding: 9px 16px; font-family: 'Cinzel', serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #5C6573; cursor: pointer; }
`;