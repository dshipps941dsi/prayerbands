"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import PrayerBandsLogo from "@/components/PrayerBandsLogo";

// Use service role only on server; this page should be protected by admin auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Admin route should be behind middleware/auth check
);

const CATEGORIES = {
  order: "Order & Shipping",
  ministry: "Ministry",
  technical: "Technical",
  partnership: "Partnership",
  subscription: "Subscription",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#4caf79",
  in_progress: "#b8964a",
  resolved: "#a0aabb",
  spam: "#cc4444",
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
  const [selected, setSelected] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState("new");

  // FAQ editor state
  const [editingFaq, setEditingFaq] = useState<FaqEntry | null>(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "general" });
  const [showNewFaq, setShowNewFaq] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    const [subRes, faqRes] = await Promise.all([
      supabase
        .from("contact_submissions")
        .select("*")
        .eq("status", statusFilter)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("faq_entries")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (subRes.data) setSubmissions(subRes.data);
    if (faqRes.data) setFaqEntries(faqRes.data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function toggleFaqCandidate(id: string, current: boolean) {
    await supabase.from("contact_submissions").update({ faq_candidate: !current }).eq("id", id);
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, faq_candidate: !current } : s));
    if (selected?.id === id) setSelected((s) => s ? { ...s, faq_candidate: !current } : null);
  }

  async function promoteToFaq(submission: Submission) {
    const { data } = await supabase.from("faq_entries").insert({
      question: submission.subject || submission.message.slice(0, 100),
      answer: "",
      category: submission.category,
      published: false,
      source_submission_id: submission.id,
    }).select().single();

    if (data) {
      setFaqEntries((prev) => [...prev, data]);
      setEditingFaq(data);
      setTab("faq");
    }
  }

  async function saveFaqEntry(entry: FaqEntry) {
    await supabase.from("faq_entries").update({
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      published: entry.published,
      sort_order: entry.sort_order,
    }).eq("id", entry.id);
    setFaqEntries((prev) => prev.map((f) => f.id === entry.id ? entry : f));
    setEditingFaq(null);
  }

  async function createFaqEntry() {
    const { data } = await supabase.from("faq_entries").insert({
      ...newFaq,
      published: false,
      sort_order: 100,
    }).select().single();
    if (data) {
      setFaqEntries((prev) => [...prev, data]);
      setNewFaq({ question: "", answer: "", category: "general" });
      setShowNewFaq(false);
      setEditingFaq(data);
    }
  }

  async function togglePublished(entry: FaqEntry) {
    const updated = { ...entry, published: !entry.published };
    await supabase.from("faq_entries").update({ published: updated.published }).eq("id", entry.id);
    setFaqEntries((prev) => prev.map((f) => f.id === entry.id ? updated : f));
  }

  const faqCandidates = submissions.filter((s) => s.faq_candidate);

  return (
    <div className="admin-contacts">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <PrayerBandsLogo size={30} color="#b8964a" />
        <a href="/admin" style={{ color: "#b8964a", fontSize: 14, textDecoration: "none", fontFamily: "inherit" }}>← Admin</a>
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
  .admin-contacts {
    font-family: 'Lora', Georgia, serif;
    color: #2a1f0e;
    min-height: 100vh;
    background: #faf7f2;
    padding: 24px;
  }
  .admin-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid rgba(184,150,74,0.2); padding-bottom: 0; }
  .admin-tab { padding: 10px 20px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-family: inherit; font-size: 0.95rem; color: #7a6a52; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: color 0.15s; }
  .admin-tab.active { color: #b8964a; border-bottom-color: #b8964a; font-weight: 600; }
  .badge { background: #4caf79; color: white; border-radius: 10px; padding: 2px 7px; font-size: 0.75rem; font-family: system-ui; }
  .badge--amber { background: #b8964a; }

  /* Submissions */
  .submissions-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; height: calc(100vh - 140px); }
  .submissions-list { background: #fffdf7; border: 1px solid rgba(184,150,74,0.2); border-radius: 10px; overflow-y: auto; }
  .list-filters { display: flex; gap: 4px; padding: 10px; border-bottom: 1px solid rgba(184,150,74,0.15); flex-wrap: wrap; }
  .filter-btn { padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(184,150,74,0.3); background: none; font-family: inherit; font-size: 0.8rem; color: #7a6a52; cursor: pointer; text-transform: capitalize; transition: all 0.15s; }
  .filter-btn.active { background: #b8964a; color: #fffdf7; border-color: #b8964a; }
  .submission-item { padding: 14px 16px; border-bottom: 1px solid rgba(184,150,74,0.1); cursor: pointer; transition: background 0.15s; }
  .submission-item:hover, .submission-item.selected { background: rgba(184,150,74,0.07); }
  .sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .sub-name { font-weight: 600; font-size: 0.9rem; }
  .sub-cat { font-size: 0.75rem; color: #b8964a; background: rgba(184,150,74,0.1); padding: 2px 8px; border-radius: 10px; }
  .sub-preview { font-size: 0.82rem; color: #7a6a52; margin-bottom: 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sub-meta { font-size: 0.75rem; color: #a09070; display: flex; gap: 8px; align-items: center; }
  .faq-badge { background: rgba(76,175,121,0.15); color: #4caf79; padding: 1px 7px; border-radius: 10px; font-size: 0.72rem; }
  .loading-msg, .empty-msg { padding: 24px; text-align: center; color: #a09070; font-style: italic; }

  /* Detail pane */
  .submission-detail { background: #fffdf7; border: 1px solid rgba(184,150,74,0.2); border-radius: 10px; padding: 28px; overflow-y: auto; }
  .empty-detail { display: flex; align-items: center; justify-content: center; height: 200px; color: #a09070; font-style: italic; }
  .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .detail-header h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; margin: 0 0 4px; }
  .detail-email { color: #b8964a; font-size: 0.9rem; text-decoration: none; }
  .status-badge { padding: 4px 12px; border-radius: 20px; color: white; font-size: 0.8rem; font-family: system-ui; }
  .detail-meta-row { font-size: 0.82rem; color: #7a6a52; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 6px; }
  .detail-message { background: #faf8f3; border: 1px solid rgba(184,150,74,0.2); border-radius: 8px; padding: 16px; font-size: 0.92rem; line-height: 1.65; white-space: pre-wrap; margin-bottom: 20px; }
  .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .action-btn { padding: 8px 14px; border-radius: 7px; border: 1px solid transparent; font-family: inherit; font-size: 0.83rem; cursor: pointer; transition: all 0.15s; }
  .action-btn--resolve { background: rgba(76,175,121,0.1); color: #4caf79; border-color: rgba(76,175,121,0.3); }
  .action-btn--progress { background: rgba(184,150,74,0.1); color: #b8964a; border-color: rgba(184,150,74,0.3); }
  .action-btn--spam { background: rgba(204,68,68,0.1); color: #cc4444; border-color: rgba(204,68,68,0.3); }
  .action-btn--faq { background: rgba(100,130,180,0.1); color: #5a7ab8; border-color: rgba(100,130,180,0.3); }
  .action-btn--faq-active { background: rgba(100,130,180,0.2); color: #3a5a98; border-color: rgba(100,130,180,0.5); font-weight: 600; }
  .action-btn--promote { background: #b8964a; color: #fffdf7; border-color: #b8964a; }

  /* FAQ manager */
  .faq-manager { background: #fffdf7; border: 1px solid rgba(184,150,74,0.2); border-radius: 10px; padding: 28px; }
  .faq-manager-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .faq-manager-header h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; margin: 0 0 4px; }
  .faq-manager-header p { font-size: 0.85rem; color: #7a6a52; margin: 0; }
  .new-faq-btn { background: #b8964a; color: #fffdf7; border: none; border-radius: 7px; padding: 10px 18px; font-family: inherit; font-size: 0.9rem; cursor: pointer; }
  .faq-list { display: flex; flex-direction: column; gap: 8px; }
  .faq-entry-row { background: #faf8f3; border: 1px solid rgba(184,150,74,0.2); border-radius: 8px; padding: 16px 18px; display: flex; align-items: flex-start; gap: 16px; }
  .faq-entry--draft { opacity: 0.7; border-style: dashed; }
  .faq-entry-main { flex: 1; }
  .faq-entry-q { font-weight: 600; font-size: 0.92rem; margin-bottom: 5px; }
  .faq-entry-a { font-size: 0.83rem; color: #7a6a52; margin-bottom: 8px; line-height: 1.5; }
  .faq-entry-stats { display: flex; gap: 10px; font-size: 0.75rem; color: #a09070; align-items: center; }
  .faq-cat-badge { background: rgba(184,150,74,0.12); color: #b8964a; padding: 1px 8px; border-radius: 10px; }
  .faq-entry-controls { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
  .publish-toggle { padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(184,150,74,0.4); background: none; font-family: inherit; font-size: 0.8rem; color: #b8964a; cursor: pointer; white-space: nowrap; }
  .publish-toggle.published { background: rgba(76,175,121,0.15); color: #4caf79; border-color: rgba(76,175,121,0.4); }
  .edit-faq-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(184,150,74,0.3); background: none; font-family: inherit; font-size: 0.8rem; color: #7a6a52; cursor: pointer; }

  /* FAQ editor card */
  .faq-edit-card { background: #fffdf7; border: 1.5px solid rgba(184,150,74,0.4); border-radius: 10px; padding: 20px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; width: 100%; }
  .faq-edit-card h3 { font-family: 'Playfair Display', serif; margin: 0 0 8px; font-size: 1rem; }
  .faq-edit-card label { font-size: 0.78rem; font-weight: 600; color: #5a4a30; text-transform: uppercase; letter-spacing: 0.5px; }
  .faq-edit-card input, .faq-edit-card textarea, .faq-edit-card select { border: 1.5px solid rgba(184,150,74,0.3); border-radius: 7px; padding: 9px 12px; font-family: inherit; font-size: 0.9rem; color: #2a1f0e; background: #faf8f3; outline: none; }
  .faq-edit-card input:focus, .faq-edit-card textarea:focus { border-color: #b8964a; }
  .faq-edit-card textarea { resize: vertical; }
  .edit-row { display: flex; gap: 16px; }
  .edit-actions { display: flex; gap: 8px; margin-top: 4px; }
  .save-btn { background: #b8964a; color: #fffdf7; border: none; border-radius: 7px; padding: 9px 20px; font-family: inherit; font-size: 0.9rem; cursor: pointer; }
  .cancel-btn { background: none; border: 1px solid rgba(184,150,74,0.3); border-radius: 7px; padding: 9px 16px; font-family: inherit; font-size: 0.9rem; color: #7a6a52; cursor: pointer; }
`;