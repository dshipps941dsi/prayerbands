'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Turn whatever someone types into a band code into PB-XXXXX. The code is
// printed on every band, so a partner can just read it aloud.
function normalizeBandCode(raw: string): string {
  const c = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!c) return ''
  const body = c.startsWith('PB') ? c.slice(2) : c
  return body ? `PB-${body}` : ''
}

interface NetworkRequest {
  id: string
  request_text: string
  is_answered: boolean
  answered_at: string | null
  created_at: string
  intercession_count: number
  i_prayed: boolean
  audience?: Audience
}

type Relation = 'direct' | 'lineage'
type Audience = 'private' | 'network' | 'direct' | 'lineage' | 'wall'

interface Connection {
  connection_id: string | null
  user_id: string
  name: string
  band_id: string | null
  since: string | null
  relation?: Relation
}

interface PendingRequest {
  connection_id: string
  requester_id: string
  name: string
  band_id: string | null
  created_at: string
}

// A request shared with the viewer through the network (audience-filtered by the API).
interface OthersApiRequest {
  id: string
  request_text: string
  created_at: string
  intercession_count: number
  i_prayed: boolean
  author: string
  relation: Relation
}

interface CircleRequest {
  id: string
  circle_id: string
  circle_name: string
  request_text: string
  author: string
  created_at: string
  intercession_count: number
  i_prayed: boolean
}

// Unified item for the "Others' Requests" feed.
type OtherKind = 'direct' | 'lineage' | 'circles'
interface OtherItem {
  key: string
  source: 'network' | 'circle'
  kind: OtherKind
  author: string
  context: string
  request_text: string
  created_at: string
  intercession_count: number
  i_prayed: boolean
  request_id: string
  circle_id?: string
}

// A private label the viewer puts on partners they know (Youth Group, Baseball
// team). member_ids are the partners' account UIDs.
interface Group {
  id: string
  name: string
  member_ids: string[]
}

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #8B7355)'
const BORDER = 'var(--pb-border, #E8DCC8)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const serif = 'Playfair Display, Georgia, serif'
const LINEAGE = '#6B4E9E'
const CIRCLE = '#2E7D8A'

const KIND_COLOR: Record<OtherKind, string> = { direct: '#9A7A35', lineage: LINEAGE, circles: CIRCLE }
const KIND_LABEL: Record<OtherKind, string> = { direct: 'Direct', lineage: 'Lineage', circles: 'Circle' }

const AUDIENCES: { id: Audience; label: string; hint: string }[] = [
  { id: 'private', label: '🔒 Just me', hint: 'A private journal entry — only you can see it, and no one is notified.' },
  { id: 'network', label: '🙏 My Network', hint: 'Everyone you’re connected to' },
  { id: 'direct', label: '👥 Direct', hint: 'Direct partners only' },
  { id: 'lineage', label: '🔗 Lineage', hint: 'People a band passed between' },
  { id: 'wall', label: '🌍 Public Wall', hint: 'Shared on the public wall' },
]
const AUD_LABEL: Record<Audience, string> = { private: 'Just me', network: 'Network', direct: 'Direct', lineage: 'Lineage', wall: 'Wall' }

export default function NetworkSection({ userId, section = 'all' }: { userId: string; section?: 'all' | 'partners' | 'requests' }) {
  const router = useRouter()
  const showPartners = section === 'all' || section === 'partners'
  const showRequests = section === 'all' || section === 'requests'
  // The viewer's own band code, shown so a partner can enter it to connect.
  const [myCode, setMyCode] = useState<string | null>(null)
  const [partnerCode, setPartnerCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [myRequests, setMyRequests] = useState<NetworkRequest[]>([])
  const [othersReqs, setOthersReqs] = useState<OthersApiRequest[]>([])
  const [circleRequests, setCircleRequests] = useState<CircleRequest[]>([])
  const [partnerFilter, setPartnerFilter] = useState<'all' | Relation>('all')
  const [othersFilter, setOthersFilter] = useState<'all' | OtherKind>('all')
  // Partner groups (private labels) + which one is filtering the list + which
  // partner's "add to group" menu is open + the inline new-group name.
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [groupMenuFor, setGroupMenuFor] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [audience, setAudience] = useState<Audience>('private')
  const [anonymity, setAnonymity] = useState<'anonymous' | 'first_initial'>('first_initial')

  async function load() {
    const [netRes, circleRes, bandsRes, groupsRes] = await Promise.all([
      fetch('/api/network/my-network'),
      showPartners ? fetch('/api/circles/open-requests') : Promise.resolve(null),
      showPartners ? fetch('/api/my-bands') : Promise.resolve(null),
      showPartners ? fetch('/api/network/groups') : Promise.resolve(null),
    ])
    if (netRes.ok) {
      const d = await netRes.json()
      setConnections([...(d.connections ?? []), ...(d.lineage_partners ?? [])])
      setPending(d.pending_requests ?? [])
      setMyRequests(d.my_requests ?? [])
      setOthersReqs(d.others_requests ?? [])
    }
    if (bandsRes && bandsRes.ok) {
      const d = await bandsRes.json()
      // Any band the viewer holds works as their connect code — someone
      // entering it lands on that band and connects to its holder (them).
      const first = (d.bands ?? [])[0]
      setMyCode(first?.band_id ?? null)
    }
    if (circleRes && circleRes.ok) {
      const d = await circleRes.json()
      setCircleRequests(d.requests ?? [])
    }
    if (groupsRes && groupsRes.ok) {
      const d = await groupsRes.json()
      setGroups(d.groups ?? [])
    }
    setLoading(false)
  }

  // ── Partner groups ───────────────────────────────────────────────────────
  async function createGroup(name: string): Promise<string | null> {
    const res = await fetch('/api/network/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const d = await res.json()
    setGroups(prev => [...prev, d.group])
    return d.group.id as string
  }

  async function deleteGroup(id: string) {
    setGroups(prev => prev.filter(g => g.id !== id))
    if (activeGroup === id) setActiveGroup(null)
    await fetch(`/api/network/groups?id=${id}`, { method: 'DELETE' })
  }

  // Add or remove a partner from a group, updating the list optimistically.
  async function toggleMember(groupId: string, memberId: string, isMember: boolean) {
    setGroups(prev => prev.map(g => g.id !== groupId ? g : {
      ...g,
      member_ids: isMember ? g.member_ids.filter(m => m !== memberId) : [...g.member_ids, memberId],
    }))
    await fetch('/api/network/groups/assign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, member_id: memberId, op: isMember ? 'remove' : 'add' }),
    })
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

  // Toggle a prayer on a network request (others' feed + my own list).
  async function intercede(requestId: string) {
    const res = await fetch('/api/network/intercede', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })
    if (!res.ok) return
    const d = await res.json()
    const apply = <T extends { id: string; i_prayed: boolean; intercession_count: number }>(r: T): T =>
      r.id === requestId
        ? { ...r, i_prayed: d.praying, intercession_count: d.praying ? r.intercession_count + 1 : r.intercession_count - 1 }
        : r
    setOthersReqs(prev => prev.map(apply))
    setMyRequests(prev => prev.map(apply))
  }

  // Toggle a prayer on a circle request (different endpoint; authoritative count).
  async function intercedeCircle(circleId: string, requestId: string) {
    const res = await fetch(`/api/circles/${circleId}/intercede`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    })
    if (!res.ok) return
    const d = await res.json()
    setCircleRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, i_prayed: d.praying, intercession_count: d.count ?? r.intercession_count } : r
    ))
  }

  function prayOther(item: OtherItem) {
    if (item.source === 'circle' && item.circle_id) intercedeCircle(item.circle_id, item.request_id)
    else intercede(item.request_id)
  }

  async function shareRequest() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/network/prayer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: text.trim(), audience, anonymity }),
      })
      if (res.ok) {
        const d = await res.json()
        setMyRequests(prev => [{ ...d.request, intercession_count: 0, i_prayed: false }, ...prev])
        setText('')
        setShowForm(false)
        setAudience('private')
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

  // ── Partners (people) ──────────────────────────────────────────────────────
  const relationOf = (c: Connection): Relation => c.relation ?? 'direct'
  const directCount = connections.filter(c => relationOf(c) === 'direct').length
  const lineageCount = connections.filter(c => relationOf(c) === 'lineage').length
  // A group filter, when active, wins over the Direct/Lineage filter.
  const activeGroupObj = groups.find(g => g.id === activeGroup) || null
  const visiblePartners = connections.filter(c =>
    activeGroupObj
      ? activeGroupObj.member_ids.includes(c.user_id)
      : (partnerFilter === 'all' || relationOf(c) === partnerFilter)
  )
  const groupsForMember = (uid: string) => groups.filter(g => g.member_ids.includes(uid))
  const canGroup = (c: Connection) => !!c.connection_id  // formal (accepted) connections only

  const relationBadge = (rel: Relation) => (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: rel === 'lineage' ? LINEAGE : GOLD, background: rel === 'lineage' ? 'rgba(107,78,158,0.10)' : '#FFF8E7', border: `1px solid ${rel === 'lineage' ? 'rgba(107,78,158,0.35)' : GOLD}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>
      {rel === 'lineage' ? 'Lineage' : 'Direct'}
    </span>
  )

  const chip = (active: boolean, label: string, onClick: () => void, color = GOLD) => (
    <button onClick={onClick} style={{ padding: '5px 11px', borderRadius: 16, border: `1px solid ${active ? color : BORDER}`, background: active ? '#FFF8E7' : '#fff', color: active ? color : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
      {label}
    </button>
  )

  // ── Others' Requests (merged feed) ─────────────────────────────────────────
  const othersFeed: OtherItem[] = [
    ...othersReqs.map(r => ({
      key: `n-${r.id}`,
      source: 'network' as const,
      kind: r.relation as OtherKind,
      author: r.author,
      context: '',
      request_text: r.request_text,
      created_at: r.created_at,
      intercession_count: r.intercession_count,
      i_prayed: r.i_prayed,
      request_id: r.id,
    })),
    ...circleRequests.map(r => ({
      key: `c-${r.id}`,
      source: 'circle' as const,
      kind: 'circles' as OtherKind,
      author: r.author,
      context: r.circle_name,
      request_text: r.request_text,
      created_at: r.created_at,
      intercession_count: r.intercession_count,
      i_prayed: r.i_prayed,
      request_id: r.id,
      circle_id: r.circle_id,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const oDirect = othersFeed.filter(o => o.kind === 'direct').length
  const oLineage = othersFeed.filter(o => o.kind === 'lineage').length
  const oCircles = othersFeed.filter(o => o.kind === 'circles').length
  const visibleOthers = othersFeed.filter(o => othersFilter === 'all' || o.kind === othersFilter)

  const prayBtn = (id: string, praying: boolean, count: number, onClick: () => void) => (
    <button
      key={id}
      onClick={onClick}
      style={{ backgroundColor: praying ? '#FFF8E7' : CREAM, border: `1px solid ${praying ? GOLD : BORDER}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', color: praying ? GOLD : GRAY, cursor: 'pointer', fontWeight: praying ? 600 : 400 }}
    >
      🙏 {praying ? 'Praying' : 'Pray'} · {count}
    </button>
  )

  return (
    <div style={{ marginBottom: 32 }}>
      {section === 'all' && <h3 style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: DARK, margin: '0 0 14px 0' }}>Prayer Partners</h3>}

      {showPartners && (<>
      {/* Connect a partner in person — enter the code printed on their band,
          or read yours to them. Routes to their band page, where the existing
          "Add to Prayer Partners" prompt does the rest. */}
      <div style={{ backgroundColor: '#fff', border: `1px solid ${GOLD}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD, marginBottom: 10, fontFamily: serif }}>Connect a prayer partner</div>

        {myCode && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: GRAY, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your code</div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: DARK, fontFamily: 'monospace' }}>{myCode}</div>
            </div>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(myCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500) } catch {} }}
              style={{ flexShrink: 0, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 16, padding: '5px 12px', fontSize: 11.5, fontFamily: serif, color: GRAY, cursor: 'pointer' }}
            >
              {codeCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>Enter their band code to connect:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={partnerCode}
            onChange={e => setPartnerCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') { const c = normalizeBandCode(partnerCode); if (c.length >= 5) router.push(`/band/${c}`) } }}
            placeholder="PB-XXXXX"
            maxLength={12}
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 15, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', color: DARK, background: '#fff', outline: 'none' }}
          />
          <button
            onClick={() => { const c = normalizeBandCode(partnerCode); if (c.length >= 5) router.push(`/band/${c}`) }}
            disabled={normalizeBandCode(partnerCode).length < 5}
            style={{ flexShrink: 0, backgroundColor: normalizeBandCode(partnerCode).length >= 5 ? GOLD : BORDER, color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: 13, fontFamily: serif, fontWeight: 600, cursor: normalizeBandCode(partnerCode).length >= 5 ? 'pointer' : 'default' }}
          >
            Connect
          </button>
        </div>
        <p style={{ fontSize: 11, color: GRAY, margin: '8px 2px 0', fontStyle: 'italic' }}>The code is printed on every band. You&rsquo;ll land on their page, then tap &ldquo;Add to Prayer Partners.&rdquo;</p>
      </div>

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

      {/* Direct / Lineage / group filters */}
      {connections.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {chip(partnerFilter === 'all' && !activeGroup, `All · ${connections.length}`, () => { setActiveGroup(null); setPartnerFilter('all') })}
          {chip(partnerFilter === 'direct' && !activeGroup, `Direct · ${directCount}`, () => { setActiveGroup(null); setPartnerFilter('direct') })}
          {chip(partnerFilter === 'lineage' && !activeGroup, `Lineage · ${lineageCount}`, () => { setActiveGroup(null); setPartnerFilter('lineage') }, LINEAGE)}
          {groups.map(g => chip(activeGroup === g.id, `${g.name} · ${g.member_ids.length}`, () => setActiveGroup(activeGroup === g.id ? null : g.id), CIRCLE))}
          {showNewGroup ? (
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <input
                autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value.slice(0, 60))}
                onKeyDown={async e => { if (e.key === 'Enter' && newGroupName.trim()) { await createGroup(newGroupName.trim()); setNewGroupName(''); setShowNewGroup(false) } if (e.key === 'Escape') { setShowNewGroup(false); setNewGroupName('') } }}
                placeholder="Group name" style={{ padding: '4px 10px', borderRadius: 16, border: `1px solid ${GOLD}`, fontSize: 11.5, fontFamily: 'Georgia, serif', outline: 'none', width: 110 }}
              />
              <button onClick={async () => { if (newGroupName.trim()) { await createGroup(newGroupName.trim()); setNewGroupName(''); setShowNewGroup(false) } }} style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: GOLD, color: '#fff', fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </span>
          ) : (
            <button onClick={() => setShowNewGroup(true)} style={{ padding: '5px 11px', borderRadius: 16, border: `1px dashed ${BORDER}`, background: '#fff', color: GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>+ Group</button>
          )}
        </div>
      )}
      {activeGroupObj && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: GRAY }}>Showing <strong style={{ color: DARK }}>{activeGroupObj.name}</strong></span>
          <button onClick={() => deleteGroup(activeGroupObj.id)} style={{ background: 'none', border: 'none', color: '#B4441F', fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: 0 }}>Delete group</button>
        </div>
      )}

      {/* Partner people */}
      {visiblePartners.map(c => {
        const inGroups = groupsForMember(c.user_id)
        const menuOpen = groupMenuFor === c.user_id
        return (
        <div key={c.connection_id ?? `lin-${c.user_id}`} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🙏</div>
            <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: 0, flex: 1 }}>{c.name}</p>
            {relationBadge(relationOf(c))}
          </div>

          {/* Groups this partner is in, plus a menu to add/remove. Only for
              formal (accepted) connections — see canGroup. */}
          {canGroup(c) && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {inGroups.map(g => (
                <span key={g.id} onClick={() => toggleMember(g.id, c.user_id, true)} title="Remove from group"
                  style={{ fontSize: 11, fontWeight: 600, color: CIRCLE, background: 'rgba(46,125,138,0.10)', border: `1px solid ${CIRCLE}`, borderRadius: 20, padding: '2px 9px', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                  {g.name} ✕
                </span>
              ))}
              <button onClick={() => setGroupMenuFor(menuOpen ? null : c.user_id)}
                style={{ fontSize: 11, color: menuOpen ? DARK : GRAY, background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 20, padding: '3px 10px', fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                {menuOpen ? 'Done' : '+ Group'}
              </button>
            </div>
          )}

          {menuOpen && (
            <div style={{ marginTop: 8, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8, background: CREAM }}>
              {groups.length === 0 ? (
                <div style={{ fontSize: 12, color: GRAY, padding: '2px 4px' }}>No groups yet — add one with “+ Group” in the filter row above.</div>
              ) : groups.map(g => {
                const isMember = g.member_ids.includes(c.user_id)
                return (
                  <button key={g.id} onClick={() => toggleMember(g.id, c.user_id, isMember)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', margin: '2px 0', borderRadius: 6, border: 'none', background: isMember ? 'rgba(46,125,138,0.10)' : 'transparent', color: DARK, fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
                    {isMember ? '✓ ' : '＋ '}{g.name}
                  </button>
                )
              })}
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

      {/* ── Their Requests — prayers your partners & circles have shared ──── */}
      <div style={{ marginTop: 26 }}>
        <h4 style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: '0 0 10px 0' }}>Their Requests</h4>

        {othersFeed.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {chip(othersFilter === 'all', `All · ${othersFeed.length}`, () => setOthersFilter('all'))}
            {chip(othersFilter === 'direct', `Direct · ${oDirect}`, () => setOthersFilter('direct'))}
            {chip(othersFilter === 'lineage', `Lineage · ${oLineage}`, () => setOthersFilter('lineage'), LINEAGE)}
            {chip(othersFilter === 'circles', `Circles · ${oCircles}`, () => setOthersFilter('circles'), CIRCLE)}
          </div>
        )}

        {othersFeed.length === 0 ? (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>No requests from others yet. When your partners or circles share a need, it&rsquo;ll appear here.</p>
        ) : visibleOthers.length === 0 ? (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>Nothing under this filter right now.</p>
        ) : visibleOthers.map(o => (
          <div key={o.key} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: serif, fontSize: 14, fontWeight: 700, color: DARK }}>{o.author}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: KIND_COLOR[o.kind], background: '#fff', border: `1px solid ${KIND_COLOR[o.kind]}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>
                {KIND_LABEL[o.kind]}{o.context ? ` · ${o.context}` : ''}
              </span>
            </div>
            <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, margin: '0 0 10px 0', fontStyle: 'italic' }}>&ldquo;{o.request_text}&rdquo;</p>
            {prayBtn(o.key, o.i_prayed, o.intercession_count, () => prayOther(o))}
          </div>
        ))}
      </div>
      </>)}

      {/* ── My Requests ────────────────────────────────────────────────────── */}
      {showRequests && (
      <div style={{ marginTop: section === 'all' ? 20 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>My Journal</h4>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
          )}
        </div>

        {showForm && (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What would you like prayer for?" rows={3} maxLength={400} autoFocus style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />

            <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Keep private, or share it?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {AUDIENCES.map(a => {
                const active = audience === a.id
                return (
                  <button key={a.id} onClick={() => setAudience(a.id)} title={a.hint} style={{ padding: '9px 8px', borderRadius: 8, border: `1px solid ${active ? GOLD : BORDER}`, background: active ? '#FFF8E7' : '#fff', color: active ? GOLD : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}>
                    {a.label}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 11, color: GRAY, margin: '6px 2px 0', fontStyle: 'italic' }}>{AUDIENCES.find(a => a.id === audience)?.hint}</p>

            {audience === 'wall' && (
              <>
                <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Show on the wall as</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setAnonymity('first_initial')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${anonymity === 'first_initial' ? GOLD : BORDER}`, background: anonymity === 'first_initial' ? '#FFF8E7' : '#fff', color: anonymity === 'first_initial' ? GOLD : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: anonymity === 'first_initial' ? 600 : 400, cursor: 'pointer' }}>First name, last initial</button>
                  <button onClick={() => setAnonymity('anonymous')} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${anonymity === 'anonymous' ? GOLD : BORDER}`, background: anonymity === 'anonymous' ? '#FFF8E7' : '#fff', color: anonymity === 'anonymous' ? GOLD : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: anonymity === 'anonymous' ? 600 : 400, cursor: 'pointer' }}>Anonymous</button>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setShowForm(false); setText(''); setAudience('private'); setAnonymity('first_initial') }} style={{ flex: 1, backgroundColor: 'transparent', border: `1px solid var(--pb-border, #D4C5B0)`, borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
              <button onClick={shareRequest} disabled={!text.trim() || submitting} style={{ flex: 2, backgroundColor: text.trim() ? GOLD : 'var(--pb-border, #D4C5B0)', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: text.trim() ? 'pointer' : 'default' }}>{submitting ? (audience === 'private' ? 'Saving...' : 'Sharing...') : (audience === 'private' ? 'Add to Journal' : 'Share Request')}</button>
            </div>
          </div>
        )}

        {myRequests.length === 0 && !showForm && (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>Your journal is empty. Add a prayer — it stays private to you unless you choose to share it.</p>
        )}

        {myRequests.map(r => (
          <div key={r.id} style={{ backgroundColor: r.is_answered ? '#F5F5F0' : '#fff', border: `1px solid ${r.is_answered ? '#D4D0C8' : BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, opacity: r.is_answered ? 0.85 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {r.is_answered && <span style={{ fontSize: 11, fontWeight: 600, color: '#7BAE8E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Answered</span>}
              {r.audience && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: GRAY, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>{AUD_LABEL[r.audience]}</span>}
            </div>
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
