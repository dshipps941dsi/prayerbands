'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import AvatarBadge from './AvatarBadge'

// A Prayer Circle, opened inside the app. One scrolling room with a card up
// top that says what the circle is for and how to invite people, then jump
// links to its four parts: Share, the Prayer Wall (topics with prayers
// written underneath, like a small forum), Members, and Settings.
//
// Everything that used to need the standalone /circles/[id] page happens
// here, so a person never leaves the band view.

// Palette: ink on paper. Text and surfaces come from the band's theme; the
// secondary text, hairlines and tints are mixes of the theme's text colour,
// so they stay legible on every theme instead of drifting to tan-on-cream.
// The theme's gold is kept for small accents only.
const TEXT = 'var(--pb-text, #15223B)'
const SURFACE = 'var(--pb-surface, #FFFDF8)'
const MUTED = 'var(--pb-text-muted, #5A6A85)'
const BORDER = 'color-mix(in srgb, var(--pb-text, #15223B) 14%, transparent)'
const PRIMARY = 'var(--pb-primary, #C8A96E)'
const ON_PRIMARY = 'var(--pb-text-on-primary, #0A1628)'
const ACCENT = 'var(--pb-accent, #9A7A35)'
const ACCENT_ALT = 'var(--pb-accent-alt, #5A7BA8)'
// A wash of the theme's primary on the surface: chips, the compose box, the open prayers.
const TINT = 'color-mix(in srgb, var(--pb-primary, #C8A96E) 12%, var(--pb-surface, #FFFDF8))'
const SURFACE_ALT = TINT
// Buttons in the theme's primary; the fold/answer controls in ink.
const INK = PRIMARY
const ON_INK = ON_PRIMARY
const ANSWERED = '#4A8A6A'
const DANGER = '#B4441F'
const CINZEL = "'Cinzel', Georgia, serif"
const DISPLAY = "'Cormorant Garamond', Georgia, serif"
const BODY = "'Inter', system-ui, sans-serif"

type Avatar = { icon: string | null; initials: string | null; font: string | null }
type Circle = { id: string; name: string; description: string | null; join_code: string; is_closed: boolean; created_by: string; created_at: string }
type Member = { id: string; user_id: string; role: 'leader' | 'co_leader' | 'member'; joined_at: string; name: string | null; avatar?: Avatar }
type Reply = { id: string; user_id: string; body: string; created_at: string; name: string | null; avatar?: Avatar }
type Topic = {
  id: string; user_id: string; title: string | null; kind: 'request' | 'update'; request_text: string
  is_answered: boolean; created_at: string; intercession_count: number; i_prayed: boolean; is_mine: boolean
  name: string | null; avatar?: Avatar; replies: Reply[]
}

function timeAgo(ts: string): string {
  const then = new Date(ts).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function copyText(value: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(value); return true } catch { return false }
}

const btn = {
  primary: { background: INK, color: ON_INK, border: 'none' } as React.CSSProperties,
  ghost: { background: 'transparent', color: TEXT, border: `1px solid ${BORDER}` } as React.CSSProperties,
  danger: { background: 'transparent', color: DANGER, border: `1px solid ${DANGER}55` } as React.CSSProperties,
}
function Btn({ kind = 'ghost', block, small, children, ...rest }: { kind?: keyof typeof btn; block?: boolean; small?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} style={{ ...btn[kind], width: block ? '100%' : undefined, borderRadius: 9, padding: small ? '7px 12px' : '11px 16px', fontSize: small ? 11 : 12, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: rest.disabled ? 'default' : 'pointer', opacity: rest.disabled ? 0.55 : 1, whiteSpace: 'nowrap', ...(rest.style || {}) }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: `1px solid ${BORDER}`, fontSize: 15, fontFamily: 'Georgia, serif', color: TEXT, background: SURFACE, outline: 'none' }
const label: React.CSSProperties = { display: 'block', fontSize: 11, fontFamily: CINZEL, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, marginBottom: 5 }

// Inline "are you sure" — replaces the control that asked, never a browser dialog.
function Confirm({ text, yes, onYes, onNo, busy }: { text: string; yes: string; onYes: () => void; onNo: () => void; busy?: boolean }) {
  return (
    <div style={{ background: SURFACE_ALT, border: `1px solid ${DANGER}55`, borderRadius: 9, padding: '12px 14px' }}>
      <p style={{ fontSize: 13, color: TEXT, margin: '0 0 10px', fontFamily: BODY, lineHeight: 1.55 }}>{text}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn small onClick={onNo} disabled={busy}>Cancel</Btn>
        <Btn small onClick={onYes} disabled={busy} style={{ background: DANGER, color: '#fff', border: 'none' }}>{busy ? '…' : yes}</Btn>
      </div>
    </div>
  )
}

export default function CircleRoom({ circleId, code, onBack, onLeft }: {
  circleId: string
  code?: string | null           // an invite code lets someone look before they join
  onBack: () => void
  onLeft?: () => void            // after leaving or closing the circle (defaults to onBack)
}) {
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [hasBand, setHasBand] = useState(false)
  const [isLeader, setIsLeader] = useState(false)   // the creator
  const [canLead, setCanLead] = useState(false)     // leader or co-leader
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState<'' | 'signin' | 'notmember' | 'notfound' | 'busy'>('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function say(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  // Sections the jump links scroll to. Tapping the top card folds them all
  // away (and back); a jump link unfolds and scrolls.
  const [expanded, setExpanded] = useState(true)
  const wallRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const jump = (r: React.RefObject<HTMLDivElement | null>) => {
    const go = () => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (expanded) go()
    else { setExpanded(true); setTimeout(go, 60) }
  }

  // Settings form — seeded from the circle when it loads.
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const seq = useRef(0)
  const load = useCallback(async () => {
    const my = ++seq.current
    const res = await fetch(`/api/circles/${circleId}${code ? `?code=${encodeURIComponent(code)}` : ''}`)
    if (my !== seq.current) return
    if (!res.ok) {
      setProblem(res.status === 401 ? 'signin' : res.status === 403 ? 'notmember' : res.status === 429 ? 'busy' : 'notfound')
      setLoading(false)
      return
    }
    const d = await res.json()
    if (my !== seq.current) return
    setCircle(d.circle)
    setMembers(d.members ?? [])
    setTopics(d.requests ?? [])
    setMyUserId(d.my_user_id ?? null)
    setIsMember(!!d.is_member)
    setHasBand(!!d.has_band)
    setIsLeader(!!d.is_leader)
    setCanLead(!!d.can_lead)
    setEditName(d.circle?.name ?? '')
    setEditDesc(d.circle?.description ?? '')
    setProblem('')
    setLoading(false)
  }, [circleId, code])
  useEffect(() => { load() }, [load])

  // ── Joining ───────────────────────────────────────────────────
  const [joining, setJoining] = useState(false)
  const signInHref = `/signin/personal?redirect=${encodeURIComponent(`/circles/${circleId}${code ? `?code=${code}` : ''}`)}`
  const ensureMember = useCallback(async (): Promise<boolean> => {
    if (isMember) return true
    if (!myUserId) { window.location.assign(signInHref); return false }
    setJoining(true)
    const res = await fetch('/api/circles/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ circle_id: circleId }) })
    setJoining(false)
    if (res.ok || res.status === 409) {
      setIsMember(true)
      if (res.ok) say('You’re in the circle')
      await load()
      return true
    }
    const d = await res.json().catch(() => ({}))
    say(d.error || 'Could not join. Please try again.')
    return false
  }, [isMember, myUserId, circleId, signInHref, load])

  // ── Share ─────────────────────────────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prayerbands.com'
  const inviteUrl = `${origin}/circle/${circleId}`
  const [copied, setCopied] = useState<'' | 'code' | 'link'>('')
  const [showQR, setShowQR] = useState(false)
  async function copy(which: 'code' | 'link') {
    if (!circle) return
    if (await copyText(which === 'code' ? circle.join_code : inviteUrl)) { setCopied(which); setTimeout(() => setCopied(''), 1600) }
  }
  async function share() {
    if (!circle) return
    const msg = `Join me in prayer in "${circle.name}" on Prayer Bands 🙏 ${inviteUrl}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Join my prayer circle', text: msg }) } catch {}
      return
    }
    if (await copyText(msg)) say('Invite copied — paste it anywhere')
  }

  // ── Prayer Wall ───────────────────────────────────────────────
  const [composing, setComposing] = useState(false)
  const [kind, setKind] = useState<'request' | 'update'>('request')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [posting, setPosting] = useState(false)
  const [showAnswered, setShowAnswered] = useState(false)
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyTopic, setBusyTopic] = useState<string | null>(null)
  const [confirmTopic, setConfirmTopic] = useState<string | null>(null)
  const [confirmReply, setConfirmReply] = useState<string | null>(null)

  async function postTopic() {
    if (!title.trim() && !details.trim()) return
    if (!(await ensureMember())) return
    setPosting(true)
    const res = await fetch(`/api/circles/${circleId}/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), kind, request_text: details.trim() }),
    })
    const d = await res.json().catch(() => ({}))
    setPosting(false)
    if (!res.ok) { say(d.error || 'Could not post. Please try again.'); return }
    const me = members.find(m => m.user_id === myUserId)
    setTopics(prev => [{ ...d.request, intercession_count: 0, i_prayed: false, is_mine: true, replies: [], name: me?.name ?? null, avatar: me?.avatar }, ...prev])
    setTitle(''); setDetails(''); setKind('request'); setComposing(false)
    say(kind === 'update' ? 'Update posted' : 'Request posted — the circle has been told')
  }

  async function pray(topicId: string) {
    if (!(await ensureMember())) return
    const res = await fetch(`/api/circles/${circleId}/intercede`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: topicId }) })
    if (!res.ok) return
    const d = await res.json()
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, i_prayed: d.praying, intercession_count: typeof d.count === 'number' ? d.count : t.intercession_count } : t))
  }

  async function setAnswered(topicId: string, is_answered: boolean) {
    setBusyTopic(topicId)
    const res = await fetch(`/api/circles/${circleId}/request`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: topicId, is_answered }) })
    setBusyTopic(null)
    if (!res.ok) { say('Could not update that topic.'); return }
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, is_answered } : t))
    say(is_answered ? 'Marked answered — praise God' : 'Topic reopened')
  }

  async function deleteTopic(topicId: string) {
    setBusyTopic(topicId)
    const res = await fetch(`/api/circles/${circleId}/request?request_id=${encodeURIComponent(topicId)}`, { method: 'DELETE' })
    setBusyTopic(null); setConfirmTopic(null)
    if (!res.ok) { say('Could not remove that topic.'); return }
    setTopics(prev => prev.filter(t => t.id !== topicId))
  }

  async function postReply(topicId: string) {
    const body = (drafts[topicId] || '').trim()
    if (!body) return
    if (!(await ensureMember())) return
    setBusyTopic(topicId)
    const res = await fetch(`/api/circles/${circleId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: topicId, body }) })
    const d = await res.json().catch(() => ({}))
    setBusyTopic(null)
    if (!res.ok) { say(d.error || 'Could not post your prayer.'); return }
    setTopics(prev => prev.map(t => t.id === topicId
      ? { ...t, replies: [...t.replies, d.reply], i_prayed: true, intercession_count: typeof d.count === 'number' ? d.count : t.intercession_count }
      : t))
    setDrafts(prev => ({ ...prev, [topicId]: '' }))
  }

  async function deleteReply(topicId: string, replyId: string) {
    const res = await fetch(`/api/circles/${circleId}/reply?reply_id=${encodeURIComponent(replyId)}`, { method: 'DELETE' })
    setConfirmReply(null)
    if (!res.ok) { say('Could not remove that prayer.'); return }
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, replies: t.replies.filter(r => r.id !== replyId) } : t))
  }

  // ── Members ───────────────────────────────────────────────────
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  async function removeMember(userId: string) {
    setRemoving(true)
    const res = await fetch(`/api/circles/${circleId}/remove-member?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    setRemoving(false); setConfirmRemove(null)
    if (!res.ok) { say('Could not remove that member.'); return }
    if (userId === myUserId) { (onLeft ?? onBack)(); return }
    setMembers(prev => prev.filter(m => m.user_id !== userId))
    say('Member removed')
  }

  const [confirmRole, setConfirmRole] = useState<string | null>(null)
  const [roleBusy, setRoleBusy] = useState(false)
  async function setRole(userId: string, role: 'co_leader' | 'member') {
    setRoleBusy(true)
    const res = await fetch(`/api/circles/${circleId}/role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, role }) })
    const d = await res.json().catch(() => ({}))
    setRoleBusy(false); setConfirmRole(null)
    if (!res.ok) { say(d.error || 'Could not change their role.'); return }
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m))
    say(role === 'co_leader' ? 'They’re a co-leader now' : 'They’re a member again')
  }

  // ── Settings ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [confirmCode, setConfirmCode] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [closing, setClosing] = useState(false)

  async function patch(body: Record<string, unknown>): Promise<Circle | null> {
    const res = await fetch(`/api/circles/${circleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { say(d.error || 'Could not save.'); return null }
    return d.circle as Circle
  }
  async function saveSettings() {
    if (!editName.trim()) { say('The circle needs a name.'); return }
    setSaving(true)
    const c = await patch({ name: editName, description: editDesc })
    setSaving(false)
    if (c) { setCircle(c); say('Saved') }
  }
  async function newCode() {
    const c = await patch({ regenerate_code: true })
    setConfirmCode(false)
    if (c) { setCircle(c); say(`New join code: ${c.join_code}`) }
  }
  async function closeCircle() {
    setClosing(true)
    const c = await patch({ is_closed: true })
    setClosing(false)
    if (c) (onLeft ?? onBack)()
  }

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: '24px 0', color: MUTED, fontSize: 14, textAlign: 'center', fontFamily: BODY }}>Opening the circle…</div>
  }
  if (problem || !circle) {
    const copyFor = {
      signin: 'Create a free account or sign in to see this circle.',
      notmember: 'You’re not in this circle. Ask its leader for the join code or an invite link.',
      notfound: 'This circle could not be found. It may have been closed.',
      busy: 'Too many attempts for now. Give it a minute and try again.',
      '': 'This circle could not be opened.',
    }[problem]
    return (
      <div style={{ marginBottom: 32 }}>
        <BackRow onBack={onBack} />
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: TEXT, margin: '0 0 14px', fontFamily: BODY, lineHeight: 1.55 }}>{copyFor}</p>
          {problem === 'signin' && <a href={signInHref} style={{ ...btn.primary, display: 'inline-block', textDecoration: 'none', borderRadius: 9, padding: '11px 18px', fontSize: 12, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sign in</a>}
        </div>
      </div>
    )
  }

  const open = topics.filter(t => !t.is_answered)
  const answered = topics.filter(t => t.is_answered)
  const roleLabel = isLeader ? 'Leader' : canLead ? 'Co-leader' : isMember ? 'Member' : 'Guest'
  const pill = (active: boolean): React.CSSProperties => ({ flex: 1, background: active ? PRIMARY : TINT, color: active ? ON_PRIMARY : TEXT, border: `1px solid color-mix(in srgb, ${PRIMARY} 45%, transparent)`, borderRadius: 20, padding: '7px 13px', fontSize: 11, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' })

  return (
    <div style={{ marginBottom: 32, fontFamily: BODY }}>
      <BackRow onBack={onBack} />

      {/* ── Top card: what this circle is for, who is in it, and how to
          bring people in. Tap the name to fold the rest of the room away. ── */}
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: `4px solid ${PRIMARY}`, borderRadius: 14, marginBottom: 12, boxShadow: '0 2px 12px rgba(10,22,40,0.06)', overflow: 'hidden' }}>
        {/* Header row is the fold control (a div, not a button, so no user-agent
            button styling ever paints it). The join code sits top-right; tapping
            it copies the code. */}
        <div role="button" tabIndex={0} aria-expanded={expanded} onClick={() => setExpanded(v => !v)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 18px 0', cursor: 'pointer', color: TEXT, background: 'transparent' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontFamily: CINZEL, letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 6 }}>Prayer Circle · <span style={{ color: MUTED }}>{roleLabel}</span></div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, color: TEXT, margin: '0 0 6px', lineHeight: 1.15 }}>{circle.name}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isMember && (
              <button onClick={e => { e.stopPropagation(); copy('code') }} title="Tap to copy the join code" style={{ background: TINT, border: `1px solid color-mix(in srgb, ${PRIMARY} 45%, transparent)`, borderRadius: 8, padding: '5px 9px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 8.5, fontFamily: CINZEL, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>{copied === 'code' ? 'Copied' : 'Join code'}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: ACCENT }}>{circle.join_code}</div>
              </button>
            )}
            <span aria-hidden style={{ fontSize: 12, color: MUTED, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </div>
        </div>
        <div style={{ padding: '0 18px 16px' }}>
          {circle.description ? (
            <p style={{ fontSize: 16, color: TEXT, margin: '0 0 12px', lineHeight: 1.5, fontStyle: 'italic', fontFamily: DISPLAY }}>{circle.description}</p>
          ) : canLead ? (
            <button onClick={() => jump(settingsRef)} style={{ background: 'none', border: 'none', padding: 0, margin: '0 0 12px', color: ACCENT, fontSize: 13, fontFamily: BODY, cursor: 'pointer', textDecoration: 'underline' }}>Say what this circle is praying for →</button>
          ) : null}

          {members.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex' }}>
                {members.slice(0, 7).map((m, i) => (
                  <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}><AvatarBadge {...(m.avatar || {})} name={m.name} size={28} ring /></div>
                ))}
              </div>
              <button onClick={() => jump(membersRef)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: MUTED, fontFamily: BODY, cursor: 'pointer' }}>
                {members.length} {members.length === 1 ? 'person' : 'people'} praying together
              </button>
            </div>
          )}

          {isMember ? (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              {/* Share opens the phone's share sheet with the invite link written in
                  (copies it on a desktop); QR is for a flyer or a screen. */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn kind="primary" block onClick={share} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ShareIcon /> Share invite
                </Btn>
                <Btn block onClick={() => setShowQR(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...(showQR ? { background: TINT, borderColor: PRIMARY } : {}) }}>
                  <QRIcon /> QR code
                </Btn>
              </div>
              {showQR && <div style={{ marginTop: 12 }}><CircleQR url={inviteUrl} name={circle.name} /></div>}
            </div>
          ) : (
            <div>
              <Btn kind="primary" block onClick={ensureMember} disabled={joining}>{joining ? 'Joining…' : myUserId ? 'Join this circle' : 'Sign in to join'}</Btn>
              <p style={{ fontSize: 12.5, color: MUTED, margin: '8px 0 0', textAlign: 'center', lineHeight: 1.5 }}>You’re looking in as a guest. Join to follow along and pray with the circle.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Jump links ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button style={pill(false)} onClick={() => jump(wallRef)}>Prayer Wall{open.length ? ` · ${open.length}` : ''}</button>
        <button style={pill(false)} onClick={() => jump(membersRef)}>Members · {members.length}</button>
        {isMember && <button style={pill(false)} onClick={() => jump(settingsRef)}>Settings</button>}
      </div>

      {expanded && <>
      {/* ── Prayer Wall ────────────────────────────────────────── */}
      <Section refObj={wallRef} label="Prayer Wall" action={canLead && hasBand && !composing ? <Btn kind="primary" small onClick={() => setComposing(true)}>+ New topic</Btn> : null}>
        {isMember && !hasBand && <BandNote what={canLead ? 'post a topic or write a prayer' : 'write a prayer'} />}
        {composing && (
          <div style={{ background: SURFACE_ALT, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 14px 12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, marginBottom: 12 }}>
              {(['request', 'update'] as const).map(k => (
                <button key={k} onClick={() => setKind(k)} style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, background: kind === k ? PRIMARY : 'transparent', color: kind === k ? ON_PRIMARY : MUTED, fontSize: 11, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {k === 'request' ? 'Prayer request' : 'Update'}
                </button>
              ))}
            </div>
            <label style={label}>{kind === 'request' ? 'What are we praying for?' : 'What’s the news?'}</label>
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder={kind === 'request' ? 'e.g. Dad’s surgery on Tuesday' : 'e.g. Dad is home and resting'} style={inputStyle} autoFocus />
            <label style={{ ...label, margin: '10px 0 5px' }}>Details <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea value={details} onChange={e => setDetails(e.target.value.slice(0, 2000))} rows={3} placeholder="Anything the circle should know as they pray." style={{ ...inputStyle, resize: 'vertical', fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn onClick={() => { setComposing(false); setTitle(''); setDetails('') }} disabled={posting}>Cancel</Btn>
              <Btn kind="primary" block onClick={postTopic} disabled={posting || (!title.trim() && !details.trim())}>{posting ? 'Posting…' : kind === 'request' ? 'Ask the circle to pray' : 'Post update'}</Btn>
            </div>
          </div>
        )}

        {open.length === 0 && !composing && (
          <div style={{ textAlign: 'center', padding: '22px 12px', color: MUTED }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🕊️</div>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>Nothing on the wall yet.{canLead && hasBand ? ' Start a topic — a request or an update — and the circle prays underneath it.' : isMember ? ' The circle’s leaders post topics here; you’ll be able to write prayers under them.' : ''}</p>
          </div>
        )}

        {open.map(t => (
          <TopicCard key={t.id} t={t} isLeader={canLead} isMember={isMember} hasBand={hasBand} myUserId={myUserId}
            repliesOpen={openReplies.has(t.id)} onToggleReplies={() => setOpenReplies(prev => { const n = new Set(prev); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })}
            onPray={() => pray(t.id)} onAnswered={() => setAnswered(t.id, true)} onDelete={() => deleteTopic(t.id)}
            confirmingDelete={confirmTopic === t.id} setConfirmDelete={v => setConfirmTopic(v ? t.id : null)}
            draft={drafts[t.id] || ''} setDraft={v => setDrafts(prev => ({ ...prev, [t.id]: v }))} onReply={() => postReply(t.id)}
            confirmReply={confirmReply} setConfirmReply={setConfirmReply} onDeleteReply={rid => deleteReply(t.id, rid)}
            busy={busyTopic === t.id} signInHref={signInHref} />
        ))}

        {answered.length > 0 && (
          <div style={{ marginTop: open.length ? 6 : 0 }}>
            <button onClick={() => setShowAnswered(v => !v)} style={{ background: 'none', border: 'none', padding: '6px 0', color: ANSWERED, fontSize: 11, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {showAnswered ? '▾' : '▸'} Answered · {answered.length}
            </button>
            {showAnswered && answered.map(t => (
              <TopicCard key={t.id} t={t} isLeader={canLead} isMember={isMember} hasBand={hasBand} myUserId={myUserId}
                repliesOpen={openReplies.has(t.id)} onToggleReplies={() => setOpenReplies(prev => { const n = new Set(prev); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })}
                onPray={() => pray(t.id)} onAnswered={() => setAnswered(t.id, false)} onDelete={() => deleteTopic(t.id)}
                confirmingDelete={confirmTopic === t.id} setConfirmDelete={v => setConfirmTopic(v ? t.id : null)}
                draft={drafts[t.id] || ''} setDraft={v => setDrafts(prev => ({ ...prev, [t.id]: v }))} onReply={() => postReply(t.id)}
                confirmReply={confirmReply} setConfirmReply={setConfirmReply} onDeleteReply={rid => deleteReply(t.id, rid)}
                busy={busyTopic === t.id} signInHref={signInHref} />
            ))}
          </div>
        )}
      </Section>

      {/* ── Members ────────────────────────────────────────────── */}
      <Section refObj={membersRef} label={`Members · ${members.length}`}>
        {members.map(m => {
          const me = m.user_id === myUserId
          return (
            <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AvatarBadge {...(m.avatar || {})} name={m.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name || 'A member'}{me ? <span style={{ color: MUTED, fontWeight: 400 }}> (you)</span> : ''}
                    {m.role !== 'member' && <span style={{ marginLeft: 8, fontSize: 9.5, fontFamily: CINZEL, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT, background: TINT, border: `1px solid ${PRIMARY}`, borderRadius: 8, padding: '1px 7px', verticalAlign: 'middle' }}>{m.role === 'leader' ? 'Leader' : 'Co-leader'}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>Joined {new Date(m.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                {m.role !== 'leader' && confirmRemove !== m.user_id && confirmRole !== m.user_id && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {isLeader && <Btn small onClick={() => setConfirmRole(m.user_id)}>{m.role === 'co_leader' ? 'Step down' : 'Co-leader'}</Btn>}
                    {(isLeader || (canLead && m.role === 'member')) && <Btn kind="danger" small onClick={() => setConfirmRemove(m.user_id)}>Remove</Btn>}
                  </div>
                )}
              </div>
              {confirmRole === m.user_id && (
                <div style={{ marginTop: 10 }}>
                  {m.role === 'co_leader'
                    ? <Confirm text={`Step ${m.name || 'this member'} down to a member? They will no longer post topics.`} yes="Step down" busy={roleBusy} onYes={() => setRole(m.user_id, 'member')} onNo={() => setConfirmRole(null)} />
                    : <Confirm text={`Make ${m.name || 'this member'} a co-leader? They can post topics and updates, mark them answered, and remove members.`} yes="Make co-leader" busy={roleBusy} onYes={() => setRole(m.user_id, 'co_leader')} onNo={() => setConfirmRole(null)} />}
                </div>
              )}
              {confirmRemove === m.user_id && (
                <div style={{ marginTop: 10 }}>
                  <Confirm text={`Remove ${m.name || 'this member'} from the circle? They can rejoin with the code.`} yes="Remove" busy={removing} onYes={() => removeMember(m.user_id)} onNo={() => setConfirmRemove(null)} />
                </div>
              )}
            </div>
          )
        })}
        {members.length === 0 && <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No one here yet.</p>}
      </Section>

      {/* ── Settings ───────────────────────────────────────────── */}
      {isMember && (
        <Section refObj={settingsRef} label="Settings">
          {canLead ? (
            <div>
              <label style={label}>Circle name</label>
              <input value={editName} onChange={e => setEditName(e.target.value.slice(0, 80))} style={inputStyle} />
              <label style={{ ...label, margin: '12px 0 5px' }}>What this circle is praying for</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value.slice(0, 300))} rows={3} placeholder="Shown at the top of the circle and on the invite page." style={{ ...inputStyle, resize: 'vertical', fontSize: 14 }} />
              <div style={{ textAlign: 'right', fontSize: 11, color: MUTED, marginTop: 3 }}>{editDesc.length}/300</div>
              <Btn kind="primary" block onClick={saveSettings} disabled={saving || (editName === circle.name && editDesc === (circle.description || ''))} style={{ marginTop: 8 }}>{saving ? 'Saving…' : 'Save changes'}</Btn>

              {isLeader && <>
              <div style={{ borderTop: `1px solid ${BORDER}`, margin: '18px 0 14px' }} />
              {confirmCode ? (
                <Confirm text={`Make a new join code? The current code (${circle.join_code}) will stop working, and anyone you have already sent it to will need the new one.`} yes="New code" onYes={newCode} onNo={() => setConfirmCode(false)} />
              ) : (
                <Btn block onClick={() => setConfirmCode(true)}>Generate a new join code</Btn>
              )}
              <div style={{ height: 10 }} />
              {confirmClose ? (
                <Confirm text="Close this circle? It disappears from everyone’s app. The wall is kept, but no one can post or join again." yes="Close circle" busy={closing} onYes={closeCircle} onNo={() => setConfirmClose(false)} />
              ) : (
                <Btn kind="danger" block onClick={() => setConfirmClose(true)}>Close circle</Btn>
              )}
              </>}
              {!isLeader && <p style={{ fontSize: 12.5, color: MUTED, margin: '14px 0 0', lineHeight: 1.5 }}>Only the leader can change the join code or close the circle.</p>}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 12px', lineHeight: 1.5 }}>The circle’s leaders post topics and manage the circle. You can step out at any time.</p>
              {confirmLeave ? (
                <Confirm text="Leave this circle? You can rejoin later with the code." yes="Leave" busy={removing} onYes={() => myUserId && removeMember(myUserId)} onNo={() => setConfirmLeave(false)} />
              ) : (
                <Btn kind="danger" block onClick={() => setConfirmLeave(true)}>Leave circle</Btn>
              )}
            </div>
          )}
        </Section>
      )}

      </>}

      {toast && (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', zIndex: 260, background: '#0E1E38', color: '#F6F1E4', padding: '10px 20px', borderRadius: 40, fontSize: 13, fontFamily: BODY, boxShadow: '0 6px 24px rgba(10,22,40,0.3)', pointerEvents: 'none', maxWidth: 'calc(100vw - 32px)', textAlign: 'center' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: 13, fontFamily: 'Georgia, serif', cursor: 'pointer', padding: '4px 0' }}>← My Circles</button>
    </div>
  )
}

function Section({ refObj, label: text, action, children }: { refObj: React.RefObject<HTMLDivElement | null>; label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div ref={refObj} style={{ scrollMarginTop: 76, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT }}><span aria-hidden style={{ width: 14, height: 3, borderRadius: 2, background: PRIMARY }} />{text}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

// Shown to a member who has never held a band, where the compose box would be.
function BandNote({ what }: { what: string }) {
  return (
    <div style={{ background: SURFACE_ALT, border: `1px dashed ${BORDER}`, borderRadius: 9, padding: '10px 12px', marginBottom: 12, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
      You can follow along and tap Pray. To {what}, you’ll need a Prayer Band. <a href="/store" style={{ color: ACCENT, fontWeight: 600 }}>Get a Prayer Band →</a>
    </div>
  )
}

function QRIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 20h1M17 17v3"/></svg>
}

function ShareIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}

// One topic on the wall: the header (a request or an update), who posted
// it, the pray count, and — opened underneath — the prayers people wrote.
function TopicCard(p: {
  t: Topic; isLeader: boolean; isMember: boolean; hasBand: boolean; myUserId: string | null
  repliesOpen: boolean; onToggleReplies: () => void
  onPray: () => void; onAnswered: () => void; onDelete: () => void
  confirmingDelete: boolean; setConfirmDelete: (v: boolean) => void
  draft: string; setDraft: (v: string) => void; onReply: () => void
  confirmReply: string | null; setConfirmReply: (id: string | null) => void; onDeleteReply: (id: string) => void
  busy: boolean; signInHref: string
}) {
  const { t } = p
  const canManage = t.is_mine || p.isLeader
  const isUpdate = t.kind === 'update'
  const body = t.title ? (t.request_text && t.request_text !== t.title ? t.request_text : null) : t.request_text
  const n = t.replies.length
  return (
    <div style={{ background: t.is_answered ? SURFACE_ALT : SURFACE, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${t.is_answered ? ANSWERED : isUpdate ? ACCENT_ALT : PRIMARY}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 9.5, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.is_answered ? ANSWERED : isUpdate ? ACCENT_ALT : ACCENT }}>
          {t.is_answered ? '✓ Answered' : isUpdate ? 'Update' : 'Prayer request'}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: MUTED }}>{timeAgo(t.created_at)}</span>
      </div>
      {t.title && <h4 style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 6px', lineHeight: 1.2 }}>{t.title}</h4>}
      {body && <p style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap', fontStyle: t.title ? 'normal' : 'italic', fontFamily: t.title ? BODY : DISPLAY, ...(t.title ? {} : { fontSize: 15.5 }) }}>{t.title ? body : `“${body}”`}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <AvatarBadge {...(t.avatar || {})} name={t.name} size={20} />
        <span style={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{t.is_mine ? 'You' : t.name || 'A member'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={p.onPray} style={{ background: t.i_prayed ? INK : 'transparent', border: `1px solid ${t.i_prayed ? INK : BORDER}`, borderRadius: 20, padding: '6px 12px', fontSize: 12, fontFamily: 'Georgia, serif', color: t.i_prayed ? ON_INK : TEXT, cursor: 'pointer', fontWeight: t.i_prayed ? 700 : 500 }}>
          🙏 {t.i_prayed ? 'Praying' : 'Pray'} · {t.intercession_count}
        </button>
        <button onClick={p.onToggleReplies} style={{ background: p.repliesOpen ? TINT : 'transparent', border: `1px solid ${p.repliesOpen ? PRIMARY : BORDER}`, borderRadius: 20, padding: '6px 12px', fontSize: 12, fontFamily: 'Georgia, serif', color: p.repliesOpen ? ACCENT : MUTED, cursor: 'pointer', fontWeight: 600 }}>
          💬 {n === 0 ? 'Write a prayer' : `${n} ${n === 1 ? 'prayer' : 'prayers'}`}
        </button>
        <span style={{ flex: 1 }} />
        {canManage && !p.confirmingDelete && (
          <>
            <button onClick={p.onAnswered} disabled={p.busy} style={{ background: 'none', border: 'none', padding: '4px 2px', fontSize: 10.5, fontFamily: CINZEL, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.is_answered ? MUTED : ANSWERED, cursor: 'pointer' }}>
              {t.is_answered ? 'Reopen' : 'Answered ✓'}
            </button>
            <button onClick={() => p.setConfirmDelete(true)} aria-label="Remove topic" title="Remove" style={{ background: 'none', border: 'none', padding: '4px 2px', fontSize: 13, color: MUTED, cursor: 'pointer', opacity: 0.7 }}>✕</button>
          </>
        )}
      </div>
      {p.confirmingDelete && (
        <div style={{ marginTop: 10 }}>
          <Confirm text="Remove this topic and the prayers under it?" yes="Remove" busy={p.busy} onYes={p.onDelete} onNo={() => p.setConfirmDelete(false)} />
        </div>
      )}

      {p.repliesOpen && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${BORDER}` }}>
          {t.replies.map(r => {
            const mine = r.user_id === p.myUserId
            return (
              <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <AvatarBadge {...(r.avatar || {})} name={r.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT }}>{mine ? 'You' : r.name || 'A member'}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{timeAgo(r.created_at)}</span>
                    <span style={{ flex: 1 }} />
                    {(mine || p.isLeader) && p.confirmReply !== r.id && (
                      <button onClick={() => p.setConfirmReply(r.id)} aria-label="Remove prayer" style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: MUTED, cursor: 'pointer', opacity: 0.7 }}>✕</button>
                    )}
                  </div>
                  <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.5, margin: '2px 0 0', whiteSpace: 'pre-wrap', fontFamily: DISPLAY, fontStyle: 'italic' }}>{r.body}</p>
                  {p.confirmReply === r.id && (
                    <div style={{ marginTop: 8 }}>
                      <Confirm text="Remove this prayer?" yes="Remove" onYes={() => p.onDeleteReply(r.id)} onNo={() => p.setConfirmReply(null)} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {p.isMember && !p.hasBand ? (
            <BandNote what="write a prayer here" />
          ) : p.isMember ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea value={p.draft} onChange={e => p.setDraft(e.target.value.slice(0, 1000))} rows={2} placeholder={n === 0 ? 'Write the first prayer under this…' : 'Add your prayer…'} style={{ ...inputStyle, flex: 1, fontSize: 14, resize: 'none', padding: '9px 12px' }} />
              <Btn kind="primary" onClick={p.onReply} disabled={p.busy || !p.draft.trim()} style={{ padding: '10px 14px' }}>{p.busy ? '…' : 'Post'}</Btn>
            </div>
          ) : (
            <a href={p.signInHref} style={{ fontSize: 13, color: ACCENT, fontFamily: BODY }}>Join the circle to write a prayer →</a>
          )}
        </div>
      )}
    </div>
  )
}

// Scannable invite: a crisp SVG on screen, plus a hidden high-res canvas
// that hands the user a printable PNG for a flyer.
function CircleQR({ url, name }: { url: string; name: string }) {
  const holder = useRef<HTMLDivElement>(null)
  function download() {
    const canvas = holder.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    try {
      const a = document.createElement('a')
      const slug = (name || 'invite').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'invite'
      a.download = `prayer-circle-${slug}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch {}
  }
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: '#fff', padding: 6, borderRadius: 6 }}>
        <QRCodeSVG value={url} size={168} bgColor="#ffffff" fgColor="#15223B" level="M" marginSize={2} />
      </div>
      <div ref={holder} aria-hidden style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <QRCodeCanvas value={url} size={1024} bgColor="#ffffff" fgColor="#15223B" level="M" marginSize={4} />
      </div>
      <p style={{ fontSize: 12, color: MUTED, margin: '10px 6px 12px', lineHeight: 1.5 }}>
        Point a phone camera here to join &ldquo;{name}&rdquo; — for a flyer at church, a screen, or a group text.
      </p>
      <Btn small onClick={download}>Download QR (PNG)</Btn>
    </div>
  )
}
