'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { validateChurchTiers, churchTierFor, churchTierLabel, formatCents, type ChurchTier } from '@/lib/church-pricing'

// Church quantity pricing editor (Admin > Pricing). A list of tiers, each
// "from this many bands, this price per band". A tier runs up to one below the
// next tier, and the first tier's quantity is the smallest order a church can
// place. Saved tiers are what the church checkout charges.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', heading: '#15223B', body: '#2A3344', secondary: '#5C6573',
  borderNavy: 'rgba(10,22,40,0.12)', red: '#B4441F', green: '#4A8A6A', amber: '#8A6A1E',
}

type Row = { id: number; min: string; price: string }
let nextRowId = 1
const toRows = (tiers: ChurchTier[]): Row[] => tiers.map(t => ({ id: nextRowId++, min: String(t.min), price: (t.cents / 100).toFixed(2) }))

// What the rows mean as tiers. A first quantity typed as 0 is read as 1,
// since nobody orders zero bands; the preview shows it as "1".
const toTiers = (rows: Row[]) => rows.map(r => {
  const min = Number(r.min)
  return { min: min === 0 ? 1 : min, cents: Math.round(Number(r.price) * 100) }
})

const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ChurchPricing() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [savedJson, setSavedJson] = useState('')
  const [usingBuiltIn, setUsingBuiltIn] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [checkQty, setCheckQty] = useState('750')

  async function load() {
    setLoadErr('')
    const res = await fetch('/api/admin/church-pricing')
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !Array.isArray(d.tiers)) { setLoadErr(d.error || 'Could not load church pricing.'); return }
    setRows(toRows(d.tiers))
    setSavedJson(JSON.stringify(d.tiers))
    setUsingBuiltIn(!d.saved)
  }
  useEffect(() => { load() }, [])

  const incomplete = !!rows && rows.some(r => r.min.trim() === '' || r.price.trim() === '')
  const checked = rows && !incomplete ? validateChurchTiers(toTiers(rows)) : null
  const tiers = checked && 'tiers' in checked ? checked.tiers : null
  const problem = checked && 'error' in checked ? checked.error : null
  const dirty = !!tiers && JSON.stringify(tiers) !== savedJson
  const canSave = !!tiers && !busy && (dirty || usingBuiltIn)

  // Not an error, but worth a second look: a bigger order that costs more per band.
  const upsideDown = tiers ? tiers.filter((t, i) => i > 0 && t.cents > tiers[i - 1].cents) : []

  function edit(id: number, patch: Partial<Row>) {
    setMsg(null)
    setRows(prev => (prev || []).map(r => r.id === id ? { ...r, ...patch } : r))
  }
  function addRow() {
    setMsg(null)
    setRows(prev => [...(prev || []), { id: nextRowId++, min: '', price: '' }])
  }
  function removeRow(id: number) {
    setMsg(null)
    setRows(prev => (prev || []).filter(r => r.id !== id))
  }

  async function save() {
    if (!tiers || busy) return
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/church-pricing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok && Array.isArray(d.tiers)) {
      setRows(toRows(d.tiers))
      setSavedJson(JSON.stringify(d.tiers))
      setUsingBuiltIn(false)
      setMsg({ ok: true, text: 'Saved. Churches see these prices on their next order.' })
    } else {
      setMsg({ ok: false, text: 'Not saved: ' + (d.error || 'something went wrong. Nothing has changed.') })
    }
    setBusy(false)
  }

  const qtyNum = Number(checkQty)
  const checkTier = tiers && checkQty.trim() !== '' ? churchTierFor(qtyNum, tiers) : null

  const input: CSSProperties = { width: 92, padding: '8px 10px', border: '1px solid ' + C.borderNavy, borderRadius: 6, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, outline: 'none', boxSizing: 'border-box' }
  const word: CSSProperties = { fontSize: 13, color: C.secondary, fontFamily: 'Inter, sans-serif' }
  const smallBtn: CSSProperties = { background: 'transparent', color: C.secondary, border: '1px solid ' + C.borderNavy, borderRadius: 6, padding: '7px 12px', fontSize: 12, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }
  const saveBtn: CSSProperties = { background: canSave ? C.gold : 'rgba(10,22,40,0.10)', color: canSave ? C.navy : C.secondary, border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }

  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Church Quantity Pricing</h2>
      <p style={{ fontSize: 13, color: C.secondary, margin: '0 0 16px', lineHeight: 1.5 }}>
        What a church account pays per band, by order size. Each tier runs up to one below the next, and the last has no upper limit. The first tier is the smallest order a church can place.
      </p>

      <div style={{ background: C.card, border: '1px solid ' + C.borderNavy, borderRadius: 8, padding: '16px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
        {loadErr && (
          <div style={{ fontSize: 13, color: C.red }}>
            {loadErr} <button onClick={load} style={{ ...smallBtn, marginLeft: 8 }}>Try again</button>
          </div>
        )}
        {!loadErr && !rows && <div style={{ fontSize: 13, color: C.secondary }}>Loading…</div>}

        {rows && (
          <>
            {usingBuiltIn && (
              <div style={{ fontSize: 12.5, color: C.amber, background: 'rgba(200,169,110,0.14)', borderRadius: 6, padding: '8px 10px', marginBottom: 12, lineHeight: 1.5 }}>
                These are the built-in prices, the ones churches are charged today. Change them or leave them, then Save to store them here.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={word}>From</span>
                  <input type="number" inputMode="numeric" min={1} step={1} value={r.min} onChange={e => edit(r.id, { min: e.target.value })} aria-label="Quantity this tier starts at" placeholder="500" style={input} />
                  <span style={word}>bands</span>
                  <span style={{ color: C.goldText, fontWeight: 600, marginLeft: 6 }}>$</span>
                  <input type="number" inputMode="decimal" min={0} step={0.01} value={r.price} onChange={e => edit(r.id, { price: e.target.value })} aria-label="Price per band" placeholder="3.75" style={input} />
                  <span style={word}>per band</span>
                  <button onClick={() => removeRow(r.id)} disabled={rows.length <= 1} style={{ ...smallBtn, marginLeft: 'auto', opacity: rows.length <= 1 ? 0.4 : 1, cursor: rows.length <= 1 ? 'default' : 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={addRow} style={smallBtn}>+ Add tier</button>
              {dirty && !usingBuiltIn && <button onClick={() => { setMsg(null); load() }} style={smallBtn}>Undo changes</button>}
              <button onClick={save} disabled={!canSave} style={{ ...saveBtn, marginLeft: 'auto' }}>{busy ? 'Saving…' : 'Save prices'}</button>
            </div>

            {incomplete && <div style={{ fontSize: 12.5, color: C.secondary, marginTop: 10 }}>Fill in the quantity and the price for every tier, or remove the empty one.</div>}
            {problem && <div style={{ fontSize: 12.5, color: C.red, marginTop: 10 }}>{problem}</div>}
            {msg && <div style={{ fontSize: 13, color: msg.ok ? C.green : C.red, marginTop: 10 }}>{msg.text}</div>}

            {tiers && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid ' + C.borderNavy }}>
                <div style={{ fontSize: 11, color: C.goldText, fontFamily: 'Cinzel, serif', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                  {dirty ? 'What churches will see once saved' : 'What churches see'}
                </div>
                {tiers.map((t, i) => (
                  <div key={t.min} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', fontSize: 13, color: C.body, fontFamily: 'Inter, sans-serif' }}>
                    <span>{churchTierLabel(tiers, i)}</span>
                    <span>{formatCents(t.cents)}/band</span>
                  </div>
                ))}
                <div style={{ fontSize: 12.5, color: C.secondary, marginTop: 6 }}>
                  Smallest order: {tiers[0].min.toLocaleString('en-US')} {tiers[0].min === 1 ? 'band' : 'bands'}.
                </div>
                {upsideDown.map(t => (
                  <div key={t.min} style={{ fontSize: 12.5, color: C.amber, marginTop: 6 }}>
                    Check this one: from {t.min.toLocaleString('en-US')} bands costs more per band than the tier before it.
                  </div>
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <span style={word}>Try a quantity</span>
                  <input type="number" inputMode="numeric" min={1} step={1} value={checkQty} onChange={e => setCheckQty(e.target.value)} aria-label="Quantity to price" style={input} />
                  <span style={{ fontSize: 13, color: C.heading, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    {checkQty.trim() === '' ? '' : checkTier
                      ? qtyNum.toLocaleString('en-US') + ' bands at ' + formatCents(checkTier.cents) + ' = ' + money(qtyNum * checkTier.cents)
                      : Number.isInteger(qtyNum) && qtyNum > 0 ? 'Below the smallest order' : 'Enter a whole number'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
