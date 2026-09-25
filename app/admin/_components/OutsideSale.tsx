'use client'
import { useState } from 'react'

type C = Record<string, string>

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'venmo', label: 'Venmo' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'check', label: 'Check' },
  { id: 'card', label: 'Card, in person' },
  { id: 'other', label: 'Other' },
]

// Record a sale that happened away from the site. It becomes an order, so
// Sales counts it, the bands leave stock, and the buyer is credited as giver.
export default function OutsideSale({ C, onRecorded }: { C: C; onRecorded?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('venmo')
  const [ids, setIds] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const bandIds = ids.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
  const cents = Math.round(Number(amount.replace(/[$,]/g, '')) * 100)
  const ready = name.trim() && bandIds.length > 0 && Number.isFinite(cents) && cents >= 0 && amount.trim() !== ''

  async function submit() {
    if (!ready || busy) return
    setBusy(true); setMsg('')
    const res = await fetch('/api/admin/outside-sale', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name.trim(), customerEmail: email.trim(), amountCents: cents, method, bandIds, note: note.trim() }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setMsg(`✅ Recorded as order #${d.orderId}: ${d.count} band${d.count === 1 ? '' : 's'}, $${(cents / 100).toFixed(2)} by ${METHODS.find(m => m.id === method)?.label || method}.` +
        (d.credited ? (d.linked ? ' Credited to their account as the giver.' : ' Credited by email; it attaches when they sign up.') : ' No email given, so nobody is credited as the giver yet — you can add one under Inventory → Taken out of stock.'))
      setName(''); setEmail(''); setAmount(''); setIds(''); setNote('')
      onRecorded?.()
    } else {
      setMsg('❌ ' + (d.error || 'Could not record the sale.'))
    }
    setBusy(false)
  }

  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 7, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 6, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '18px 24px', marginBottom: 20 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Record an outside sale</span>
        <span style={{ fontSize: 13, color: C.secondary }}>cash, Venmo, check, a sale made in person</span>
        <span style={{ marginLeft: 'auto', color: C.secondary }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 16 }}>
          <div className="pb-admin-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={label}>Buyer’s name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Jonathan Shipps" style={input} /></div>
            <div><label style={label}>Buyer’s email <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(so they get credit as the giver)</span></label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" inputMode="email" style={input} /></div>
            <div><label style={label}>Amount paid</label><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="40.00" inputMode="decimal" style={input} /></div>
            <div><label style={label}>How they paid</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={input}>
                {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={label}>Band IDs <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(one per line or comma-separated; bands already scanned out are fine)</span></label>
            <textarea value={ids} onChange={e => setIds(e.target.value)} rows={3} placeholder={'PB-8L5X3\nPB-BR4E3\nPB-3L4MZ'} style={{ ...input, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={label}>Note <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Sold after service, Sept 25" style={input} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={submit} disabled={!ready || busy} style={{ background: ready ? C.gold : C.silver, color: ready ? C.navy : '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif', cursor: ready ? 'pointer' : 'default' }}>
              {busy ? 'Recording…' : `Record sale${bandIds.length ? ` · ${bandIds.length} band${bandIds.length === 1 ? '' : 's'}` : ''}`}
            </button>
            <span style={{ fontSize: 12.5, color: C.secondary }}>Counts in Sales. Bands leave stock. Nothing is charged; the money already changed hands.</span>
          </div>
          {msg && <div style={{ marginTop: 12, fontSize: 13.5, color: msg.startsWith('✅') ? C.green : C.red, lineHeight: 1.5 }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
