'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type CircleRow = { id: string; name: string; description: string | null; join_code: string; is_closed: boolean; created_at: string; leader: string; members: number; co_leaders: number; topics: number; last_activity: string }
type Ev = { at: string; circle_id: string; circle: string; kind: 'joined' | 'topic' | 'prayer' | 'prayed' | 'answered'; who: string; detail: string | null }
type Room = {
  circle: { id: string; name: string; description: string | null; join_code: string; is_closed: boolean; created_at: string; leader: string }
  members: { user_id: string; who: string; email: string | null; role: string; joined_at: string }[]
  topics: { id: string; who: string; title: string | null; kind: string; text: string; answered: boolean; answered_at: string | null; at: string; prayed: string[]; replies: { id: string; who: string; body: string; at: string }[] }[]
}

const KIND: Record<Ev['kind'], { label: string; color: string }> = {
  joined: { label: 'Joined', color: '#4A8A6A' },
  topic: { label: 'Topic', color: '#9A7A35' },
  prayer: { label: 'Prayer', color: '#2E7D8A' },
  prayed: { label: 'Prayed', color: '#6B4E9E' },
  answered: { label: 'Answered', color: '#4A8A6A' },
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// Read-only window on every circle: what happened lately across all of them,
// the list, and one circle's whole room on request.
export default function CirclesAdmin({ C }: { C: C }) {
  const [circles, setCircles] = useState<CircleRow[] | null>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [roomBusy, setRoomBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/circles')
    const d = await res.json().catch(() => ({}))
    setCircles(res.ok ? d.circles ?? [] : [])
    setEvents(res.ok ? d.events ?? [] : [])
  }, [])
  useEffect(() => { load() }, [load])

  async function openRoom(id: string) {
    if (open === id) { setOpen(null); setRoom(null); return }
    setOpen(id); setRoomBusy(true); setRoom(null)
    const res = await fetch(`/api/admin/circles?id=${id}`)
    const d = await res.json().catch(() => null)
    setRoom(res.ok ? d : null)
    setRoomBusy(false)
  }

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '22px 24px', marginBottom: 24 }
  const h2: React.CSSProperties = { fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const pill = (color: string): React.CSSProperties => ({ display: 'inline-block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color, border: `1px solid ${color}`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Inter, sans-serif' })

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={card}>
        <h2 style={h2}>What is happening in circles</h2>
        <p style={{ fontSize: 13, color: C.secondary, margin: '0 0 14px' }}>Joins, topics, prayers written, and taps of Pray, across every circle, newest first. Read-only.</p>
        <button onClick={load} style={{ background: 'none', border: `1px solid ${C.borderNavy}`, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: C.secondary, cursor: 'pointer', marginBottom: 12 }}>Refresh</button>
        {circles === null && <div style={{ fontSize: 13, color: C.secondary }}>Loading…</div>}
        {circles && events.length === 0 && <div style={{ fontSize: 13, color: C.secondary }}>Nothing yet.</div>}
        {events.map((e, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 12, padding: '9px 0', borderTop: i ? `1px solid ${C.borderSilver}` : 'none', fontSize: 13, color: C.body, fontFamily: 'Inter, sans-serif' }}>
            <span style={pill(KIND[e.kind].color)}>{KIND[e.kind].label}</span>
            <div>
              <strong style={{ color: C.heading }}>{e.who}</strong>
              {e.kind === 'joined' && <> joined <em>{e.circle}</em>{e.detail ? ` as ${e.detail}` : ''}</>}
              {e.kind === 'topic' && <> posted in <em>{e.circle}</em>{e.detail ? <>: “{e.detail}”</> : ''}</>}
              {e.kind === 'prayer' && <> wrote a prayer in <em>{e.circle}</em>{e.detail ? <> {e.detail}</> : ''}</>}
              {e.kind === 'prayed' && <> prayed in <em>{e.circle}</em>{e.detail ? <> over “{e.detail}”</> : ''}</>}
              {e.kind === 'answered' && <> marked a topic answered in <em>{e.circle}</em>{e.detail ? <>: “{e.detail}”</> : ''}</>}
              <span style={{ color: C.secondary }}> · {when(e.at)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h2 style={h2}>Circles{circles ? ` · ${circles.length}` : ''}</h2>
        <p style={{ fontSize: 13, color: C.secondary, margin: '0 0 14px' }}>Open one to read its wall and members. You cannot post or change anything from here.</p>
        {(circles ?? []).map(c => (
          <div key={c.id} style={{ border: `1px solid ${open === c.id ? C.gold : C.borderSilver}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => openRoom(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', padding: '12px 16px', background: open === c.id ? 'rgba(200,169,110,0.08)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{c.name}{c.is_closed ? <span style={{ ...pill(C.red), marginLeft: 8 }}>closed</span> : null}</div>
                <div style={{ fontSize: 12.5, color: C.secondary, marginTop: 2 }}>Leader {c.leader} · {c.members} member{c.members === 1 ? '' : 's'}{c.co_leaders ? ` · ${c.co_leaders} co-leader${c.co_leaders === 1 ? '' : 's'}` : ''} · {c.topics} topic{c.topics === 1 ? '' : 's'} · code {c.join_code} · last activity {when(c.last_activity)}</div>
              </div>
              <span style={{ color: C.secondary, fontSize: 16 }}>{open === c.id ? '▴' : '▾'}</span>
            </button>
            {open === c.id && (
              <div style={{ padding: '4px 16px 16px', borderTop: `1px solid ${C.borderSilver}`, fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.body }}>
                {roomBusy && <div style={{ color: C.secondary, padding: '10px 0' }}>Loading…</div>}
                {room && (
                  <>
                    {room.circle.description && <p style={{ color: C.secondary, margin: '10px 0 0', fontStyle: 'italic' }}>{room.circle.description}</p>}
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.goldText, margin: '16px 0 6px' }}>Members · {room.members.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {room.members.map(m => (
                        <span key={m.user_id} title={`${m.email || ''} · joined ${when(m.joined_at)}`} style={{ border: `1px solid ${C.borderNavy}`, borderRadius: 20, padding: '4px 10px', fontSize: 12.5, background: '#fff' }}>
                          {m.who}{m.role !== 'member' && <span style={{ ...pill(C.goldText), marginLeft: 6, fontSize: 9.5 }}>{m.role === 'leader' ? 'Leader' : 'Co-leader'}</span>}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.goldText, margin: '18px 0 6px' }}>Prayer wall · {room.topics.length} topic{room.topics.length === 1 ? '' : 's'}</div>
                    {room.topics.length === 0 && <div style={{ color: C.secondary }}>No topics yet.</div>}
                    {room.topics.map(t => (
                      <div key={t.id} style={{ background: '#fff', border: `1px solid ${C.borderNavy}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span style={pill(t.kind === 'update' ? '#2E7D8A' : C.goldText)}>{t.kind === 'update' ? 'Update' : 'Request'}</span>
                          {t.answered && <span style={pill('#4A8A6A')}>Answered</span>}
                          <strong style={{ color: C.heading, fontSize: 14.5 }}>{t.title || '(no title)'}</strong>
                          <span style={{ color: C.secondary, fontSize: 12 }}>{t.who} · {when(t.at)}</span>
                        </div>
                        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{t.text}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: C.secondary }}>
                          {t.prayed.length ? `Prayed: ${t.prayed.join(', ')}` : 'Nobody has tapped Pray yet'}
                        </div>
                        {t.replies.length > 0 && (
                          <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${C.borderSilver}` }}>
                            {t.replies.map(r => (
                              <div key={r.id} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 12, color: C.secondary }}><strong style={{ color: C.heading }}>{r.who}</strong> · {when(r.at)}</div>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.body}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
