'use client'

import { useState, useEffect } from 'react'

interface NetworkRequest {
  id: string
  request_text: string
  is_answered: boolean
  answered_at: string | null
  created_at: string
  intercession_count: number
  i_prayed: boolean
}

type Relation = 'direct' | 'lineage'

interface Connection {
  connection_id: string | null
  user_id: string
  name: string
  band_id: string | null
  since: string | null
  relation?: Relation
  requests: NetworkRequest[]
}

interface PendingRequest {
  connection_id: string
  requester_id: string
  name: string
  band_id: string | null
  created_at: string
}

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const serif = 'Playfair Display, Georgia, serif'

export default function NetworkSection({ userId, section = 'all' }: { userId: string; section?: 'all' | 'partners' | 'requests' }) {
  const showPartners = section === 'all' || section === 'partners'
  const showRequests = section === 'all' || section === 'requests'
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [myRequests, setMyRequests] = useState<NetworkRequest[]>([])
  const [partnerFilter, setPartnerFilter] = useState<'all' | Relation>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [anonymity, setAnonymity] = useState<'anonymous' | 'first_initial'>('first_initial')

  async function load() {
    const res = await fetch('/api/network/my-network')
    if (res.ok) {
      const d = await res.json()
      // Accepted connections + lineage-only partners share one Partners list,
      // each tagged with its relation.
      setConnections([...(d.connections ?? []), ...(d.lineage_partners ?? [])])
      setPending(d.pending_requests ?? [])
      setMyRequests(d.my_requests ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function respond(connectionId: string, action: 'accepted' | 'declined') {
    setBusy(connectionId)
    try {
      const res = await fetch('/api/network/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId, action }),
      })
      if (res.ok) {
        setPending(prev => prev.filter(p => p.connection_id !== connectionId))
        if (action === 'accepted') load()
      }
    } finally {
      setBusy(null)
    }
  }

  async function intercede(requestId: string) {
    const res = await fetch('/api/network/intercede', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })
    if (!res.ok) return
    const d = await res.json()
    const apply = (r: NetworkRequest) =>
      r.id === requestId
        ? { ...r, i_prayed: d.praying, intercession_count: d.praying ? r.intercession_count + 1 : r.intercession_count - 1 }
        : r
    setConnections(prev => prev.map(c => ({ ...c, requests: c.requests.map(apply) })))
    setMyRequests(prev => prev.map(apply))
  }

  async function shareRequest() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/network/prayer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: text.trim(), visibility, anonymity }),
      })
      if (res.ok) {
        const d = await res.json()
        setMyRequests(prev => [{ ...d.request, intercession_count: 0, i_prayed: false }, ...prev])
        setText('')
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function markAnswered(requestId: string, isAnswered: boolean) {
    const res = await fetch('/api/network/prayer-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, is_answered: isAnswered }),
    })
    if (res.ok) {
      setMyRequests(prev => prev.map(r => (r.id === requestId ? { ...r, is_answered: isAnswered } : r)))
    }
  }

  if (loading) {
    return <div style={{ padding: '20px 0', color: GRAY, fontSize: 14, textAlign: 'center' }}>Loading your network...</div>
  }

  const intercedeBtn = (r: NetworkRequest) => (
    <button
      onClick={() => intercede(r.id)}
      style={{ backgroundColor: r.i_prayed ? '#FFF8E7' : CREAM, border: `1px solid ${r.i_prayed ? GOLD : BORDER}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', color: r.i_prayed ? GOLD : GRAY, cursor: 'pointer', fontWeight: r.i_prayed ? 600 : 400 }}
    >
      🙏 {r.i_prayed ? 'Praying' : 'Pray'} · {r.intercession_count}
    </button>
  )

  const relationOf = (c: Connection): Relation => c.relation ?? 'direct'
  const directCount = connections.filter(c => relationOf(c) === 'direct').length
  const lineageCount = connections.filter(c => relationOf(c) === 'lineage').length
  const visiblePartners = connections.filter(c => partnerFilter === 'all' || relationOf(c) === partnerFilter)

  const relationBadge = (rel: Relation) => (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: rel === 'lineage' ? '#6B4E9E' : GOLD, background: rel === 'lineage' ? 'rgba(107,78,158,0.10)' : '#FFF8E7', border: `1px solid ${rel === 'lineage' ? 'rgba(107,78,158,0.35)' : GOLD}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>
      {rel === 'lineage' ? 'Lineage' : 'Direct'}
    </span>
  )

  const filterChips = (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {([['all', `All · ${connections.length}`], ['direct', `Direct · ${directCount}`], ['lineage', `Lineage · ${lineageCount}`]] as const).map(([id, label]) => {
        const active = partnerFilter === id
        return (
          <button key={id} onClick={() => setPartnerFilter(id)} style={{ padding: '5px 11px', borderRadius: 16, border: `1px solid ${active ? GOLD : BORDER}`, background: active ? '#FFF8E7' : '#fff', color: active ? GOLD : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
            {label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ marginBottom: 32 }}>
      {section === 'all' && <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK, margin: '0 0 14px 0' }}>Prayer Partners</h3>}

      {showPartners && (<>
      {/* Pending incoming requests */}
      {pending.map(p => (
        <div key={p.connection_id} style={{ backgroundColor: '#FFF8E7', border: `1px solid #F0D080`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
          <p style={{ fontSize: 14, color: DARK, margin: '0 0 10px 0' }}><strong>{p.name}</strong> wants to connect with you in prayer.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => respond(p.connection_id, 'accepted')} disabled={busy === p.connection_id} style={{ flex: 1, backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, cursor: 'pointer' }}>{busy === p.connection_id ? '...' : 'Accept'}</button>
            <button onClick={() => respond(p.connection_id, 'declined')} disabled={busy === p.connection_id} style={{ flex: 1, backgroundColor: 'transparent', color: GRAY, border: `1px solid var(--pb-border, #D4C5B0)`, borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>Decline</button>
          </div>
        </div>
      ))}

      {/* Direct / Lineage filter (only worth showing once you have partners) */}
      {connections.length > 0 && filterChips}

      {/* Partners (accepted connections + lineage), filtered */}
      {visiblePartners.map(c => {
        const rel = relationOf(c)
        const lineageOnly = c.connection_id === null
        return (
          <div key={c.connection_id ?? `lin-${c.user_id}`} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: c.requests.length ? 12 : 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🙏</div>
              <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: 0, flex: 1 }}>{c.name}</p>
              {relationBadge(rel)}
            </div>
            {lineageOnly ? (
              <p style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', margin: '0 0 0 48px' }}>Connected through a band you&rsquo;ve shared.</p>
            ) : c.requests.length === 0 ? (
              <p style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', margin: '0 0 0 48px' }}>No requests shared yet</p>
            ) : (
              <div style={{ marginLeft: 48, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {c.requests.map(r => (
                  <div key={r.id} style={{ borderTop: `1px solid ${CREAM}`, paddingTop: 8 }}>
                    <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, margin: '0 0 8px 0', fontStyle: 'italic' }}>&ldquo;{r.request_text}&rdquo;</p>
                    {intercedeBtn(r)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Empty states */}
      {connections.length === 0 && pending.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: `1px dashed var(--pb-border, #D4C5B0)`, borderRadius: 12, padding: '20px', textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 24, margin: '0 0 8px 0' }}>🙏</p>
          <p style={{ fontSize: 14, color: GRAY, margin: 0, lineHeight: 1.5 }}>Tap your band to someone else&rsquo;s phone to connect in prayer.</p>
        </div>
      ) : visiblePartners.length === 0 && (
        <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: '2px 0 12px' }}>
          {partnerFilter === 'lineage' ? 'No lineage partners yet — pass a band to someone (or receive one) and they’ll appear here.' : 'No direct partners yet — connect with someone by tapping bands.'}
        </p>
      )}
      </>)}

      {/* My Prayer Requests */}
      {showRequests && (
      <div style={{ marginTop: section === 'all' ? 20 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>My Prayer Requests</h4>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', cursor: 'pointer', fontWeight: 600 }}>+ Share</button>
          )}
        </div>

        {showForm && (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What would you like your network to pray for?" rows={3} maxLength={400} autoFocus style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />

            <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Who can see this?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setVisibility('private')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${visibility === 'private' ? GOLD : BORDER}`, background: visibility === 'private' ? '#FFF8E7' : '#fff', color: visibility === 'private' ? GOLD : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: visibility === 'private' ? 600 : 400, cursor: 'pointer' }}>🔒 My Network</button>
              <button onClick={() => setVisibility('public')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${visibility === 'public' ? GOLD : BORDER}`, background: visibility === 'public' ? '#FFF8E7' : '#fff', color: visibility === 'public' ? GOLD : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: visibility === 'public' ? 600 : 400, cursor: 'pointer' }}>🌍 Public Wall</button>
            </div>

            {visibility === 'public' && (
              <>
                <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Show on the wall as</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setAnonymity('first_initial')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${anonymity === 'first_initial' ? GOLD : BORDER}`, background: anonymity === 'first_initial' ? '#FFF8E7' : '#fff', color: anonymity === 'first_initial' ? GOLD : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: anonymity === 'first_initial' ? 600 : 400, cursor: 'pointer' }}>First name, last initial</button>
                  <button onClick={() => setAnonymity('anonymous')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${anonymity === 'anonymous' ? GOLD : BORDER}`, background: anonymity === 'anonymous' ? '#FFF8E7' : '#fff', color: anonymity === 'anonymous' ? GOLD : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: anonymity === 'anonymous' ? 600 : 400, cursor: 'pointer' }}>Anonymous</button>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setShowForm(false); setText(''); setVisibility('private'); setAnonymity('first_initial') }} style={{ flex: 1, backgroundColor: 'transparent', border: `1px solid var(--pb-border, #D4C5B0)`, borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
              <button onClick={shareRequest} disabled={!text.trim() || submitting} style={{ flex: 2, backgroundColor: text.trim() ? GOLD : 'var(--pb-border, #D4C5B0)', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: text.trim() ? 'pointer' : 'default' }}>{submitting ? 'Sharing...' : 'Share Request'}</button>
            </div>
          </div>
        )}

        {myRequests.length === 0 && !showForm && (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>You haven&rsquo;t shared any requests with your network yet.</p>
        )}

        {myRequests.map(r => (
          <div key={r.id} style={{ backgroundColor: r.is_answered ? '#F5F5F0' : '#fff', border: `1px solid ${r.is_answered ? '#D4D0C8' : BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, opacity: r.is_answered ? 0.85 : 1 }}>
            {r.is_answered && <p style={{ fontSize: 11, fontWeight: 600, color: '#7BAE8E', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>✓ Answered</p>}
            <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, margin: '0 0 10px 0', fontStyle: 'italic' }}>&ldquo;{r.request_text}&rdquo;</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: GRAY }}>🙏 {r.intercession_count} {r.intercession_count === 1 ? 'person praying' : 'praying'}</span>
              <button onClick={() => markAnswered(r.id, !r.is_answered)} style={{ background: 'none', border: 'none', fontSize: 12, color: r.is_answered ? GRAY : '#7BAE8E', cursor: 'pointer', padding: 0 }}>
                {r.is_answered ? 'Reopen' : 'Mark Answered ✓'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
