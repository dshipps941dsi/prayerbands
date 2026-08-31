'use client'
import { useState, useEffect, useCallback } from 'react'

type Person = { id: string; full_name: string | null; email: string | null }
type Sent = { id: string; title: string; body: string; recipient: string; active: boolean; created_at: string; cta_href?: string | null }

// Send a note straight into a member's inbox — the "I prayed for you" message
// to someone who just registered — or broadcast one to everyone. Backed by the
// announcements table + the derived inbox feed.
export default function MessagesManager({ C }: { C: any }) {
  const [mode, setMode] = useState<'person' | 'everyone'>('person')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [picked, setPicked] = useState<Person | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState<Sent[]>([])

  const loadSent = useCallback(async () => {
    const res = await fetch('/api/admin/announcements')
    if (res.ok) { const d = await res.json(); setSent(d.announcements ?? []) }
  }, [])
  useEffect(() => { loadSent() }, [loadSent])

  // Debounced people search.
  useEffect(() => {
    if (mode !== 'person' || picked || query.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/announcements?search=${encodeURIComponent(query.trim())}`)
      if (res.ok) { const d = await res.json(); setResults(d.people ?? []) }
    }, 250)
    return () => clearTimeout(t)
  }, [query, mode, picked])

  const nameOf = (p: Person) => p.full_name || (p.email ? p.email.split('@')[0] : 'Someone')
  const firstName = (p: Person | null) => p ? nameOf(p).split(' ')[0] : 'them'

  function prayedTemplate() {
    setTitle(mode === 'person' && picked ? `I prayed for you, ${firstName(picked)} 🙏` : 'I prayed for you 🙏')
  }

  async function send() {
    setMsg('')
    if (!title.trim()) { setMsg('Add a title.'); return }
    if (mode === 'person' && !picked) { setMsg('Pick who this is going to.'); return }
    setSending(true)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(), body: body.trim(),
        targetUserId: mode === 'person' ? picked!.id : null,
      }),
    })
    const d = await res.json().catch(() => ({}))
    setSending(false)
    if (res.ok) {
      setMsg(mode === 'person' ? `Sent to ${firstName(picked)}. It's in their inbox.` : 'Broadcast sent to everyone.')
      setTitle(''); setBody(''); setPicked(null); setQuery('')
      loadSent()
    } else {
      setMsg(d.error || 'Could not send.')
    }
  }

  async function retract(id: string, active: boolean) {
    await fetch('/api/admin/announcements', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
    loadSent()
  }

  const panel = { background: C.card, border: `1px solid ${C.borderSilver}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const label = { display: 'block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.goldText, fontFamily: 'Cinzel, serif', margin: '0 0 6px' }
  const input = { width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 14, fontFamily: 'Inter, sans-serif', color: C.body, background: '#fff', outline: 'none' }
  const btn = { padding: '10px 20px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 700 }
  const seg = (on: boolean) => ({ flex: 1, padding: '9px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.04em', fontWeight: 700, background: on ? C.gold : 'transparent', color: on ? C.navy : C.secondary })

  return (
    <div>
      <div style={panel}>
        <div style={head}>Send a message</div>
        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          {/* Who */}
          <div style={{ display: 'flex', gap: 4, background: C.silverBg, borderRadius: 9, padding: 4, maxWidth: 320 }}>
            <button style={seg(mode === 'person')} onClick={() => { setMode('person'); setMsg('') }}>A person</button>
            <button style={seg(mode === 'everyone')} onClick={() => { setMode('everyone'); setPicked(null); setMsg('') }}>Everyone</button>
          </div>

          {mode === 'person' && (
            <div>
              <label style={label}>To</label>
              {picked ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${C.borderGold}`, background: '#FFF8E7', borderRadius: 8, padding: '9px 12px' }}>
                  <div><span style={{ fontWeight: 700, color: C.heading }}>{nameOf(picked)}</span>{picked.email && <span style={{ color: C.secondary, fontSize: 12, marginLeft: 8 }}>{picked.email}</span>}</div>
                  <button onClick={() => { setPicked(null); setQuery('') }} style={{ background: 'none', border: 'none', color: C.secondary, cursor: 'pointer', fontSize: 13 }}>change</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input style={input} placeholder="Search by name or email…" value={query} onChange={e => setQuery(e.target.value)} />
                  {results.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, marginTop: 4, background: '#fff', border: `1px solid ${C.borderSilver}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(10,22,40,0.12)', overflow: 'hidden' }}>
                      {results.map(p => (
                        <button key={p.id} onClick={() => { setPicked(p); setResults([]) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${C.borderSilver}`, cursor: 'pointer', fontSize: 13, color: C.body }}>
                          <span style={{ fontWeight: 600 }}>{nameOf(p)}</span>{p.email && <span style={{ color: C.secondary, marginLeft: 8, fontSize: 12 }}>{p.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={label}>Title</label>
              <button onClick={prayedTemplate} style={{ background: 'none', border: 'none', color: C.goldText, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline', padding: 0, marginBottom: 6 }}>🙏 Use "I prayed for you"</button>
            </div>
            <input style={input} placeholder={mode === 'person' ? 'I prayed for you 🙏' : 'A note for everyone'} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div>
            <label style={label}>Message <span style={{ textTransform: 'none', color: C.secondary, letterSpacing: 0 }}>(optional)</span></label>
            <textarea style={{ ...input, minHeight: 84, resize: 'vertical' }} placeholder={mode === 'person' ? 'Great meeting you today — I lifted up your job search this morning. Reach out anytime.' : 'Try leaving a prayer today, not just tapping for a verse.'} value={body} onChange={e => setBody(e.target.value)} maxLength={600} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{ ...btn, opacity: sending ? 0.6 : 1 }} onClick={send} disabled={sending}>{sending ? 'Sending…' : (mode === 'person' ? 'Send to inbox' : 'Send to everyone')}</button>
            {msg && <span style={{ fontSize: 13, color: msg.startsWith('Could') || msg.startsWith('Add') || msg.startsWith('Pick') ? C.red : C.green, fontWeight: 600 }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Recently sent */}
      <div style={panel}>
        <div style={head}>Recently sent</div>
        <div style={{ padding: sent.length ? 8 : 16 }}>
          {sent.length === 0 && <div style={{ color: C.secondary, fontSize: 13 }}>Nothing sent yet.</div>}
          {sent.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '10px 8px', borderBottom: `1px solid ${C.borderSilver}`, opacity: a.active ? 1 : 0.5 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.heading }}>{a.title}</div>
                {a.body && <div style={{ fontSize: 12.5, color: C.secondary, marginTop: 2 }}>{a.body}</div>}
                <div style={{ fontSize: 11, color: C.goldText, marginTop: 3 }}>
                  {a.recipient === 'Everyone' ? '📣 Everyone' : `→ ${a.recipient}`} · {new Date(a.created_at).toLocaleDateString()}{!a.active && ' · retracted'}
                </div>
              </div>
              <button onClick={() => retract(a.id, a.active)} style={{ flexShrink: 0, background: 'none', border: `1px solid ${C.borderSilver}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, color: C.secondary, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>{a.active ? 'Retract' : 'Restore'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
