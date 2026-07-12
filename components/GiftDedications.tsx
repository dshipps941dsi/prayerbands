'use client'

import { useEffect, useState } from 'react'

interface Ded {
  band_id: string
  dedication_recipient: string
  dedication_note: string
  taps: number
}

const MAX_NOTE = 300
const CARD = '#FFFDF8'
const NAVY = '#15223B'
const GOLD = '#C8A96E'
const GOLD_TEXT = '#9A7A35'
const SLATE = '#5C6573'
const CREAM = '#F6F1E4'
const BORDER = 'rgba(10,22,40,0.12)'

// Dashboard section: add/edit the gift dedication on any band you own that
// hasn't been opened yet. Authorized by ownership server-side — no token link
// needed. Renders nothing if you have no un-opened bands.
export default function GiftDedications({ userId, readOnly = false }: { userId?: string; readOnly?: boolean }) {
  const [bands, setBands] = useState<Ded[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/my-dedications')
      if (res.ok) setBands((await res.json()).bands ?? [])
      else setBands([])
    } catch { setBands([]) }
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId])

  function startEdit(b: Ded) {
    setEditing(b.band_id)
    setRecipient(b.dedication_recipient)
    setNote(b.dedication_note)
    setErr('')
  }

  async function save(bandId: string) {
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/my-dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, dedication_recipient: recipient, dedication_note: note }),
      })
      if (res.ok) {
        setBands(prev => (prev ?? []).map(b => b.band_id === bandId ? { ...b, dedication_recipient: recipient.trim(), dedication_note: note.trim() } : b))
        setEditing(null)
      } else {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Could not save.')
      }
    } catch { setErr('Network error.') }
    setSaving(false)
  }

  // Hide entirely until we know there's something to manage.
  if (!bands || bands.length === 0) return null

  const label: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: GOLD_TEXT, fontFamily: 'Cinzel, serif', marginBottom: 6 }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 8, background: CREAM, color: NAVY, outline: 'none', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(10,22,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🎁</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: NAVY, margin: 0, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Gift Dedications</h2>
      </div>
      <p style={{ fontSize: 13, color: SLATE, margin: '0 0 14px', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
        A personal message the recipient sees the first time they tap the band. Add or edit it anytime before it&rsquo;s opened.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bands.map(b => {
          const isEditing = editing === b.band_id
          const has = !!(b.dedication_note || b.dedication_recipient)
          return (
            <div key={b.band_id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: NAVY }}>{b.band_id}</span>
                <span style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: GOLD_TEXT, fontFamily: 'Cinzel, serif' }}>Not yet opened</span>
              </div>

              {!isEditing && (
                <div style={{ marginTop: 8 }}>
                  {has ? (
                    <div>
                      {b.dedication_recipient && <div style={{ fontSize: 13, color: NAVY }}><strong>For:</strong> {b.dedication_recipient}</div>}
                      {b.dedication_note && <div style={{ fontSize: 13, color: SLATE, fontStyle: 'italic', marginTop: 3, lineHeight: 1.5, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>&ldquo;{b.dedication_note}&rdquo;</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: SLATE, fontStyle: 'italic' }}>No message yet.</div>
                  )}
                  {!readOnly && (
                    <button onClick={() => startEdit(b)} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD_TEXT, borderRadius: 8, padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {has ? 'Edit message' : 'Add message'}
                    </button>
                  )}
                </div>
              )}

              {isEditing && (
                <div style={{ marginTop: 12 }}>
                  <label style={label}>Recipient&rsquo;s name</label>
                  <input style={{ ...input, marginBottom: 12 }} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Who is this band for?" />
                  <label style={label}>Personal message</label>
                  <textarea style={{ ...input, minHeight: 90, resize: 'vertical', fontFamily: 'Cormorant Garamond, Georgia, serif', lineHeight: 1.6 }} value={note} onChange={e => setNote(e.target.value.slice(0, MAX_NOTE))} placeholder="A blessing, a verse, why you're praying for them…" />
                  <div style={{ fontSize: 11.5, color: SLATE, textAlign: 'right', margin: '4px 0 10px' }}>{note.length}/{MAX_NOTE}</div>
                  {err && <div style={{ color: '#C0392B', fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => save(b.band_id)} disabled={saving} style={{ background: NAVY, color: '#F5EDD8', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 11.5, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => { setEditing(null); setErr('') }} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: SLATE, borderRadius: 8, padding: '9px 18px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
