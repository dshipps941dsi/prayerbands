'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import AvatarBadge from './AvatarBadge'
import { getDailyVerse } from '@/lib/verses'
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
  // A journal entry is a prayer (the only kind that can be shared), a note, or
  // a saved verse; updates are dated follow-ups written under it.
  kind?: EntryKind
  verse_ref?: string | null
  updates?: JournalUpdate[]
}
type EntryKind = 'prayer' | 'note' | 'verse'
interface JournalUpdate { id: string; body: string; kind: 'update' | 'answered'; created_at: string }
const ENTRY_KINDS: { id: EntryKind; label: string; glyph: string; color: string; placeholder: string }[] = [
  { id: 'prayer', label: 'Prayer', glyph: '🙏', color: 'var(--pb-primary, #B8860B)', placeholder: 'What are you praying for?' },
  { id: 'note', label: 'Note', glyph: '📝', color: '#8B7355', placeholder: 'A thought, a thank-you, something God showed you today…' },
  { id: 'verse', label: 'Verse', glyph: '📖', color: '#2E7D8A', placeholder: 'The verse, and anything it stirred in you' },
]
// Journal entry actions read as small outlined buttons, not links.
const pill = (color: string, filled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 20,
  border: `1px solid ${color}`, background: filled ? color : `color-mix(in srgb, ${color} 8%, #fff)`,
  color: filled ? '#fff' : color, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 600,
  cursor: 'pointer', lineHeight: 1, whiteSpace: 'nowrap',
})
const kindOf = (r: { kind?: EntryKind }) => ENTRY_KINDS.find(k => k.id === (r.kind ?? 'prayer')) ?? ENTRY_KINDS[0]

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
  { id: 'private', label: '📔 Just me', hint: 'Stays in your journal. Only you can see it, and no one is notified.' },
  { id: 'network', label: '🙏 All my partners', hint: 'Everyone you’re connected with sees it and can pray.' },
]
// Full label map is kept so older posts (direct / lineage / wall) still render.
const AUD_LABEL: Record<Audience, string> = { private: 'Just me', network: 'All partners', direct: 'Direct', lineage: 'Lineage', wall: 'Wall' }

export default function NetworkSection({ userId, section = 'all' }: { userId: string; section?: 'all' | 'partners' | 'requests' }) {
  const router = useRouter()
  const showPartners = section === 'all' || section === 'partners'
  const showRequests = section === 'all' || section === 'requests'
  // The viewer's own band code, shown so a partner can enter it to connect.
  const [myCode, setMyCode] = useState<string | null>(null)
  const [partnerCode, setPartnerCode] = useState('')
  // "Connect a prayer partner" chooser: tap bands, share/enter a code, or scan a QR.
  const [connectMode, setConnectMode] = useState<'tap' | 'code' | 'scan'>('tap')
  // The chooser is folded away once someone already has partners; a first-timer
  // sees it open because it is the only thing on the page to do.
  const [connectOpen, setConnectOpen] = useState<boolean | null>(null)
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
  const [partnerSort, setPartnerSort] = useState<'az' | 'recent'>('az')
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
  const [entryKind, setEntryKind] = useState<EntryKind>('prayer')
  const [verseRef, setVerseRef] = useState('')
  // In-place edit of an entry, and the "+ Update" / "Mark answered" box under one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editRef, setEditRef] = useState('')
  const [updateFor, setUpdateFor] = useState<string | null>(null)
  const [updateDraft, setUpdateDraft] = useState('')
  const [updateAnswering, setUpdateAnswering] = useState(false)
  const [updateBusy, setUpdateBusy] = useState(false)
  const [excluded, setExcluded] = useState<string[]>([])   // partners left out of a "My Partners" share
  const [prayedFor, setPrayedFor] = useState<Set<string>>(new Set())  // partners you've told "I prayed for you"
  // The prayer chain: everything you've sent and everything that came back,
  // plus the last time you prayed for each partner (shown beside their name).
  type ChainItem = { id: string; user_id: string; name: string; avatar?: AvatarSpec; note: string; at: string }
  const [chain, setChain] = useState<{ sent: ChainItem[]; received: ChainItem[]; lastSentByUser: Record<string, string> }>({ sent: [], received: [], lastSentByUser: {} })
  const [chainOpen, setChainOpen] = useState(false)
  const [chainTab, setChainTab] = useState<'sent' | 'received'>('sent')
  async function loadChain() {
    try {
      const r = await fetch('/api/network/prayer-chain')
      if (r.ok) { const d = await r.json(); setChain({ sent: d.sent ?? [], received: d.received ?? [], lastSentByUser: d.lastSentByUser ?? {} }) }
    } catch {}
  }
  const timeAgo = (iso: string) => {
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    if (s < 86400 * 14) return `${Math.floor(s / 86400)}d ago`
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
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

  // Loads overlap: the first load, and a reload after every action. A slower
  // earlier load must not overwrite the newer picture (an accepted request
  // reappearing as pending). Only the latest load may set state.
  const loadSeq = useRef(0)
  async function load() {
    const seq = ++loadSeq.current
    const [netRes, circleRes, bandsRes, groupsRes, listsRes] = await Promise.all([
      fetch('/api/network/my-network'),
      showPartners ? fetch('/api/circles/open-requests') : Promise.resolve(null),
      showPartners ? fetch('/api/my-bands') : Promise.resolve(null),
      (showPartners || showRequests) ? fetch('/api/network/groups') : Promise.resolve(null),
      showRequests ? fetch('/api/network/lists') : Promise.resolve(null),
      showPartners ? loadChain() : Promise.resolve(null),
    ])
    if (seq !== loadSeq.current) return
    if (netRes.ok) {
      const d = await netRes.json()
      if (seq !== loadSeq.current) return
      setConnections([...(d.connections ?? []), ...(d.lineage_partners ?? [])])
      setPending(d.pending_requests ?? [])
      setMyRequests(d.my_requests ?? [])
      setOthersReqs(d.others_requests ?? [])
      setMuted(d.muted ?? [])
      setMyConnectCode(d.my_connect_code ?? null)
    }
    if (bandsRes && bandsRes.ok) {
      const d = await bandsRes.json()
      if (seq !== loadSeq.current) return
      // Any band the viewer holds works as their connect code — someone
      // entering it lands on that band and connects to its holder (them).
      const first = (d.bands ?? [])[0]
      setMyCode(first?.band_id ?? null)
    }
    if (circleRes && circleRes.ok) {
      const d = await circleRes.json()
      if (seq !== loadSeq.current) return
      setCircleRequests(d.requests ?? [])
    }
    if (groupsRes && groupsRes.ok) {
      const d = await groupsRes.json()
      if (seq !== loadSeq.current) return
      setGroups(d.groups ?? [])
    }
    if (listsRes && listsRes.ok) {
      const d = await listsRes.json()
      if (seq !== loadSeq.current) return
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
        body: JSON.stringify({ request_text: text.trim(), audience, anonymity, list_id: entryList, allow_comments: allowReplies && audience !== 'private', excluded_user_ids: audience === 'network' ? excluded : [], kind: entryKind, verse_ref: entryKind === 'verse' ? verseRef.trim() : undefined }),
      })
      if (res.ok) {
        const d = await res.json()
        setMyRequests(prev => [{ ...d.request, intercession_count: 0, i_prayed: false, updates: [] }, ...prev])
        setText('')
        setVerseRef('')
        setEntryKind('prayer')
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
      const d = await res.json()
      setMyRequests(prev => prev.map(r => (r.id === requestId ? { ...r, is_answered: isAnswered, answered_at: d.request?.answered_at ?? (isAnswered ? new Date().toISOString() : null) } : r)))
    }
  }

  // ── Journal: updates, edits, removal ─────────────────────────────────────
  function openUpdate(id: string, answering: boolean) {
    setUpdateFor(id); setUpdateDraft(''); setUpdateAnswering(answering); setEditingId(null)
  }
  async function submitUpdate(r: NetworkRequest) {
    const body = updateDraft.trim()
    if (!updateAnswering && !body) return
    setUpdateBusy(true)
    try {
      if (updateAnswering) await markAnswered(r.id, true)
      if (body) {
        const res = await fetch('/api/network/journal-update', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entry_id: r.id, body, kind: updateAnswering ? 'answered' : 'update' }),
        })
        if (res.ok) {
          const d = await res.json()
          setMyRequests(prev => prev.map(x => x.id === r.id ? { ...x, updates: [...(x.updates ?? []), d.update] } : x))
        }
      }
      setUpdateFor(null); setUpdateDraft(''); setUpdateAnswering(false)
    } finally {
      setUpdateBusy(false)
    }
  }
  async function deleteUpdate(entryId: string, id: string) {
    setMyRequests(prev => prev.map(x => x.id === entryId ? { ...x, updates: (x.updates ?? []).filter(u => u.id !== id) } : x))
    await fetch(`/api/network/journal-update?id=${id}`, { method: 'DELETE' })
  }
  function startEdit(r: NetworkRequest) {
    setEditingId(r.id); setEditText(r.request_text); setEditRef(r.verse_ref ?? ''); setUpdateFor(null)
  }
  async function saveEdit(r: NetworkRequest) {
    const t = editText.trim()
    if (!t) return
    const isVerse = (r.kind ?? 'prayer') === 'verse'
    const res = await fetch('/api/network/prayer-request', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: r.id, request_text: t, ...(isVerse ? { verse_ref: editRef } : {}) }),
    })
    if (res.ok) {
      setMyRequests(prev => prev.map(x => x.id === r.id ? { ...x, request_text: t, verse_ref: isVerse ? (editRef.trim() || null) : x.verse_ref } : x))
      setEditingId(null)
    }
  }
  async function deleteEntry(id: string) {
    if (!window.confirm('Remove this entry from your journal? Its updates go with it.')) return
    setMyRequests(prev => prev.filter(x => x.id !== id))
    await fetch(`/api/network/prayer-request?request_id=${id}`, { method: 'DELETE' })
  }
  // Date headings and time stamps that read like a journal, not a log.
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const dayLabel = (iso: string) => {
    const d = new Date(iso), today = new Date(), yest = new Date(); yest.setDate(today.getDate() - 1)
    const full = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) })
    return sameDay(d, today) ? `Today · ${full}` : sameDay(d, yest) ? `Yesterday · ${full}` : full
  }
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const stamp = (iso: string) => `${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${clock(iso)}`

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
    loadChain()
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
  const searchedPartners = q ? filteredPartners.filter(c => c.name.toLowerCase().includes(q)) : filteredPartners
  const visiblePartners = [...searchedPartners].sort((a, b) =>
    partnerSort === 'az'
      ? a.name.localeCompare(b.name)
      // Most recent connection first; lineage/downline (no date) fall to the end, then A–Z.
      : (b.since ? Date.parse(b.since) : 0) - (a.since ? Date.parse(a.since) : 0) || a.name.localeCompare(b.name)
  )
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
      {/* Connect a prayer partner — three ways, one clean chooser:
          Tap  — hold your band to their phone (the NFC path; their phone opens
                 your band and shows "Add to Prayer Partners").
          Code — share your code, or enter theirs to jump to their band page.
          Scan — show a QR to your permanent connect link. */}
      {(() => {
        const isOpen = connectOpen ?? connections.length === 0
        return (
      <div style={{ backgroundColor: '#fff', border: `1px solid ${GOLD}`, borderRadius: 12, padding: isOpen ? '14px 16px 16px' : 8, marginBottom: 16 }}>
        <style>{`
          .pb-connect-cta { transition: background-color 0.15s, transform 0.1s; }
          .pb-connect-cta:hover { background-color: #d4b77c !important; }
          .pb-connect-cta:active { transform: scale(0.985); }
          .pb-connect-cta:focus-visible { outline: 2px solid #15223B; outline-offset: 2px; }
        `}</style>
        {isOpen ? (
          /* Open: the gold band is a section header that also closes the card. */
          <button type="button" onClick={() => setConnectOpen(false)} aria-expanded
            style={{ display: 'block', width: 'calc(100% + 32px)', margin: '-14px -16px 14px', padding: '11px 16px', background: GOLD, color: 'var(--pb-text-on-primary, #0f0d09)', border: 'none', borderRadius: '11px 11px 0 0', cursor: 'pointer', fontFamily: serif, textAlign: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Connect a prayer partner via</span>
              <span aria-hidden="true" style={{ fontSize: 11, display: 'inline-block', transform: 'rotate(180deg)' }}>▼</span>
            </span>
          </button>
        ) : (
          /* Closed: a pill inset inside the card, with a plus badge on the left
             and a chevron badge on the right. Shape and the badges do the work
             a bevel would — a full-width band reads as a heading, this reads as
             something to press. */
          <button type="button" className="pb-connect-cta" onClick={() => setConnectOpen(true)} aria-expanded={false}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 10px 9px 9px', background: GOLD, color: 'var(--pb-text-on-primary, #0f0d09)', border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: serif, textAlign: 'left' }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.92)', color: '#15223B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Add a prayer partner</span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 500, opacity: 0.85, marginTop: 2, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tap phones &middot; share a code &middot; scan a QR</span>
            </span>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 14, border: '1.5px solid rgba(15,13,9,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>▼</span>
          </button>
        )}

        {isOpen && <>
        <div style={{ display: 'flex', gap: 4, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, marginBottom: 14 }}>
          {([['tap', '📱', 'Tap'], ['code', '🔢', 'Code'], ['scan', '▦', 'Scan']] as const).map(([id, ic, lbl]) => {
            const on = connectMode === id
            return (
              <button key={id} onClick={() => setConnectMode(id)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: serif, fontWeight: on ? 700 : 500, background: on ? '#fff' : 'transparent', color: on ? DARK : GRAY, boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {id === 'scan' ? (
                  // A real QR glyph — three finder squares + modules — reads as
                  // "scan" at a glance where the old grid tile just looked like a grid.
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm1 1h2v2H6V6zM13 3h8v8h-8V3zm2 2v4h4V5h-4zm1 1h2v2h-2V6zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm1 1h2v2H6v-2zM13 13h2v2h-2v-2zm4 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2-2h2v4h-2v-4z" />
                  </svg>
                ) : (
                  <span aria-hidden="true" style={{ fontSize: 13 }}>{ic}</span>
                )}{lbl}
              </button>
            )
          })}
        </div>

        {connectMode === 'tap' && (
          <div style={{ textAlign: 'center', padding: '4px 4px 2px' }}>
            <div style={{ fontFamily: serif, fontSize: 15.5, fontWeight: 700, color: DARK, marginBottom: 6 }}>Hold your band to their phone</div>
            <p style={{ fontSize: 13.5, color: GRAY, lineHeight: 1.55, margin: '0 auto 12px', maxWidth: 360 }}>
              Their phone opens your band. They tap <strong style={{ color: DARK }}>Add to Prayer Partners</strong>, you accept, and you&rsquo;re connected. Either of you can start it.
            </p>
            <p style={{ fontSize: 11.5, color: GRAY, margin: 0, fontStyle: 'italic' }}>iPhone: top of the phone &middot; Android: middle of the back</p>
          </div>
        )}

        {connectMode === 'code' && (
          <div>
            {myCode && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: GRAY, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your code</div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: DARK, fontFamily: 'monospace' }}>{myCode}</div>
                </div>
                <button onClick={sharePartnerConnect}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, background: GOLD, border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: serif, color: '#fff', cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {codeShared ? 'Copied' : 'Share'}
                </button>
              </div>
            )}
            <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>Or enter their band code:</div>
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
                style={{ flexShrink: 0, backgroundColor: normalizeBandCode(partnerCode).length >= 5 ? GOLD : BORDER, color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: 13, fontFamily: serif, fontWeight: 600, cursor: normalizeBandCode(partnerCode).length >= 5 ? 'pointer' : 'default' }}>
                Connect
              </button>
            </div>
            <p style={{ fontSize: 11, color: GRAY, margin: '8px 2px 0', fontStyle: 'italic' }}>The code is printed on every band. You&rsquo;ll land on their page, then tap &ldquo;Add to Prayer Partners.&rdquo;</p>
          </div>
        )}

        {connectMode === 'scan' && (
          myConnectCode ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'}/connect/${myConnectCode}`} size={168} bgColor="#ffffff" fgColor="#15223B" level="M" />
              </div>
              <p style={{ fontSize: 12.5, color: GRAY, margin: '10px 6px 0', lineHeight: 1.5, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
                They point their camera here to connect with you. It always reaches your account &mdash; great for a group, a screen, or a printed card.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: GRAY, margin: 0, fontStyle: 'italic', textAlign: 'center' }}>Your connect code is loading&hellip;</p>
          )
        )}
        </>}
      </div>
        )
      })()}

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
          {/* All / Partners / Lineage moved into the controls row below (beside
              A–Z / Recent) so filter + sort live in one place; groups stay here. */}
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

      {/* Controls row — filter (All / Partners / Lineage) + sort (A–Z / Recent)
          always shown; the name search only once the list is long enough. */}
      {connections.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {connections.length > 8 && (
            <input
              value={partnerSearch}
              onChange={e => { setPartnerSearch(e.target.value); setPartnerLimit(15) }}
              placeholder={`Search ${filteredPartners.length} partners by name…`}
              style={{ flex: '1 1 160px', minWidth: 160, boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13.5, fontFamily: 'Georgia, serif', color: DARK, background: '#fff', outline: 'none' }}
            />
          )}
          <div style={{ display: 'flex', gap: 4, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
            {([['all', 'All'], ['direct', `Partners · ${directCount}`], ['lineage', `Lineage · ${lineageCount}`]] as const).map(([id, lbl]) => {
              const on = partnerFilter === id && !activeGroup
              return (
                <button key={id} onClick={() => { setActiveGroup(null); setPartnerFilter(id); setPartnerLimit(15) }}
                  style={{ padding: '6px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: on ? 700 : 400, background: on ? '#fff' : 'transparent', color: on ? (id === 'lineage' ? LINEAGE : DARK) : GRAY, boxShadow: on ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>
                  {lbl}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
            {([['az', 'A–Z'], ['recent', 'Recent']] as const).map(([id, lbl]) => (
              <button key={id} onClick={() => setPartnerSort(id)}
                style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: partnerSort === id ? 700 : 400, background: partnerSort === id ? '#fff' : 'transparent', color: partnerSort === id ? DARK : GRAY, boxShadow: partnerSort === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Partner people — one compact row each; the message box and group tools
          expand inline only when opened, so a big list stays scannable. */}
      {pagedPartners.map(c => {
        const inGroups = groupsForMember(c.user_id)
        const menuOpen = groupMenuFor === c.user_id
        const composing = composeFor === c.user_id
        // "Sent" holds for 12h (the server's dedupe window); after that the
        // button comes back with the last time shown beside it.
        const lastSent = chain.lastSentByUser[c.user_id]
        const sentRecently = prayedFor.has(c.user_id) || (!!lastSent && Date.now() - Date.parse(lastSent) < 12 * 3600 * 1000)
        return (
        <div key={c.connection_id ?? `lin-${c.user_id}`} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '9px 12px', marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AvatarBadge {...(c.avatar || {})} name={c.name} size={30} />
            <p style={{ fontFamily: serif, fontSize: 14.5, fontWeight: 700, color: DARK, margin: 0, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
            {relationBadge(relationOf(c))}
            {sentRecently ? (
              <span title={`Sent to ${c.name.split(' ')[0]}`} style={{ fontSize: 12, fontWeight: 700, fontFamily: serif, color: GRAY, whiteSpace: 'nowrap' }}>✓ Sent{lastSent ? ` ${timeAgo(lastSent)}` : ''}</span>
            ) : (<>
              {lastSent && <span title="Last time you prayed for them" style={{ fontSize: 11, fontFamily: serif, color: GRAY, whiteSpace: 'nowrap' }}>🙏 {timeAgo(lastSent)}</span>}
              <button onClick={() => { setComposeFor(composing ? null : c.user_id); setComposeText('') }} title="Send a prayer / message"
                style={{ fontSize: 12, fontWeight: 700, fontFamily: serif, color: composing ? '#fff' : GOLD, background: composing ? GOLD : '#FFF8E7', border: `1px solid ${GOLD}`, borderRadius: 16, padding: '4px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🙏 Pray
              </button>
            </>)}
          </div>

          {/* Compose — send this person a prayer/message straight to their inbox. */}
          {composing && !sentRecently && (
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

      {/* Prayer chain — your side of "I prayed for you": what you've sent and
          what has come back, newest first. Folded by default; the header
          carries the counts so it earns a tap. */}
      {(chain.sent.length > 0 || chain.received.length > 0) && (
        <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, marginTop: 10, marginBottom: 12, overflow: 'hidden' }}>
          <button type="button" onClick={() => setChainOpen(o => !o)} aria-expanded={chainOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>🙏</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: serif, fontSize: 14.5, fontWeight: 700, color: DARK }}>Prayer chain</span>
              <span style={{ display: 'block', fontSize: 12, color: GRAY, fontFamily: 'Georgia, serif', marginTop: 1 }}>
                {chain.sent.length} sent &middot; {chain.received.length} received
                {chain.sent[0] && <> &middot; last sent {timeAgo(chain.sent[0].at)}</>}
              </span>
            </span>
            <span aria-hidden="true" style={{ fontSize: 10, color: GRAY, display: 'inline-block', transform: chainOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </button>
          {chainOpen && (
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: '10px 14px 12px' }}>
              <div style={{ display: 'flex', gap: 4, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, marginBottom: 10 }}>
                {([['sent', `Sent · ${chain.sent.length}`], ['received', `Received · ${chain.received.length}`]] as const).map(([id, lbl]) => (
                  <button key={id} onClick={() => setChainTab(id)}
                    style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: serif, fontWeight: chainTab === id ? 700 : 500, background: chainTab === id ? '#fff' : 'transparent', color: chainTab === id ? DARK : GRAY, boxShadow: chainTab === id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {(chainTab === 'sent' ? chain.sent : chain.received).length === 0 ? (
                <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: '4px 0' }}>
                  {chainTab === 'sent' ? 'Nothing sent yet — tap 🙏 Pray beside a partner.' : 'No one has sent you one yet.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(chainTab === 'sent' ? chain.sent : chain.received).slice(0, 30).map(it => (
                    <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <AvatarBadge {...(it.avatar || {})} name={it.name} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                          <span style={{ fontFamily: serif, fontSize: 13.5, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chainTab === 'sent' ? <>You prayed for {it.name}</> : <>{it.name} prayed for you</>}
                          </span>
                          <span style={{ fontSize: 11, color: GRAY, fontFamily: 'Georgia, serif', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(it.at)}</span>
                        </div>
                        {it.note && <div style={{ fontSize: 12.5, color: DARK, fontStyle: 'italic', fontFamily: serif, marginTop: 1, lineHeight: 1.4 }}>&ldquo;{it.note}&rdquo;</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
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
            <button onClick={() => { setEntryList(activeList); setShowForm(true) }} style={{ backgroundColor: GOLD, color: 'var(--pb-text-on-primary, #fff)', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Write</button>
          )}
        </div>

        {/* Lists: a picker when there are any, and a way to make one. The
            chips read as more buttons next to Add; a labelled dropdown and a
            single "+ List" do not. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {lists.length > 0 && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: GRAY, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              List
              <select value={activeList ?? ''} onChange={e => setActiveList(e.target.value || null)}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontFamily: 'Georgia, serif', textTransform: 'none', letterSpacing: 0, maxWidth: 220 }}>
                <option value="">All prayers ({myRequests.length})</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({myRequests.filter(r => r.list_id === l.id).length})</option>)}
              </select>
            </label>
          )}
          {showNewList ? (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value.slice(0, 60))}
                onKeyDown={async e => { if (e.key === 'Enter' && newListName.trim()) { const id = await createList(newListName.trim()); setNewListName(''); setShowNewList(false); if (id) setActiveList(id) } if (e.key === 'Escape') { setShowNewList(false); setNewListName('') } }}
                placeholder="Name the list (e.g. Family)" style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${GOLD}`, fontSize: 13, fontFamily: 'Georgia, serif', outline: 'none', width: 170 }} />
              <button onClick={async () => { if (newListName.trim()) { const id = await createList(newListName.trim()); setNewListName(''); setShowNewList(false); if (id) setActiveList(id) } }} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: GOLD, color: 'var(--pb-text-on-primary, #fff)', fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setShowNewList(false); setNewListName('') }} style={{ background: 'none', border: 'none', color: GRAY, fontSize: 12, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: '4px 2px' }}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setShowNewList(true)} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: GRAY, fontSize: 11, fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>+ List</button>
          )}
          {activeList && (
            <button onClick={() => deleteList(activeList)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#B4441F', fontSize: 11.5, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: 0 }}>Delete this list</button>
          )}
        </div>

        {showForm && (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
            {/* What kind of entry: only a prayer can be shared; notes and verses
                stay in the journal, so the audience row appears for prayers alone. */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {ENTRY_KINDS.map(k => {
                const active = entryKind === k.id
                return (
                  <button key={k.id} onClick={() => { setEntryKind(k.id); if (k.id !== 'prayer') { setAudience('private'); setAllowReplies(false) } }} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${active ? k.color : BORDER}`, background: active ? `color-mix(in srgb, ${k.color} 12%, #fff)` : '#fff', color: active ? k.color : GRAY, fontSize: 12.5, fontFamily: 'Georgia, serif', fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
                    {k.glyph} {k.label}
                  </button>
                )
              })}
            </div>
            {entryKind === 'verse' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={verseRef} onChange={e => setVerseRef(e.target.value.slice(0, 80))} placeholder="Reference (e.g. Psalm 46:1)" style={{ flex: 1, padding: '9px 12px', fontSize: 13.5, fontFamily: serif, fontWeight: 700, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => { const v = getDailyVerse(); setVerseRef(v.ref); setText(v.text) }} title="Fill in today’s verse" style={{ padding: '9px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: '#2E7D8A', fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Today’s verse</button>
              </div>
            )}
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={kindOf({ kind: entryKind }).placeholder} rows={entryKind === 'prayer' ? 3 : 4} maxLength={entryKind === 'prayer' ? 400 : 2000} autoFocus style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />

            {entryKind === 'prayer' && (<>
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
                const name = active ? groupName(audience.slice(6)) : ''
                return (
                  <label title="Share with one of your groups" style={{ position: 'relative', flex: '1 1 30%', minWidth: 96, display: 'block' }}>
                    <span style={{ display: 'block', padding: '9px 8px', borderRadius: 8, border: `1px solid ${active ? CIRCLE : BORDER}`, background: active ? 'rgba(46,125,138,0.10)' : '#fff', color: active ? CIRCLE : GRAY, fontSize: 12, fontFamily: 'Georgia, serif', fontWeight: active ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      🏷️ {active ? name : 'One group'}
                    </span>
                    <select
                      value={active ? audience : ''}
                      onChange={e => { if (e.target.value) setAudience(e.target.value) }}
                      aria-label="Share with one of your groups"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    >
                      <option value="">Choose a group…</option>
                      {groups.map(g => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
                    </select>
                  </label>
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

            </>)}

            {lists.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: GRAY, margin: '12px 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>File into a list <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
                <select value={entryList ?? ''} onChange={e => setEntryList(e.target.value || null)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', color: DARK, fontSize: 13, fontFamily: 'Georgia, serif', maxWidth: 260 }}>
                  <option value="">No list</option>
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </>
            )}

            {audience !== 'private' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={allowReplies} onChange={e => setAllowReplies(e.target.checked)} style={{ width: 15, height: 15, accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: GRAY, fontFamily: 'Georgia, serif' }}>Let people reply privately to me</span>
              </label>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setShowForm(false); setText(''); setVerseRef(''); setEntryKind('prayer'); setAudience('private'); setAllowReplies(false); setAnonymity('first_initial') }} style={{ flex: 1, backgroundColor: 'transparent', border: `1px solid var(--pb-border, #D4C5B0)`, borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
              <button onClick={shareRequest} disabled={!text.trim() || submitting} style={{ flex: 2, backgroundColor: text.trim() ? GOLD : 'var(--pb-border, #D4C5B0)', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: text.trim() ? 'pointer' : 'default' }}>{submitting ? (audience === 'private' ? 'Saving...' : 'Sharing...') : entryKind === 'note' ? 'Save note' : entryKind === 'verse' ? 'Save verse' : audience === 'private' ? 'Add to Journal' : 'Share Request'}</button>
            </div>
          </div>
        )}

        {myRequests.length === 0 && !showForm && (
          <p style={{ fontSize: 13, color: GRAY, fontStyle: 'italic', margin: 0 }}>Your journal is empty. Write a prayer, jot a note, or save a verse — it stays private to you unless you choose to share a prayer.</p>
        )}

        {(() => {
          // Group by day, newest first, so the page reads like a journal.
          const shown = myRequests.filter(r => !activeList || r.list_id === activeList)
          const days: { key: string; label: string; items: NetworkRequest[] }[] = []
          for (const r of shown) {
            const key = new Date(r.created_at).toDateString()
            let d = days[days.length - 1]
            if (!d || d.key !== key) { d = { key, label: dayLabel(r.created_at), items: [] }; days.push(d) }
            d.items.push(r)
          }
          return days.map(d => (
            <div key={d.key} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 8px' }}>
                <span style={{ fontFamily: serif, fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{d.label}</span>
                <span style={{ flex: 1, height: 1, background: BORDER }} />
              </div>
              {d.items.map(r => {
                const k = kindOf(r)
                const isPrayer = k.id === 'prayer'
                const editing = editingId === r.id
                const listName = r.list_id ? lists.find(l => l.id === r.list_id)?.name : null
                return (
                  <div key={r.id} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderLeft: `3px solid ${r.is_answered ? '#7BAE8E' : k.color}`, borderRadius: 10, padding: '12px 14px 12px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: k.color, fontWeight: 700, fontFamily: serif }}>{k.glyph} {k.label}</span>
                      <span style={{ fontSize: 11.5, color: GRAY }}>{clock(r.created_at)}</span>
                      {r.is_answered && <span style={{ fontSize: 10, fontWeight: 700, color: '#5E9A72', letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(123,174,142,0.14)', border: '1px solid #7BAE8E', borderRadius: 20, padding: '2px 8px' }}>✓ Answered{r.answered_at ? ` · ${new Date(r.answered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</span>}
                      {isPrayer && r.audience && r.audience !== 'private' && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: GRAY, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>Shared · {audienceLabel(r.audience)}</span>}
                      {listName && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: CIRCLE, background: 'rgba(46,125,138,0.10)', border: `1px solid ${CIRCLE}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Georgia, serif' }}>{listName}</span>}
                      {!editing && (
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                          <button onClick={() => startEdit(r)} style={{ ...pill(GRAY), padding: '5px 10px', fontSize: 11.5 }}>✎ Edit</button>
                          <button onClick={() => deleteEntry(r.id)} title="Remove this entry" style={{ ...pill(GRAY), padding: '5px 10px', fontSize: 11.5 }}>Remove</button>
                        </span>
                      )}
                    </div>

                    {editing ? (
                      <div>
                        {k.id === 'verse' && (
                          <input value={editRef} onChange={e => setEditRef(e.target.value.slice(0, 80))} placeholder="Reference (e.g. Psalm 46:1)" style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, fontFamily: serif, fontWeight: 700, color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                        )}
                        <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)} rows={4} maxLength={2000} style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => setEditingId(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => saveEdit(r)} disabled={!editText.trim()} style={{ flex: 2, background: editText.trim() ? GOLD : BORDER, border: 'none', borderRadius: 8, padding: 8, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: editText.trim() ? 'pointer' : 'default' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {k.id === 'verse' && r.verse_ref && <div style={{ fontFamily: serif, fontSize: 13.5, fontWeight: 700, color: DARK, marginBottom: 4 }}>{r.verse_ref}</div>}
                        <p style={{ fontSize: 14, color: DARK, lineHeight: 1.6, margin: 0, fontStyle: k.id === 'verse' ? 'italic' : 'normal', whiteSpace: 'pre-wrap' }}>{k.id === 'verse' ? <>&ldquo;{r.request_text}&rdquo;</> : r.request_text}</p>
                      </>
                    )}

                    {/* Dated follow-ups under the entry. */}
                    {(r.updates ?? []).length > 0 && (
                      <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${BORDER}` }}>
                        {(r.updates ?? []).map(u => (
                          <div key={u.id} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                              <span style={{ fontSize: 10.5, color: u.kind === 'answered' ? '#5E9A72' : GRAY, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.kind === 'answered' ? '✓ Answered' : 'Update'}</span>
                              <span style={{ fontSize: 11, color: GRAY }}>{stamp(u.created_at)}</span>
                              <button onClick={() => deleteUpdate(r.id, u.id)} title="Remove this update" style={{ ...pill(GRAY), marginLeft: 'auto', padding: '3px 8px', fontSize: 10.5 }}>Remove</button>
                            </div>
                            <p style={{ fontSize: 13.5, color: DARK, margin: '2px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{u.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {updateFor === r.id ? (
                      <div style={{ marginTop: 10 }}>
                        <textarea autoFocus value={updateDraft} onChange={e => setUpdateDraft(e.target.value.slice(0, 1000))} rows={2} placeholder={updateAnswering ? 'How was it answered? (optional)' : 'What’s new? — “surgery went well”, “still waiting on the results”'} style={{ width: '100%', padding: '9px 12px', fontSize: 13.5, fontFamily: 'Georgia, serif', color: DARK, border: `1px solid ${BORDER}`, borderRadius: 8, backgroundColor: CREAM, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.55 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={() => { setUpdateFor(null); setUpdateDraft(''); setUpdateAnswering(false) }} style={{ flex: 1, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 7, fontSize: 12.5, fontFamily: 'Georgia, serif', color: GRAY, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => submitUpdate(r)} disabled={updateBusy || (!updateAnswering && !updateDraft.trim())} style={{ flex: 2, background: updateAnswering ? '#7BAE8E' : GOLD, border: 'none', borderRadius: 8, padding: 7, fontSize: 12.5, fontFamily: 'Georgia, serif', fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: updateBusy || (!updateAnswering && !updateDraft.trim()) ? 0.6 : 1 }}>{updateBusy ? 'Saving…' : updateAnswering ? 'Mark answered ✓' : 'Add update'}</button>
                        </div>
                      </div>
                    ) : !editing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => openUpdate(r.id, false)} style={pill(GOLD)}>+ Update</button>
                        {isPrayer && (r.is_answered
                          ? <button onClick={() => markAnswered(r.id, false)} style={pill(GRAY)}>Reopen</button>
                          : <button onClick={() => openUpdate(r.id, true)} style={pill('#5E9A72')}>✓ Mark answered</button>)}
                        {r.allow_comments && (
                          <button onClick={() => toggleReplies(r.id)} style={pill(CIRCLE)}>
                            💬 {r.reply_count ?? 0} {(r.reply_count ?? 0) === 1 ? 'reply' : 'replies'}{openReplyId === r.id ? ' ▴' : ' ▾'}
                          </button>
                        )}
                        {isPrayer && r.audience !== 'private' && <span style={{ fontSize: 12, color: GRAY, marginLeft: 'auto' }}>🙏 {r.intercession_count} {r.intercession_count === 1 ? 'person praying' : 'praying'}</span>}
                      </div>
                    )}

                    {/* Private replies you've received on this prayer (only you see these). */}
                    {r.allow_comments && openReplyId === r.id && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
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
                )
              })}
            </div>
          ))
        })()}
      </div>
      )}
    </div>
  )
}
