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

// Read and edit every dedication in one place. Previously a dedication could
// only be reached one band at a time by typing an ID you already knew, which
// works when the band is in your hand and not at all for "what did I write
// lately" — or for noticing one sitting somewhere it shouldn't be.
export default function DedicationsManager({ C }: { C: C }) {
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

  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const input = { padding: '9px 12px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', color: C.body, background: '#fff', width: '100%', boxSizing: 'border-box' as const }
  const btn = { padding: '8px 16px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }
  const btnGhost = { ...btn, background: 'transparent', color: C.secondary, border: `1px solid ${C.borderSilver}` }
  const pill = (bg: string, fg: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, fontFamily: 'Inter, sans-serif' })

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

  return (
    <div style={panel}>
      <div style={head}>Dedications</div>
      <div style={{ padding: 16 }}>
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

        {loading ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>No dedications yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(d => (
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
