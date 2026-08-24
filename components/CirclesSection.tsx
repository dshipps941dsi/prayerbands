'use client'

import { useState, useEffect, useCallback } from 'react'

interface CircleSummary {
  id: string
  name: string
  join_code: string
  is_closed: boolean
  my_role: 'leader' | 'member'
  member_count: number
  open_request_count: number
}

interface CirclePreview {
  id: string
  name: string
  description: string | null
  join_code: string
  member_count: number
}

// Theme tokens (fall back to the brand palette) so the panels wear the band's
// theme like the rest of the tab.
const PRIMARY = 'var(--pb-primary, #B8860B)'
const TEXT = 'var(--pb-text, #2C1810)'
const MUTED = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #D4C5B0)'
const SURFACE = 'var(--pb-surface, #ffffff)'
const ON_PRIMARY = 'var(--pb-text-on-primary, #ffffff)'

type Mode = 'list' | 'join' | 'create'

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export default function CirclesSection({ userId }: { userId: string }) {
  const [circles, setCircles] = useState<CircleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isBandHolder, setIsBandHolder] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  // A circle opened inline (its prayer feed), instead of navigating away.
  const [viewingId, setViewingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch('/api/circles/my-circles')
    if (res.ok) {
      const data = await res.json()
      const seen = new Set<string>()
      const unique = ((data.circles ?? []) as CircleSummary[]).filter(c => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      setCircles(unique)
      setIsBandHolder(data.is_band_holder ?? false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload, userId])

  if (loading) {
    return (
      <div style={{ padding: '20px 0', color: MUTED, fontSize: '14px', textAlign: 'center' }}>
        Loading circles...
      </div>
    )
  }

  // ── Inline panels ─────────────────────────────────────────────
  if (viewingId) {
    return <CircleView circleId={viewingId} onBack={async () => { setViewingId(null); await reload() }} />
  }
  if (mode === 'join') {
    return <JoinPanel onCancel={() => setMode('list')} onJoined={async () => { await reload(); setMode('list') }} />
  }
  if (mode === 'create') {
    return (
      <CreatePanel
        onCancel={() => setMode('list')}
        onDone={async () => { await reload(); setMode('list') }}
        onOpen={(id) => setViewingId(id)}
      />
    )
  }

  // ── List ──────────────────────────────────────────────────────
  const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    backgroundColor: bg, color, border, borderRadius: '16px', padding: '5px 12px',
    fontSize: '12px', fontFamily: 'Georgia, serif', cursor: 'pointer', fontWeight: 600,
  })

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Action buttons — the section title comes from PrayerTabs. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '14px', gap: '8px' }}>
        <button onClick={() => setMode('join')} style={pill('transparent', MUTED, `1px solid ${BORDER}`)}>Join</button>
        {isBandHolder && (
          <button onClick={() => setMode('create')} style={pill(PRIMARY, ON_PRIMARY, 'none')}>+ Create</button>
        )}
      </div>

      {/* Empty state */}
      {circles.length === 0 && (
        <div style={{ backgroundColor: SURFACE, border: `1px dashed ${BORDER}`, borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', margin: '0 0 8px 0' }}>🙏</p>
          <p style={{ fontSize: '14px', color: MUTED, margin: '0 0 14px 0', lineHeight: '1.5' }}>
            You&rsquo;re not in any Prayer Circles yet.
            {isBandHolder
              ? ' Create one for someone who needs prayer, or join one with a code.'
              : ' Enter a join code to gather around someone in need.'}
          </p>
          <button onClick={() => setMode('join')} style={{ backgroundColor: PRIMARY, border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontFamily: 'Georgia, serif', color: ON_PRIMARY, cursor: 'pointer', fontWeight: 600 }}>
            Enter a Join Code
          </button>
        </div>
      )}

      {/* Circle cards */}
      {circles.map(circle => (
        <div
          key={circle.id}
          onClick={() => setViewingId(circle.id)}
          style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '15px', fontWeight: 700, color: TEXT, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {circle.name}
              </p>
              {circle.my_role === 'leader' && (
                <span style={{ fontSize: '10px', fontWeight: 600, color: PRIMARY, backgroundColor: '#FFF8E7', border: '1px solid #F0D080', borderRadius: '10px', padding: '1px 7px', whiteSpace: 'nowrap' }}>
                  Leader
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: MUTED, margin: 0 }}>
              {circle.member_count} {circle.member_count === 1 ? 'person' : 'people'} praying
              {circle.open_request_count > 0 && (
                <span style={{ color: PRIMARY, fontWeight: 600 }}>
                  {' · '}{circle.open_request_count} open {circle.open_request_count === 1 ? 'request' : 'requests'}
                </span>
              )}
            </p>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: BORDER, marginLeft: '12px' }}>
            {circle.join_code}
          </div>
          <span style={{ marginLeft: '8px', color: BORDER, fontSize: '16px' }}>›</span>
        </div>
      ))}
    </div>
  )
}

// ── Join, inline ────────────────────────────────────────────────
function JoinPanel({ onCancel, onJoined }: { onCancel: () => void; onJoined: () => void | Promise<void> }) {
  const [code, setCode] = useState('')
  const [looking, setLooking] = useState(false)
  const [joining, setJoining] = useState(false)
  const [circle, setCircle] = useState<CirclePreview | null>(null)
  const [error, setError] = useState('')

  async function lookup() {
    const c = code.trim().toUpperCase()
    if (c.length < 4) return
    setLooking(true); setError(''); setCircle(null)
    const res = await fetch(`/api/circles/lookup?code=${encodeURIComponent(c)}`)
    const data = await res.json()
    if (!res.ok) setError('No circle found with that code. Check it and try again.')
    else setCircle(data.circle)
    setLooking(false)
  }

  async function join() {
    if (!circle) return
    setJoining(true); setError('')
    const res = await fetch('/api/circles/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circle_id: circle.id }),
    })
    // Already a member is fine — they're in the circle either way.
    if (res.ok || res.status === 409) { await onJoined(); return }
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'Could not join. Please try again.')
    setJoining(false)
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <PanelHeader title="Join a circle" onBack={onCancel} />
      <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 16px' }}>
        <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 12px', lineHeight: 1.5 }}>
          Someone shares a code (like <strong style={{ color: TEXT }}>GRACE7</strong>). Enter it to join and pray together.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setCircle(null); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') lookup() }}
            placeholder="Join code"
            maxLength={12}
            style={{ flex: 1, minWidth: 0, padding: '11px 13px', borderRadius: '9px', border: `1px solid ${BORDER}`, fontSize: '15px', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT, background: '#fff', outline: 'none' }}
          />
          <button
            onClick={lookup}
            disabled={looking || code.trim().length < 4}
            style={{ backgroundColor: code.trim().length >= 4 ? PRIMARY : '#C9CFD6', color: code.trim().length >= 4 ? ON_PRIMARY : '#5C6573', border: 'none', borderRadius: '9px', padding: '0 18px', fontSize: '12px', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: looking || code.trim().length < 4 ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
          >
            {looking ? '…' : 'Look up'}
          </button>
        </div>

        {error && <p style={{ fontSize: '13px', color: '#B4441F', margin: '12px 0 0' }}>{error}</p>}

        {circle && (
          <div style={{ marginTop: '16px', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '14px 15px' }}>
            <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '16px', fontWeight: 700, color: TEXT, margin: '0 0 3px' }}>{circle.name}</p>
            {circle.description && <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 6px', lineHeight: 1.5 }}>{circle.description}</p>}
            <p style={{ fontSize: '12px', color: MUTED, margin: '0 0 12px' }}>{circle.member_count} {circle.member_count === 1 ? 'person' : 'people'} praying</p>
            <button
              onClick={join}
              disabled={joining}
              style={{ width: '100%', backgroundColor: PRIMARY, color: ON_PRIMARY, border: 'none', borderRadius: '9px', padding: '12px', fontSize: '12px', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: joining ? 'default' : 'pointer' }}
            >
              {joining ? 'Joining…' : 'Join this circle'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Create, inline ──────────────────────────────────────────────
function CreatePanel({ onCancel, onDone, onOpen }: { onCancel: () => void; onDone: () => void | Promise<void>; onOpen: (id: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ id: string; join_code: string } | null>(null)
  const [copied, setCopied] = useState('')

  async function create() {
    if (!name.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/circles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 403) { setError('Only band holders can create a circle. Register a band first.'); setLoading(false); return }
    if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); setLoading(false); return }
    setCreated({ id: data.circle.id, join_code: data.circle.join_code })
    setLoading(false)
  }

  async function doCopy(value: string, which: string) {
    if (await copyText(value)) { setCopied(which); setTimeout(() => setCopied(''), 1600) }
  }

  const shareUrl = created
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/circles?code=${created.join_code}`
    : ''

  if (created) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <PanelHeader title="Circle created" onBack={onDone} backLabel="Done" />
        <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', margin: '0 0 6px' }}>🎉</p>
          <p style={{ fontSize: '14px', color: MUTED, margin: '0 0 16px', lineHeight: 1.5 }}>
            Share this code with the people you want praying.
          </p>
          <button onClick={() => doCopy(created.join_code, 'code')} style={{ display: 'inline-block', background: '#FFF8E7', border: `1px solid #F0D080`, borderRadius: '10px', padding: '12px 22px', margin: '0 0 12px', cursor: 'pointer' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.2em', color: PRIMARY, fontFamily: 'monospace' }}>{created.join_code}</div>
            <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px' }}>{copied === 'code' ? 'Copied!' : 'Tap to copy'}</div>
          </button>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={() => doCopy(shareUrl, 'link')} style={{ flex: 1, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '11px', fontSize: '12px', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: TEXT, cursor: 'pointer' }}>
              {copied === 'link' ? 'Link copied!' : 'Copy link'}
            </button>
            <button onClick={() => onOpen(created.id)} style={{ flex: 1, background: PRIMARY, color: ON_PRIMARY, border: 'none', borderRadius: '9px', padding: '11px', fontSize: '12px', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Open circle
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: '9px', border: `1px solid ${BORDER}`, fontSize: '15px', fontFamily: 'Georgia, serif', color: TEXT, background: '#fff', outline: 'none' }

  return (
    <div style={{ marginBottom: '32px' }}>
      <PanelHeader title="Create a circle" onBack={onCancel} />
      <div style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 16px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: '5px' }}>Circle name</label>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="e.g. Praying for Grandma" style={inputStyle} />
        <div style={{ textAlign: 'right', fontSize: '11px', color: MUTED, marginTop: '3px' }}>{name.length}/80</div>

        <label style={{ display: 'block', fontSize: '11px', fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '10px 0 5px' }}>What are you praying for? <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 300))} placeholder="A short description of the need." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        <div style={{ textAlign: 'right', fontSize: '11px', color: MUTED, marginTop: '3px' }}>{description.length}/300</div>

        {error && <p style={{ fontSize: '13px', color: '#B4441F', margin: '10px 0 0' }}>{error}</p>}

        <button
          onClick={create}
          disabled={loading || !name.trim()}
          style={{ width: '100%', marginTop: '14px', backgroundColor: name.trim() ? PRIMARY : '#C9CFD6', color: name.trim() ? ON_PRIMARY : '#5C6573', border: 'none', borderRadius: '9px', padding: '13px', fontSize: '12px', fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: name.trim() && !loading ? 'pointer' : 'default' }}
        >
          {loading ? 'Creating…' : 'Create circle'}
        </button>
      </div>
    </div>
  )
}

function PanelHeader({ title, onBack, backLabel = 'Back' }: { title: string; onBack: () => void; backLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '16px', fontWeight: 700, color: TEXT }}>{title}</span>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '13px', fontFamily: 'Georgia, serif', cursor: 'pointer', padding: '4px' }}>
        {backLabel === 'Back' ? '← Back' : backLabel}
      </button>
    </div>
  )
}

// ── A circle opened inline: its prayer feed, add-a-request, and pray taps.
// Heavier leader tools (rename, members, close) stay on the full page via
// "Manage".
interface CircleReq { id: string; request_text: string; is_answered: boolean; intercession_count: number; i_prayed: boolean }
function CircleView({ circleId, onBack }: { circleId: string; onBack: () => void | Promise<void> }) {
  const [circle, setCircle] = useState<{ name: string; description: string | null; join_code: string } | null>(null)
  const [requests, setRequests] = useState<CircleReq[]>([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadCircle = useCallback(async () => {
    const res = await fetch(`/api/circles/${circleId}`)
    if (!res.ok) { setError('Could not open this circle.'); setLoading(false); return }
    const d = await res.json()
    setCircle(d.circle)
    setRequests(d.requests ?? [])
    setIsMember(!!d.is_member)
    setLoading(false)
  }, [circleId])
  useEffect(() => { loadCircle() }, [loadCircle])

  async function addRequest() {
    if (!text.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/circles/${circleId}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_text: text.trim() }),
    })
    if (res.ok) {
      const d = await res.json()
      setRequests(prev => [{ ...d.request, intercession_count: 0, i_prayed: false }, ...prev])
      setText('')
    }
    setSubmitting(false)
  }

  async function intercede(requestId: string) {
    const res = await fetch(`/api/circles/${circleId}/intercede`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })
    if (!res.ok) return
    const d = await res.json()
    setRequests(prev => prev.map(r => r.id === requestId
      ? { ...r, i_prayed: d.praying, intercession_count: d.count ?? (d.praying ? r.intercession_count + 1 : r.intercession_count - 1) }
      : r))
  }

  if (loading) {
    return <div style={{ padding: '20px 0', color: MUTED, fontSize: '14px', textAlign: 'center' }}>Loading circle…</div>
  }
  if (error || !circle) {
    return (
      <div style={{ marginBottom: '32px' }}>
        <PanelHeader title="Circle" onBack={onBack} />
        <p style={{ color: MUTED, fontSize: '14px' }}>{error || 'Not found.'}</p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <PanelHeader title={circle.name} onBack={onBack} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <button
          onClick={async () => { if (await copyText(circle.join_code)) { setCopied(true); setTimeout(() => setCopied(false), 1500) } }}
          style={{ background: '#FFF8E7', border: `1px solid #F0D080`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em', color: PRIMARY, fontWeight: 700, cursor: 'pointer' }}
        >
          {circle.join_code}{copied ? ' · Copied' : ''}
        </button>
        <a href={`/circles/${circleId}`} style={{ fontSize: '11.5px', color: MUTED, fontFamily: 'Georgia, serif', textDecoration: 'none' }}>Manage &#8599;</a>
      </div>

      {circle.description && <p style={{ fontSize: '13px', color: MUTED, margin: '0 0 14px', lineHeight: 1.5 }}>{circle.description}</p>}

      {isMember && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addRequest() }}
            placeholder="Add a prayer request…"
            maxLength={500}
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 9, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: 'Georgia, serif', color: TEXT, background: '#fff', outline: 'none' }}
          />
          <button onClick={addRequest} disabled={submitting || !text.trim()} style={{ flexShrink: 0, background: text.trim() ? PRIMARY : BORDER, color: ON_PRIMARY, border: 'none', borderRadius: 9, padding: '0 16px', fontSize: 12, fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: text.trim() ? 'pointer' : 'default' }}>Add</button>
        </div>
      )}

      {requests.length === 0 ? (
        <p style={{ fontSize: '13px', color: MUTED, fontStyle: 'italic', margin: 0 }}>No prayer requests yet. {isMember ? 'Add the first one above.' : ''}</p>
      ) : requests.map(r => (
        <div key={r.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10, opacity: r.is_answered ? 0.8 : 1 }}>
          {r.is_answered && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4A8A6A', marginBottom: 5 }}>✓ Answered</div>}
          <p style={{ fontSize: '14px', color: TEXT, lineHeight: 1.5, margin: '0 0 10px', fontStyle: 'italic' }}>&ldquo;{r.request_text}&rdquo;</p>
          <button onClick={() => intercede(r.id)} style={{ background: r.i_prayed ? '#FFF8E7' : 'transparent', border: `1px solid ${r.i_prayed ? PRIMARY : BORDER}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', color: r.i_prayed ? PRIMARY : MUTED, cursor: 'pointer', fontWeight: r.i_prayed ? 600 : 400 }}>
            🙏 {r.i_prayed ? 'Praying' : 'Pray'} · {r.intercession_count}
          </button>
        </div>
      ))}
    </div>
  )
}
