'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type Dedication = {
  band_id: string
  status: string
  design: string
  recipient: string
  note: string
  viewed: boolean
  stops: number
  owner_email: string | null
  updated_at: string | null
  editable: boolean
  on_shelf: boolean
}

// Module scope, matching ActivityFeed: reading the clock is impure, so calling
// it from inside the component body is a render that can't be replayed.
const when = (iso: string | null) => {
  if (!iso) return 'undated'
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  if (mins < 43200) return `${Math.floor(mins / 1440)}d ago`
  return d.toLocaleDateString()
}

// Waiting vs opened is the split that decides what you can still do about a
// dedication, not just how it is going. A waiting one can still be rewritten
// and still has to reach somebody; an opened one has already been read, so
// editing it changes nothing they will ever see. Filtering on that is really
// filtering on "is there anything left for me to do here".
type Filter = 'all' | 'waiting' | 'opened' | 'stock'

// Read and edit every dedication in one place. Previously a dedication could
// only be reached one band at a time by typing an ID you already knew, which
// works when the band is in your hand and not at all for "what did I write
// lately" — or for noticing one sitting somewhere it shouldn't be.
export default function DedicationsManager({ C }: { C: C }) {
  const [filter, setFilter] = useState<Filter>('all')
  // Writing a new dedication used to live over in Orders, nowhere near the list
  // of dedications it adds to. Same endpoint, now next to its own result — and
  // the list refreshes on save, so a mistyped band ID shows up immediately as a
  // row that is not the one you meant.
  const [newBandId, setNewBandId] = useState('')
  const [newRecipient, setNewRecipient] = useState('')
  const [newNote, setNewNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')
  const [createErr, setCreateErr] = useState('')
  const [rows, setRows] = useState<Dedication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/dedications')
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not load dedications.'); return }
      setRows(d.dedications || [])
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function preDedicate() {
    if (!newBandId.trim()) { setCreateErr('Enter a band ID.'); setCreateMsg(''); return }
    setCreating(true); setCreateErr(''); setCreateMsg('')
    try {
      const res = await fetch('/api/save-dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId: newBandId.trim(), dedication_recipient: newRecipient, dedication_note: newNote, adminOverride: true }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCreateErr(d.error || 'Could not save.'); return }
      // Echo the band the server actually wrote to, normalized, so a mistyped
      // ID reads as somebody else's band rather than a bare "Saved".
      setCreateMsg(`Saved to ${d.bandId || newBandId.trim().toUpperCase()}`)
      setNewBandId(''); setNewRecipient(''); setNewNote('')
      await load()
      setTimeout(() => setCreateMsg(''), 6000)
    } catch { setCreateErr('Network error.') }
    finally { setCreating(false) }
  }

  function startEdit(d: Dedication) {
    setEditing(d.band_id); setRecipient(d.recipient); setNote(d.note); setError(''); setSaved('')
  }

  async function save(bandId: string) {
    setSaving(true); setError(''); setSaved('')
    try {
      // Same endpoint the pre-dedicate panel uses, so there is one write path
      // and one set of rules about what a valid dedication is.
      const res = await fetch('/api/save-dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, dedication_recipient: recipient, dedication_note: note, adminOverride: true }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not save.'); return }
      setSaved(bandId); setEditing(null)
      await load()
      setTimeout(() => setSaved(''), 4000)
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  const onShelf = rows.filter(d => d.on_shelf)

  // "Waiting" means nobody has opened it: no stop on the band and the gift
  // screen never shown. Both are checked because they can disagree — a band can
  // be tapped without the dedication being displayed — and either one happening
  // means the moment has passed.
  const isWaiting = (d: Dedication) => d.stops === 0 && !d.viewed
  const matches = (d: Dedication) =>
    filter === 'all' ? true
      : filter === 'waiting' ? isWaiting(d)
      : filter === 'opened' ? !isWaiting(d)
      : d.on_shelf
  const shown = rows.filter(matches)

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'waiting', label: 'Still waiting', count: rows.filter(isWaiting).length },
    { id: 'opened', label: 'Already opened', count: rows.filter(d => !isWaiting(d)).length },
    // Only worth offering when there is something wrong to look at.
    ...(onShelf.length ? [{ id: 'stock' as Filter, label: 'In sellable stock', count: onShelf.length }] : []),
  ]

  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const input = { padding: '9px 12px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', color: C.body, background: '#fff', width: '100%', boxSizing: 'border-box' as const }
  const btn = { padding: '8px 16px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }
  const btnGhost = { ...btn, background: 'transparent', color: C.secondary, border: `1px solid ${C.borderSilver}` }
  const pill = (bg: string, fg: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, fontFamily: 'Inter, sans-serif' })

  return (
    <div style={panel}>
      <div style={head}>Dedications</div>
      <div style={{ padding: 16 }}>
        <div style={{ background: 'rgba(200,169,110,0.07)', border: `1px solid ${C.borderGold || 'rgba(200,169,110,0.34)'}`, borderRadius: 8, padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Pre-dedicate a band</div>
          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 13, lineHeight: 1.5 }}>
            Attach a recipient and message so the band shows a &ldquo;sent especially for you&rdquo; screen on their first tap.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input style={input} value={newBandId} onChange={e => setNewBandId(e.target.value)} placeholder="Band ID (e.g. PB-1234)" />
            <input style={input} value={newRecipient} onChange={e => setNewRecipient(e.target.value)} placeholder="Recipient name" />
          </div>
          <textarea style={{ ...input, minHeight: 72, resize: 'vertical' }} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Personal message…" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <button style={{ ...btn, cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.6 : 1 }} onClick={preDedicate} disabled={creating}>
              {creating ? 'Saving…' : 'Save dedication'}
            </button>
            {createMsg && <span style={{ fontSize: 13, color: '#4E6340', fontWeight: 600 }}>{createMsg} ✓</span>}
            {createErr && <span style={{ fontSize: 13, color: '#B4441F' }}>{createErr}</span>}
          </div>
        </div>

        {onShelf.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(180,68,31,0.06)', border: '1px solid rgba(180,68,31,0.28)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#B4441F', marginBottom: 6 }}>
              {onShelf.length === 1 ? 'A dedicated band is still in sellable stock' : `${onShelf.length} dedicated bands are still in sellable stock`}
            </div>
            <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6 }}>
              {onShelf.map(d => <strong key={d.band_id} style={{ color: C.body }}>{d.band_id} </strong>)}
              &mdash; the picker can put {onShelf.length === 1 ? 'this' : 'these'} in a customer&rsquo;s order, and they would open a
              message written for someone else. Hand {onShelf.length === 1 ? 'it' : 'them'} out from the Give away page, or clear the dedication.
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: '#B4441F', marginBottom: 12 }}>{error}</div>}

        {!loading && rows.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {FILTERS.map(f => {
              const on = filter === f.id
              const alert = f.id === 'stock'
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: on ? 700 : 500,
                    background: on ? (alert ? '#B4441F' : C.navy) : 'transparent',
                    color: on ? '#F6F1E4' : (alert ? '#B4441F' : C.secondary),
                    border: `1px solid ${on ? (alert ? '#B4441F' : C.navy) : (alert ? 'rgba(180,68,31,0.4)' : C.borderSilver)}`,
                  }}
                >
                  {f.label} <span style={{ opacity: 0.75 }}>{f.count}</span>
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>No dedications yet.</div>
        ) : shown.length === 0 ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>
            {filter === 'waiting' ? 'Every dedication has been opened.'
              : filter === 'opened' ? 'None have been opened yet.'
              : 'Nothing here.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map(d => (
              <div key={d.band_id} style={{ border: `1px solid ${d.on_shelf ? 'rgba(180,68,31,0.35)' : C.borderSilver}`, borderRadius: 8, padding: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 }}>
                  <strong style={{ fontSize: 13, color: C.heading, fontFamily: 'Inter, sans-serif' }}>{d.band_id}</strong>
                  <span style={{ fontSize: 11, color: C.secondary }}>{d.design}</span>
                  {d.viewed
                    ? <span style={pill('rgba(122,142,110,0.16)', '#4E6340')}>Seen</span>
                    : <span style={pill('rgba(200,169,110,0.20)', '#8A6D2F')}>Not yet seen</span>}
                  {d.on_shelf && <span style={pill('rgba(180,68,31,0.12)', '#B4441F')}>In stock</span>}
                  <span style={{ fontSize: 11, color: C.secondary, marginLeft: 'auto' }}>{when(d.updated_at)}</span>
                </div>

                {editing === d.band_id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input style={input} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="For (recipient's name)" />
                    <textarea style={{ ...input, minHeight: 84, resize: 'vertical' }} value={note} onChange={e => setNote(e.target.value)} placeholder="The message" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btn} onClick={() => save(d.band_id)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                      <button style={btnGhost} onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {d.recipient && <div style={{ fontSize: 13, color: C.body, marginBottom: 3 }}><strong style={{ color: C.heading }}>For:</strong> {d.recipient}</div>}
                    {d.note && <div style={{ fontSize: 13, color: C.goldDark || C.body, fontStyle: 'italic', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>&ldquo;{d.note}&rdquo;</div>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 9, flexWrap: 'wrap' }}>
                      <button style={btnGhost} onClick={() => startEdit(d)}>Edit</button>
                      {saved === d.band_id && <span style={{ fontSize: 12, color: '#4E6340' }}>Saved.</span>}
                      {!d.editable && (
                        <span style={{ fontSize: 11, color: C.secondary }}>
                          {d.viewed || d.stops > 0
                            ? 'Already opened — an edit won’t change what they saw.'
                            : ''}
                        </span>
                      )}
                      {d.owner_email && <span style={{ fontSize: 11, color: C.secondary }}>Held by {d.owner_email}</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
