// components/LivingPrayerList.jsx
// Drop this into your dashboard page
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrayerCard({ request, currentUserId, onPrayed, onMarkAnswered, isOwner }) {
  const [prayedToday, setPrayedToday] = useState(false);
  const [prayingNow, setPrayingNow] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [testimony, setTestimony] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [localCount, setLocalCount] = useState(request.total_intercessions || 0);
  const [weekCount] = useState(request.intercessions_this_week || 0);

  // Check if current user prayed today
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('prayer_intercessions')
      .select('id', { count: 'exact' })
      .eq('request_id', request.id)
      .eq('intercessor_id', currentUserId)
      .gte('prayed_at', new Date().toISOString().split('T')[0])
      .then(({ count }) => setPrayedToday((count || 0) > 0));
  }, [request.id, currentUserId]);

  const handlePray = async () => {
    if (prayingNow) return;
    setPrayingNow(true);
    try {
      const res = await fetch('/api/prayer-requests/intercede', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, intercessorId: currentUserId }),
      });
      if (res.ok) {
        setPrayedToday(true);
        setLocalCount(c => c + 1);
        onPrayed?.(request.id);
      }
    } finally {
      setPrayingNow(false);
    }
  };

  const handleMarkAnswered = async () => {
    setSubmittingAnswer(true);
    try {
      const res = await fetch('/api/prayer-requests/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, userId: currentUserId, testimony }),
      });
      if (res.ok) {
        setShowAnswerModal(false);
        onMarkAnswered?.(request.id);
      }
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const isAnswered = request.status === 'answered';

  return (
    <>
      <div style={{
        background: isAnswered ? 'linear-gradient(135deg, #f0f7f0, #e8f4e8)' : 'linear-gradient(135deg, #fffdf8, #fdf6ec)',
        border: `1px solid ${isAnswered ? '#a8d5a8' : '#e8d5b0'}`,
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '12px',
        position: 'relative',
        transition: 'box-shadow 0.2s',
        boxShadow: '0 1px 4px rgba(74,55,40,0.06)',
      }}>
        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isAnswered ? '#4a8a4a' : '#c8a96e',
            background: isAnswered ? '#d4edd4' : '#fdf0d8',
            padding: '3px 10px',
            borderRadius: '20px',
          }}>
            {isAnswered ? '✨ Answered' : '🙏 Active'}
          </span>
          <span style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>
            {timeAgo(request.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '17px',
          color: '#3a2a1a',
          margin: '0 0 8px 0',
          lineHeight: 1.4,
        }}>
          {request.title}
        </h3>

        {/* Body snippet */}
        {request.body && (
          <p style={{
            fontSize: '14px',
            color: '#7a6a5a',
            margin: '0 0 14px 0',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            {request.body.length > 120 ? request.body.slice(0, 120) + '…' : request.body}
          </p>
        )}

        {/* Answered testimony */}
        {isAnswered && request.answered_testimony && (
          <div style={{
            background: '#e8f4e8',
            border: '1px solid #a8d5a8',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '14px',
          }}>
            <p style={{ fontSize: '13px', color: '#3a6a3a', margin: 0, fontStyle: 'italic' }}>
              "{request.answered_testimony}"
            </p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: isOwner || !isAnswered ? '16px' : '0' }}>
          <span style={{ fontSize: '13px', color: '#9a8a7a' }}>
            🙏 Lifted up <strong style={{ color: '#4a3728' }}>{localCount}</strong> time{localCount !== 1 ? 's' : ''}
          </span>
          {weekCount > 0 && (
            <span style={{ fontSize: '13px', color: '#9a8a7a' }}>
              · <strong style={{ color: '#4a3728' }}>{weekCount}</strong> this week
            </span>
          )}
        </div>

        {/* Action buttons */}
        {!isAnswered && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* I Prayed button — shown to non-owners */}
            {!isOwner && (
              <button
                onClick={handlePray}
                disabled={prayingNow}
                style={{
                  background: prayedToday
                    ? 'linear-gradient(135deg, #6a8a6a, #4a7a4a)'
                    : 'linear-gradient(135deg, #c8a96e, #b8914e)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  cursor: prayingNow ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  transition: 'opacity 0.2s',
                  opacity: prayingNow ? 0.7 : 1,
                }}
              >
                {prayingNow ? '…' : prayedToday ? '✓ Prayed Today' : '🙏 I Prayed'}
              </button>
            )}

            {/* Mark Answered — only for owner */}
            {isOwner && (
              <button
                onClick={() => setShowAnswerModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #6a8a6a, #4a7a4a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✨ Mark as Answered
              </button>
            )}
          </div>
        )}
      </div>

      {/* Answer Modal */}
      {showAnswerModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: '#fffdf8', borderRadius: '16px', padding: '32px',
            maxWidth: '480px', width: '100%', border: '1px solid #e8d5b0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>✨</div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#3a2a1a', margin: 0 }}>
                God answered your prayer!
              </h2>
              <p style={{ color: '#7a6a5a', fontSize: '14px', marginTop: '8px' }}>
                Everyone who prayed for you will be notified.
              </p>
            </div>

            <p style={{ fontSize: '13px', color: '#9a8a7a', marginBottom: '8px', fontWeight: 600 }}>
              SHARE YOUR TESTIMONY <span style={{ fontWeight: 400 }}>(optional)</span>
            </p>
            <textarea
              value={testimony}
              onChange={e => setTestimony(e.target.value)}
              placeholder="How did God move? Share what happened…"
              rows={4}
              style={{
                width: '100%', borderRadius: '8px', border: '1px solid #e8d5b0',
                padding: '12px', fontSize: '14px', fontFamily: 'Georgia, serif',
                background: '#fdf6ec', color: '#4a3728', resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => setShowAnswerModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid #e8d5b0', background: 'white',
                  color: '#7a6a5a', cursor: 'pointer', fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAnswered}
                disabled={submittingAnswer}
                style={{
                  flex: 2, padding: '12px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #c8a96e, #b8914e)',
                  border: 'none', color: 'white', cursor: submittingAnswer ? 'wait' : 'pointer',
                  fontSize: '14px', fontWeight: 600,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                {submittingAnswer ? 'Notifying…' : '✨ Mark Answered & Notify All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── New Request Form ─────────────────────────────────────────────────────────

function NewRequestForm({ userId, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('network');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/prayer-requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), visibility, userId }),
      });
      if (res.ok) {
        const { request } = await res.json();
        onCreated?.(request);
        setTitle(''); setBody('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fffdf8, #fdf6ec)',
      border: '1px solid #e8d5b0',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: '#4a3728', margin: '0 0 16px 0', fontSize: '18px',
      }}>
        Share a Prayer Request
      </h3>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What do you need prayer for?"
        maxLength={140}
        style={{
          width: '100%', borderRadius: '8px', border: '1px solid #e8d5b0',
          padding: '12px', fontSize: '15px', fontFamily: 'Georgia, serif',
          background: 'white', color: '#4a3728', marginBottom: '10px',
          boxSizing: 'border-box',
        }}
      />

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Share more details (optional)…"
        rows={3}
        style={{
          width: '100%', borderRadius: '8px', border: '1px solid #e8d5b0',
          padding: '12px', fontSize: '14px', fontFamily: 'Georgia, serif',
          background: 'white', color: '#4a3728', resize: 'vertical',
          marginBottom: '10px', boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
          style={{
            borderRadius: '8px', border: '1px solid #e8d5b0',
            padding: '10px 14px', fontSize: '13px', background: 'white', color: '#4a3728',
          }}
        >
          <option value="network">My Band Network</option>
          <option value="public">Public Prayer Wall</option>
          <option value="private">Private (just me)</option>
        </select>

        <button
          onClick={onCancel}
          style={{
            padding: '10px 16px', borderRadius: '8px',
            border: '1px solid #e8d5b0', background: 'white',
            color: '#7a6a5a', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          style={{
            padding: '10px 24px', borderRadius: '8px',
            background: title.trim() ? 'linear-gradient(135deg, #c8a96e, #b8914e)' : '#ddd',
            border: 'none', color: 'white',
            cursor: title.trim() && !submitting ? 'pointer' : 'not-allowed',
            fontSize: '14px', fontWeight: 600,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          {submitting ? 'Submitting…' : '🙏 Submit Request'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LivingPrayerList({ currentUserId }) {
  const [tab, setTab] = useState('pray'); // 'pray' | 'mine'
  const [myRequests, setMyRequests] = useState([]);
  const [networkRequests, setNetworkRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    // My requests
    const { data: mine } = await supabase
      .from('prayer_requests_with_counts')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    // Network requests (not mine, active only)
    const { data: network } = await supabase
      .from('prayer_requests_with_counts')
      .select('*')
      .neq('user_id', currentUserId)
      .eq('status', 'active')
      .in('visibility', ['network', 'public'])
      .order('created_at', { ascending: false })
      .limit(20);

    setMyRequests(mine || []);
    setNetworkRequests(network || []);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreated = (newRequest) => {
    setMyRequests(prev => [{ ...newRequest, total_intercessions: 0, intercessions_this_week: 0 }, ...prev]);
    setShowNewForm(false);
    setTab('mine');
  };

  const handleAnswered = (requestId) => {
    setMyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'answered' } : r));
    setNetworkRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const activeCount = networkRequests.length;
  const myActiveCount = myRequests.filter(r => r.status === 'active').length;

  return (
    <div style={{ fontFamily: 'Georgia, serif', maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#3a2a1a', margin: '0 0 4px 0', fontSize: '24px',
          }}>
            Living Prayer List
          </h2>
          <p style={{ color: '#9a8a7a', fontSize: '13px', margin: 0 }}>
            {activeCount} active request{activeCount !== 1 ? 's' : ''} need{activeCount === 1 ? 's' : ''} prayer today
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => { setShowNewForm(true); setTab('mine'); }}
            style={{
              background: 'linear-gradient(135deg, #c8a96e, #b8914e)',
              color: 'white', border: 'none', borderRadius: '8px',
              padding: '10px 18px', cursor: 'pointer', fontSize: '14px',
              fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600,
            }}
          >
            + Request Prayer
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f5ede0', borderRadius: '10px', padding: '4px' }}>
        {[
          { key: 'pray', label: `Pray for Others${activeCount > 0 ? ` (${activeCount})` : ''}` },
          { key: 'mine', label: `My Requests${myActiveCount > 0 ? ` (${myActiveCount})` : ''}` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '10px', borderRadius: '7px', border: 'none',
              background: tab === key ? 'white' : 'transparent',
              color: tab === key ? '#4a3728' : '#9a8a7a',
              cursor: 'pointer', fontSize: '14px', fontWeight: tab === key ? 600 : 400,
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* New Request Form */}
      {showNewForm && tab === 'mine' && (
        <NewRequestForm
          userId={currentUserId}
          onCreated={handleCreated}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9a8a7a' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🙏</div>
          <p>Loading prayers…</p>
        </div>
      ) : tab === 'pray' ? (
        networkRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9a8a7a', background: '#fdf8f0', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px' }}>
              All caught up — no active requests right now.
            </p>
          </div>
        ) : (
          networkRequests.map(request => (
            <PrayerCard
              key={request.id}
              request={request}
              currentUserId={currentUserId}
              isOwner={false}
              onPrayed={() => {}}
              onMarkAnswered={handleAnswered}
            />
          ))
        )
      ) : (
        myRequests.length === 0 && !showNewForm ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9a8a7a', background: '#fdf8f0', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🙏</div>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px' }}>
              You haven't submitted any prayer requests yet.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                marginTop: '12px', background: 'linear-gradient(135deg, #c8a96e, #b8914e)',
                color: 'white', border: 'none', borderRadius: '8px',
                padding: '10px 24px', cursor: 'pointer', fontSize: '14px',
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600,
              }}
            >
              Share a Request
            </button>
          </div>
        ) : (
          myRequests.map(request => (
            <PrayerCard
              key={request.id}
              request={request}
              currentUserId={currentUserId}
              isOwner={true}
              onMarkAnswered={handleAnswered}
            />
          ))
        )
      )}
    </div>
  );
}