'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import AvatarBadge from './AvatarBadge'
type AvatarSpec = { icon: string | null; initials: string | null; font: string | null }

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
  audience?: string
  list_id?: string | null
  allow_comments?: boolean
  reply_count?: number
}

// A named bucket a person files their own journal entries into (Family, Health).
interface JournalList { id: string; name: string }

type Relation = 'direct' | 'lineage'
type Audience = 'private' | 'network' | 'direct' | 'lineage' | 'wall'

interface Connection {
  connection_id: string | null
  user_id: string
  name: string
  avatar?: AvatarSpec
  band_id: string | null
  since: string | null
  relation?: Relation
}

interface PendingRequest {
  connection_id: string
  requester_id: string
  name: string
  avatar?: AvatarSpec
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
  author_id: string
  relation: Relation
  allow_comments?: boolean
  i_replied?: boolean
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
  author_id?: string
  allow_comments?: boolean
  i_replied?: boolean
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

// Posting audiences, kept to the three people actually think in: their own
// private journal, everyone they're connected with, or a specific group (via
// the dropdown). Direct/Lineage stay as feed FILTERS for browsing, not as
// posting choices; the public wall is fed by band taps, not the journal.
const AUDIENCES: { id: Audience; label: string; hint: string }[] = [
  { id: 'private', label: '📔 My Journal', hint: 'Private — only you can see this, and no one is notified.' },
  { id: 'network', label: '🙏 My Partners', hint: 'Everyone you’re connected with.' },
]
// Full label map is kept so older posts (direct / lineage / wall) still render.
const AUD_LABEL: Record<Audience, string> = { private: 'My Journal', network: 'My Partners', direct: 'Direct', lineage: 'Lineage', wall: 'Wall' }

export default function NetworkSection({ userId, section = 'all' }: { userId: string; section?: 'all' | 'partners' | 'requests' }) {
  const router = useRouter()
  const showPartners = section === 'all' || section === 'partners'
  const showRequests = section === 'all' || section === 'requests'
  // The viewer's own band code, shown so a partner can enter it to connect.
  const [myCode, setMyCode] = useState<string | null>(null)
  const [partnerCode, setPartnerCode] = useState('')
  const [codeShared, setCodeShared] = useState(false)
  // The viewer's permanent connect code + whether their QR is expanded.
  const [myConnectCode, setMyConnectCode] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [myRequests, setMyRequests] = useState<NetworkRequest[]>([])
  const [othersReqs, setOthersReqs] = useState<OthersApiRequest[]>([])
  const [muted, setMuted] = useState<{ id: string; name: string; avatar?: AvatarSpec }[]>([])
  const [circleRequests, setCircleRequests] = useState<CircleRequest[]>([])
  const [partnerFilter, setPartnerFilter] = useState<'all' | Relation>('all')
  const [partnerSearch, setPartnerSearch] = useState('')       // filter a long list by name
  const [partnerLimit, setPartnerLimit] = useState(15)         // "show more" paging for big reach
  const [othersFilter, setOthersFilter] = useState<'all' | OtherKind>('all')
  // Partner groups (private labels) + which one is filtering the list + which
  // partner's "add to group" menu is open + the inline new-group name.
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [groupMenuFor, setGroupMenuFor] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroup, setShowNewGroup] = useState(false)
  // Journal lists: the set, which one filters My Journal, which one a new entry
  // is filed into, and the inline new-list name.
  const [lists, setLists] = useState<JournalList[]>([])
  const [activeList, setActiveList] = useState<string | null>(null)
  const [entryList, setEntryList] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [audience, setAudience] = useState<string>('private')
  const [excluded, setExcluded] = useState<string[]>([])   // partners left out of a "My Partners" share
  const [prayedFor, setPrayedFor] = useState<Set<string>>(new Set())  // partners you've told "I prayed for you"
  const [composeFor, setComposeFor] = useState<string | null>(null)   // partner whose message box is open
  const [composeText, setComposeText] = useState('')
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [showExclude, setShowExclude] = useState(false)
  function toggleExclude(id: string) {
    setExcluded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const [anonymity, setAnonymity] = useState<'anonymous' | 'first_initial'>('first_initial')
  // Opt-in private replies to a shared prayer, and the per-request reply UI.
  const [allowReplies, setAllowReplies] = useState(false)
  const [openReplyId, setOpenReplyId] = useState<string | null>(null)
  const [repliesFor, setRepliesFor] = useState<Record<string, { id: string; body: string; author: string }[]>>({})
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [replyBusy, setReplyBusy] = useState(false)

  async function load() {
    const [netRes, circleRes, bandsRes, groupsRes, listsRes] = await Promise.all([
      fetch('/api/network/my-network'),
      showPartners ? fetch('/api/circles/open-requests') : Promise.resolve(null),
      showPartners ? fetch('/api/my-bands') : Promise.resolve(null),
      (showPartners || showRequests) ? fetch('/api/network/groups') : Promise.resolve(null),
      showRequests ? fetch('/api/network/lists') : Promise.resolve(null),
    ])
    if (netRes.ok) {
      const d = await netRes.json()
      setConnections([...(d.connections ?? []), ...(d.lineage_partners ?? [])])
      setPending(d.pending_requests ?? [])
      setMyRequests(d.my_requests ?? [])
      setOthersReqs(d.others_requests ?? [])
      setMuted(d.muted ?? [])
      setMyConnectCode(d.my_connect_code ?? null)
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
    if (listsRes && listsRes.ok) {
      const d = await listsRes.json()
      setLists(d.lists ?? [])
    }
    setLoading(false)
  }

  // ── Journal lists ────────────────────────────────────────────────────────
  async function createList(name: string): Promise<string | null> {
    const res = await fetch('/api/network/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return null
    const d = await res.json()
    setLists(prev => [...prev, d.list])
    return d.list.id as string
  }
  async function deleteList(id: string) {
    setLists(prev => prev.filter(l => l.id !== id))
    if (activeList === id) setActiveList(null)
    if (entryList === id) setEntryList(null)
    setMyRequests(prev => prev.map(r => r.list_id === id ? { ...r, list_id: null } : r))
    await fetch(`/api/network/lists?id=${id}`, { method: 'DELETE' })
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

  // Send someone your connect link the easy way: on a phone this opens the
  // share sheet (Messages, WhatsApp, email…) with the text already written, so
  // it's one tap to text a tappable link. On desktop it copies the message.
  async function sharePartnerConnect() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'
    const url = myConnectCode ? `${origin}/connect/${myConnectCode}` : origin
    const message = `Let's pray for one another 🙏 Tap to connect with me on Prayer Bands: ${url}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Connect on Prayer Bands', text: message }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(message) } catch {}
    setCodeShared(true); setTimeout(() => setCodeShared(false), 1800)
  }

  async function shareRequest() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/network/prayer-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_text: text.trim(), audience, anonymity, list_id: entryList, allow_comments: allowReplies && audience !== 'private', excluded_user_ids: audience === 'network' ? excluded : [] }),
      })
      if (res.ok) {
        const d = await res.json()
        setMyRequests(prev => [{ ...d.request, intercession_count: 0, i_prayed: false }, ...prev])
        setText('')
        setShowForm(false)
        setAudience('private')
        setExcluded([]); setShowExclude(false)
        setAllowReplies(false)
        setEntryList(activeList)  // default the next entry to the list you're viewing
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Private replies to a shared prayer (requester sees all; a replier sees own).
  async function toggleReplies(id: string) {
    if (openReplyId === id) { setOpenReplyId(null); return }
    setOpenReplyId(id)
    if (!repliesFor[id]) {
      const res = await fetch(`/api/network/prayer-request/replies?request_id=${id}`)
      if (res.ok) { const d = await res.json(); setRepliesFor(prev => ({ ...prev, [id]: d.replies ?? [] })) }
    }
  }
  async function sendReply(id: string) {
    const text = (replyDraft[id] || '').trim()
    if (!text) return
    setReplyBusy(true)
    const res = await fetch('/api/network/prayer-request/replies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: id, body: text }),
    })
    if (res.ok) {
      setReplyDraft(prev => ({ ...prev, [id]: '' }))
      setOthersReqs(prev => prev.map(r => r.id === id ? { ...r, i_replied: true } : r))
    }
    setReplyBusy(false)
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

  // Mute a person's shared prayers (private to you; they're not told), or bring
  // them back. Muting hides their requests from the feed immediately.
  // Send a partner (or someone you gave a band to) a note — lands in their
  // inbox as "‹you› prayed for you 🙏", with your message. Reach is enforced
  // server-side (accepted partner or band lineage).
  async function prayForPartner(uid: string, note?: string) {
    if (sendingTo) return
    setSendingTo(uid)
    await fetch('/api/network/prayed-for', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: uid, note: (note || '').trim() || undefined }),
    }).catch(() => {})
    setSendingTo(null)
    setPrayedFor(prev => new Set([...prev, uid]))
    setComposeFor(null)
    setComposeText('')
  }

  async function mute(authorId: string, name: string) {
    setOthersReqs(prev => prev.filter(r => r.author_id !== authorId))
    setMuted(prev => prev.some(m => m.id === authorId) ? prev : [...prev, { id: authorId, name }])
    await fetch('/api/network/mute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muted_id: authorId, op: 'mute' }),
    })
  }
  async function unmute(id: string) {
    setMuted(prev => prev.filter(m => m.id !== id))
    await fetch('/api/network/mute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ muted_id: id, op: 'unmute' }),
    })
    load()  // bring their requests back into the feed
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
  const filteredPartners = connections.filter(c =>
    activeGroupObj
      ? activeGroupObj.member_ids.includes(c.user_id)
      : (partnerFilter === 'all' || relationOf(c) === partnerFilter)
  )
  const q = partnerSearch.trim().toLowerCase()
  const visiblePartners = q ? filteredPartners.filter(c => c.name.toLowerCase().includes(q)) : filteredPartners
  const pagedPartners = visiblePartners.slice(0, partnerLimit)
  const groupsForMember = (uid: string) => groups.filter(g => g.member_ids.includes(uid))
  const canGroup = (c: Connection) => !!c.connection_id  // formal (accepted) connections only
  // Labels for audiences, including group:<id> share targets.
  const groupName = (id: string) => groups.find(g => g.id === id)?.name || 'a group'
  const audienceLabel = (aud?: string) => !aud ? '' : aud.startsWith('group:') ? groupName(aud.slice(6)) : (AUD_LABEL[aud as Audience] || aud)
  const audienceHint = (aud: string) => aud.startsWith('group:') ? `Only people in ${groupName(aud.slice(6))}.` : (AUDIENCES.find(a => a.id === aud)?.hint || '')

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
      author_id: r.author_id,
      allow_comments: r.allow_comments,
      i_replied: r.i_replied,
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
              onClick={sharePartnerConnect}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, background: GOLD, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: serif, color: '#fff', cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {codeShared ? 'Copied' : 'Share'}
            </button>
          </div>
        )}

        {myConnectCode && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setShowQR(v => !v)} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 12, fontFamily: serif, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {showQR ? '▴ Hide my QR code' : '▾ Show my QR code'}
            </button>
            {showQR && (
              <div style={{ marginTop: 10, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: '#fff', padding: 6, borderRadius: 6 }}>
                  <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'}/connect/${myConnectCode}`} size={168} bgColor="#ffffff" fgColor="#15223B" level="M" />
                </div>
                <p style={{ fontSize: 12, color: GRAY, margin: '10px 6px 0', lineHeight: 1.5 }}>
                  Point a phone camera here to connect with you in prayer. It always reaches your account, even after you hand out bands — great for a group, a screen, or a printed card.
                </p>
              </div>
            )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AvatarBadge {...(p.avatar || {})} name={p.name} size={32} />
            <p style={{ fontSize: 14, color: DARK, margin: 0 }}><strong>{p.name}</strong> wants to connect with you in prayer.</p>
          </div>
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

      {/* Search — appears once the list is long enough to be worth filtering. */}
      {connections.length > 8 && (
        <input
          value={partnerSearch}
          onChange={e => { setPartnerSearch(e.target.value); setPartnerLimit(15) }}
          placeholder={`Search ${filteredPartners.length} partners by name…`}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, padding: '9px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13.5, fontFamily: 'Georgia, serif', color: DARK, background: '#fff', outline: 'none' }}
        />
      )}

      {/* Partner people — one compact row each; the message box and group tools
          expand inline only when opened, so a big list stays scannable. */}
      {pagedPartners.map(c => {
        const inGroups = groupsForMember(c.user_id)
        const menuOpen = groupMenuFor === c.user_id
        const composing = composeFor === c.user_id
        return (
        <div key={c.connection_id ?? `lin-${c.user_id}`} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AvatarBadge {...(c.avatar || {})} name={c.name} size={30} />
            <p style={{ fontFamily: serif, fontSize: 14.5, fontWeight: 700, color: DARK, margin: 0, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
            {relationBadge(relationOf(c))}
            {prayedFor.has(c.user_id) ? (
              <span title={`Sent to ${c.name.split(' ')[0]}`} style={{ fontSize: 12, fontWeight: 700, fontFamily: serif, color: GRAY, whiteSpace: 'nowrap' }}>✓ Sent</span>
            ) : (
              <button onClick={() => { setComposeFor(composing ? null : c.user_id); setComposeText('') }} title="Send a prayer / message"
                style={{ fontSize: 12, fontWeight: 700, fontFamily: serif, color: composing ? '#fff' : GOLD, background: composing ? GOLD : '#FFF8E7', border: `1px solid ${GOLD}`, borderRadius: 16, padding: '4px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🙏 Pray
              </button>
            )}
          </div>

          {/* Compose — send this person a prayer/message straight to their inbox. */}
          {composing && !prayedFor.has(c.user_id) && (
            <div style={{ marginTop: 9 }}>
              <textarea
                autoFocus
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                maxLength={600}
                placeholder={`Write ${c.name.split(' ')[0]} a prayer or note — e.g. "Praying for you and your mom this week."`}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'Georgia, serif', color: DARK, background: '#fff', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <button onClick={() => prayForPartner(c.user_id, composeText)} disabled={sendingTo === c.user_id}
                  style={{ fontSize: 12, fontWeight: 700, fontFamily: serif, color: '#fff', background: GOLD, border: 'none', borderRadius: 20, padding: '6px 16px', cursor: 'pointer' }}>
                  {sendingTo === c.user_id ? 'Sending…' : 'Send 🙏'}
                </button>
                <button onClick={() => { setComposeFor(null); setComposeText('') }}
                  style={{ fontSize: 12, fontFamily: 'Georgia, serif', color: GRAY, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <span style={{ fontSize: 11.5, color: GRAY, marginLeft: 'auto', fontFamily: 'Georgia, serif' }}>Message optional</span>
              </div>
            </div>
          )}

          {/* Groups this partner is in, plus a menu to add/remove. Only for
              formal (accepted) connections — see canGroup. */}
          {canGroup(c) && (
            <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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

      {/* Show more — keep long lists short by default. */}
      {visiblePartners.length > partnerLimit && (
        <button onClick={() => setPartnerLimit(l => l + 25)}
          style={{ width: '100%', marginTop: 2, marginBottom: 6, padding: '9px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', color: GRAY, fontSize: 12.5, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>
          Show more ({visiblePartners.length - partnerLimit} more)
        </button>
      )}
      {q && visiblePartners.length === 0 && filteredPartners.length > 0 && (
        <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: '2px 0 12px' }}>No partners match “{partnerSearch}”.</p>
      )}

      {/* Empty states */}
      {connections.length === 0 && pending.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: `1px dashed var(--pb-border, #D4C5B0)`, borderRadius: 12, padding: '20px', textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 24, margin: '0 0 8px 0' }}>🙏</p>
          <p style={{ fontSize: 14, color: GRAY, margin: 0, lineHeight: 1.5 }}>Tap your band to someone else&rsquo;s phone to connect in prayer.</p>
        </div>
      ) : !q && visiblePartners.length === 0 && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {prayBtn(o.key, o.i_prayed, o.intercession_count, () => prayOther(o))}
              {o.source === 'network' && o.author_id && (
                <button onClick={() => mute(o.author_id!, o.author)} title={`Mute ${o.author}`} style={{ background: 'none', border: 'none', color: GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Mute</button>
              )}
            </div>

            {/* Reply privately to the requester (only if they opened replies). */}
            {o.source === 'network' && o.allow_comments && (
              o.i_replied ? (
                <div style={{ marginTop: 10, fontSize: 12, color: '#4A8A6A', fontFamily: 'Georgia, serif' }}>✓ Reply sent to {o.author}</div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <input
                    value={replyDraft[o.request_id] || ''}
                    onChange={e => setReplyDraft(prev => ({ ...prev, [o.request_id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') sendReply(o.request_id) }}
                    placeholder={`Reply privately to ${o.author}…`}
                    maxLength={1000}
                    style={{ flex: 1, minWidth: 0, padding: '8px 11px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, fontFamily: 'Georgia, serif', color: DARK, background: CREAM, outline: 'none' }}
                  />
                  <button onClick={() => sendReply(o.request_id)} disabled={replyBusy || !(replyDraft[o.request_id] || '').trim()} style={{ flexShrink: 0, background: (replyDraft[o.request_id] || '').trim() ? GOLD : BORDER, color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 700, cursor: (replyDraft[o.request_id] || '').trim() ? 'pointer' : 'default' }}>Send</button>
                </div>
              )
            )}
          </div>
        ))}

        {/* Muted people — private to you; unmute brings their prayers back. */}
        {muted.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: GRAY, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Muted · {muted.length}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {muted.map(m => (
                <button key={m.id} onClick={() => unmute(m.id)} title="Unmute" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '4px 10px', fontSize: 11.5, fontFamily: 'Georgia, serif', color: DARK, cursor: 'pointer' }}>
                  🔕 {m.name} <span style={{ color: GOLD, fontWeight: 700 }}>Unmute</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </>)}

      {/* ── My Requests ────────────────────────────────────────────────────── */}
      {showRequests && (
      <div style={{ marginTop: section === 'all' ? 20 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: DARK, margin: 0 }}>My Journal</h4>
          {!showForm && (
            <button onClick={() => { setEntryList(activeList); setShowForm(true) }} style={{ backgroundColor: GOLD, color: '#fff', border: 'none', borderRadius: 16, padding: '5px 12px', fontSize: 12, fontFamily: 'Georgia, serif', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
          )}
        </div>

        {/* Journal list filters — All + your named lists + create */}
        <div style={{ display: 'flex', gap: 6, marginBottom: activeList ? 8 : 12, flexWrap: 'wrap' }}>
          {chip(!activeList, `All · ${myRequests.length}`, () => setActiveList(null))}
          {lists.map(l => chip(activeList === l.id, `${l.name} · ${myRequests.filter(r => r.list_id === l.id).length}`, () => setActiveList(activeList === l.id ? null : l.id), CIRCLE))}
          {showNewList ? (
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value.slice(0, 60))}
                onKeyDown={async e => { if (e.key === 'Enter' && newListName.trim()) { const id = await createList(newListName.trim()); setNewListName(''); setShowNewList(false); if (id) setActiveList(id) } if (e.key === 'Escape') { setShowNewList(false); setNewListName('') } }}
                placeholder="List name" style={{ padding: '4px 10px', borderRadius: 16, border: `1px solid ${GOLD}`, fontSize: 11.5, fontFamily: 'Georgia, serif', outline: 'none', width: 100 }} />
              <button onClick={async () => { if (newListName.trim()) { const id = await createList(newListName.trim()); setNewListName(''); setShowNewList(false); if (id) setActiveList(id) } }} style={{ padding: '4px 10px', borderRadius: 16, border: 'none', background: GOLD, color: '#fff', fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: 700, cursor: 'pointer' }}>Add</button>
            </span>
          ) : (
            <button onClick={() => setShowNewList(true)} style={{ padding: '5px 11px', borderRadius: 16, border: `1px dashed ${BORDER}`, background: '#fff', color: GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer' }}>+ List</button>
          )}
        </div>
        {activeList && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: GRAY }}>Showing <strong style={{ color: DARK }}>{lists.find(l => l.id === activeList)?.name}</strong></span>
            <button onClick={() => deleteList(activeList)} style={{ background: 'none', border: 'none', color: '#B4441F', fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: 0 }}>Delete list</button>
          </div>
        )}

        {showForm && (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What would you like prayer for?" rows={3} maxLength={400} autoFocus style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />

            <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Who is this for?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AUDIENCES.map(a => {
                const active = audience === a.id
                return (
                  <button key={a.id} onClick={() => setAudience(a.id)} title={a.hint} style={{ flex: '1 1 30%', minWidth: 96, padding: '9px 8px', borderRadius: 8, border: `1px solid ${active ? GOLD : BORDER}`, background: active ? '#FFF8E7' : '#fff', color: active ? GOLD : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center' }}>
                    {a.label}
                  </button>
                )
              })}
              {/* Partner groups collapse into a single dropdown so the picker
                  stays three simple choices no matter how many groups exist. */}
              {groups.length > 0 && (() => {
                const active = audience.startsWith('group:')
                return (
                  <select
                    value={active ? audience : ''}
                    onChange={e => { if (e.target.value) setAudience(e.target.value) }}
                    title="Share with a specific group"
                    style={{ flex: '1 1 30%', minWidth: 110, padding: '9px 8px', borderRadius: 8, border: `1px solid ${active ? CIRCLE : BORDER}`, background: active ? 'rgba(46,125,138,0.10)' : '#fff', color: active ? CIRCLE : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'center', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="">🏷️ My Groups…</option>
                    {groups.map(g => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
                  </select>
                )
              })()}
            </div>
            <p style={{ fontSize: 11, color: GRAY, margin: '6px 2px 0', fontStyle: 'italic' }}>{audienceHint(audience)}</p>

            {/* Leave someone out — for a request that's personal to a partner. */}
            {audience === 'network' && (() => {
              const seen = new Set<string>()
              const partners = connections.filter(c => c.user_id && !seen.has(c.user_id) && seen.add(c.user_id))
              if (partners.length === 0) return null
              return (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => setShowExclude(v => !v)} style={{ background: 'none', border: 'none', color: excluded.length ? CIRCLE : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    {excluded.length ? `Everyone except ${excluded.length} ${excluded.length === 1 ? 'person' : 'people'}` : 'Everyone — or leave someone out'} {showExclude ? '▴' : '▾'}
                  </button>
                  {showExclude && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 190, overflowY: 'auto' }}>
                      {partners.map(c => {
                        const isExcl = excluded.includes(c.user_id)
                        return (
                          <button key={c.user_id} onClick={() => toggleExclude(c.user_id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, border: `1px solid ${isExcl ? BORDER : GOLD}`, background: isExcl ? '#F5F0E6' : '#FFF8E7', opacity: isExcl ? 0.6 : 1, cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isExcl ? BORDER : GOLD}`, background: isExcl ? 'transparent' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, lineHeight: 1 }}>{isExcl ? '' : '✓'}</span>
                            <span style={{ fontSize: 13, fontFamily: 'Georgia, serif', color: DARK }}>{c.name}</span>
                            {isExcl && <span style={{ marginLeft: 'auto', fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>left out</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {lists.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>File into a list <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setEntryList(null)} style={{ padding: '6px 12px', borderRadius: 16, border: `1px solid ${!entryList ? DARK : BORDER}`, background: !entryList ? '#F5F0E6' : '#fff', color: !entryList ? DARK : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: !entryList ? 700 : 400, cursor: 'pointer' }}>None</button>
                  {lists.map(l => {
                    const active = entryList === l.id
                    return <button key={l.id} onClick={() => setEntryList(l.id)} style={{ padding: '6px 12px', borderRadius: 16, border: `1px solid ${active ? CIRCLE : BORDER}`, background: active ? 'rgba(46,125,138,0.10)' : '#fff', color: active ? CIRCLE : GRAY, fontSize: 11.5, fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, cursor: 'pointer' }}>{l.name}</button>
                  })}
                </div>
              </>
            )}

            {audience !== 'private' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={allowReplies} onChange={e => setAllowReplies(e.target.checked)} style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: GRAY, fontFamily: 'Georgia, serif' }}>Let people reply privately to me</span>
              </label>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setShowForm(false); setText(''); setAudience('private'); setAllowReplies(false); setAnonymity('first_initial') }} style={{ flex: 1, backgroundColor: 'transparent', border: `1px solid var(--pb-border, #D4C5B0)`, borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
              <button onClick={shareRequest} disabled={!text.trim() || submitting} style={{ flex: 2, backgroundColor: text.trim() ? GOLD : 'var(--pb-border, #D4C5B0)', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: text.trim() ? 'pointer' : 'default' }}>{submitting ? (audience === 'private' ? 'Saving...' : 'Sharing...') : (audience === 'private' ? 'Add to Journal' : 'Share Request')}</button>
            </div>
          </div>
        )}

        {myRequests.length === 0 && !showForm && (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>Your journal is empty. Add a prayer — it stays private to you unless you choose to share it.</p>
        )}

        {myRequests.filter(r => !activeList || r.list_id === activeList).map(r => (
          <div key={r.id} style={{ backgroundColor: r.is_answered ? '#F5F5F0' : '#fff', border: `1px solid ${r.is_answered ? '#D4D0C8' : BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, opacity: r.is_answered ? 0.85 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              {r.is_answered && <span style={{ fontSize: 11, fontWeight: 600, color: '#7BAE8E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Answered</span>}
              {r.audience && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: GRAY, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>{audienceLabel(r.audience)}</span>}
              {r.list_id && lists.find(l => l.id === r.list_id) && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: CIRCLE, background: 'rgba(46,125,138,0.10)', border: `1px solid ${CIRCLE}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>{lists.find(l => l.id === r.list_id)?.name}</span>}
            </div>
            <p style={{ fontSize: 14, color: DARK, lineHeight: 1.5, margin: '0 0 10px 0', fontStyle: 'italic' }}>&ldquo;{r.request_text}&rdquo;</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: GRAY }}>🙏 {r.intercession_count} {r.intercession_count === 1 ? 'person praying' : 'praying'}</span>
              <button onClick={() => markAnswered(r.id, !r.is_answered)} style={{ background: 'none', border: 'none', fontSize: 12, color: r.is_answered ? GRAY : '#7BAE8E', cursor: 'pointer', padding: 0 }}>
                {r.is_answered ? 'Reopen' : 'Mark Answered ✓'}
              </button>
            </div>

            {/* Private replies you've received on this prayer (only you see these). */}
            {r.allow_comments && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                <button onClick={() => toggleReplies(r.id)} style={{ background: 'none', border: 'none', color: CIRCLE, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  💬 {r.reply_count ?? 0} {(r.reply_count ?? 0) === 1 ? 'reply' : 'replies'}{openReplyId === r.id ? ' ▴' : ' ▾'}
                </button>
                {openReplyId === r.id && (
                  <div style={{ marginTop: 8 }}>
                    {(repliesFor[r.id] ?? []).length === 0 ? (
                      <p style={{ fontSize: 12, color: GRAY, fontStyle: 'italic', margin: 0 }}>No replies yet.</p>
                    ) : (repliesFor[r.id] ?? []).map(c => (
                      <div key={c.id} style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: DARK, fontFamily: serif }}>{c.author}</span>
                        <p style={{ fontSize: 13, color: DARK, margin: '2px 0 0', lineHeight: 1.5 }}>{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
