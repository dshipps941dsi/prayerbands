'use client'
import { useEffect, useState } from 'react'

// Subscription card for the band page's Account tab: plan, cadence, next ship
// date, billing (Stripe portal), the design/size for the next shipment, and
// the gift message on the shipment being packed. Renders nothing for people
// without a subscription. This used to live only on the old dashboard.

const GOLD = 'var(--pb-primary, #B8860B)'
const DARK = 'var(--pb-text, #2C1810)'
const GRAY = 'var(--pb-text-muted, #7A6A5A)'
const INK = 'var(--pb-text-on-primary, #0f0d09)'
const CREAM = 'var(--pb-background, #FAF6EF)'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const BORDER = '1px solid rgba(44,24,16,0.12)'

const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#2E7D5B' },
  trialing: { label: 'Trial', color: '#2E7D5B' },
  past_due: { label: 'Payment due', color: '#C0392B' },
  paused: { label: 'Paused', color: '#9B7B62' },
  canceled: { label: 'Cancelled', color: '#9B7B62' },
  cancelled: { label: 'Cancelled', color: '#9B7B62' },
}

export default function SubscriptionPanel({ userId }: { userId: string | null }) {
  const [sub, setSub] = useState<any>(null)
  const [shipment, setShipment] = useState<any>(null)
  const [designs, setDesigns] = useState<{ slug: string; name: string }[]>([])
  const [design, setDesign] = useState('')
  const [size, setSize] = useState('M')
  const [recipient, setRecipient] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'portal' | 'prefs' | 'note' | null>(null)
  const [msg, setMsg] = useState<{ where: 'prefs' | 'note'; text: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch('/api/my-subscription').then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.subscription) return
      setSub(d.subscription); setShipment(d.pendingShipment || null)
      setDesign(d.subscription.band_design || ''); setSize(String(d.subscription.band_size || 'M').toUpperCase())
      setRecipient(d.pendingShipment?.dedication_recipient || ''); setNote(d.pendingShipment?.dedication_note || '')
      fetch('/api/products').then(r => r.json()).then(({ products }) => {
        setDesigns((products || []).filter((p: any) => p.category === 'band').map((p: any) => ({ slug: p.slug, name: p.name })))
      }).catch(() => {})
    }).catch(() => {})
  }, [userId])

  if (!userId || !sub) return null

  const plan = sub.subscription_plans || {}
  const months = plan.interval_months || 1
  const cadence = months > 1 ? `Every ${months} months` : 'Every month'
  const perCycle = plan.bands_per_cycle || 1
  const cancelScheduled = !!sub.cancel_at_period_end
  const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
  const badge = cancelScheduled
    ? { label: `Cancels ${fmt(sub.current_period_end)}`, color: '#C0853E' }
    : (STATUS[sub.status] || { label: String(sub.status || ''), color: '#9B7B62' })
  const prefsChanged = design !== (sub.band_design || '') || size !== String(sub.band_size || 'M').toUpperCase()
  const noteChanged = !!shipment && (recipient !== (shipment.dedication_recipient || '') || note !== (shipment.dedication_note || ''))

  async function openPortal() {
    setBusy('portal')
    try {
      const d = await fetch('/api/billing-portal', { method: 'POST' }).then(r => r.json())
      if (d.url) { window.location.href = d.url; return }
    } catch {}
    setBusy(null)
  }
  async function savePrefs() {
    setBusy('prefs'); setMsg(null)
    try {
      const res = await fetch('/api/my-subscription', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ band_design: design, band_size: size }) })
      const d = await res.json()
      if (res.ok && d.subscription) { setSub(d.subscription); setMsg({ where: 'prefs', text: 'Saved ✓' }) }
      else setMsg({ where: 'prefs', text: d.error || 'Could not save.' })
    } catch { setMsg({ where: 'prefs', text: 'Network error.' }) }
    setBusy(null)
  }
  async function saveNote() {
    setBusy('note'); setMsg(null)
    try {
      const res = await fetch('/api/my-shipment-note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dedication_recipient: recipient, dedication_note: note }) })
      const d = await res.json()
      if (res.ok && d.shipment) { setShipment(d.shipment); setMsg({ where: 'note', text: 'Saved ✓' }) }
      else setMsg({ where: 'note', text: d.error || 'Could not save.' })
    } catch { setMsg({ where: 'note', text: 'Network error.' }) }
    setBusy(null)
  }

  const label: React.CSSProperties = { fontFamily: body, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: GRAY, marginBottom: 4 }
  const value: React.CSSProperties = { fontFamily: body, fontSize: 14, fontWeight: 600, color: DARK }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: BORDER, borderRadius: 8, background: CREAM, color: DARK, fontFamily: body, fontSize: 14, outline: 'none' }
  const saveBtn = (on: () => void, working: boolean) => (
    <button onClick={on} disabled={working} style={{ background: GOLD, color: INK, border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: serif, fontSize: 13, fontWeight: 700, cursor: working ? 'wait' : 'pointer' }}>{working ? 'Saving…' : 'Save'}</button>
  )
  const feedback = (where: 'prefs' | 'note') => msg?.where === where
    ? <span style={{ fontFamily: body, fontSize: 12.5, color: msg.text === 'Saved ✓' ? '#2E7D5B' : '#C0392B' }}>{msg.text}</span>
    : null

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: BORDER, borderLeft: `4px solid ${GOLD}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span aria-hidden="true" style={{ fontSize: 16 }}>🔁</span>
        <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: DARK }}>{plan.name || 'Your Subscription'}</span>
        <span style={{ background: `${badge.color}1f`, color: badge.color, border: `1px solid ${badge.color}55`, fontFamily: body, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 100 }}>{badge.label}</span>
        <button onClick={openPortal} disabled={busy === 'portal'} style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${GOLD}`, color: DARK, borderRadius: 8, padding: '6px 12px', fontFamily: body, fontSize: 12.5, fontWeight: 600, cursor: busy === 'portal' ? 'wait' : 'pointer' }}>
          {busy === 'portal' ? 'Opening…' : 'Billing & cancel'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div><div style={label}>Cadence</div><div style={value}>{cadence}</div></div>
        <div><div style={label}>Bands per shipment</div><div style={value}>{perCycle}</div></div>
        <div><div style={label}>Design</div><div style={value}>{designs.find(d => d.slug === sub.band_design)?.name || sub.band_design || 'Standard'}</div></div>
        <div><div style={label}>{cancelScheduled ? 'Cancels on' : 'Next shipment'}</div><div style={{ ...value, color: cancelScheduled ? '#C0853E' : DARK }}>{cancelScheduled ? fmt(sub.current_period_end) : fmt(sub.next_ship_date)}</div></div>
      </div>

      <div style={{ borderTop: BORDER, marginTop: 14, paddingTop: 14 }}>
        <div style={label}>Next shipment preferences</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <select value={design} onChange={e => setDesign(e.target.value)} style={{ ...input, width: 'auto', flex: 1, minWidth: 160 }}>
            {designs.length === 0 && <option value="">Loading designs…</option>}
            {designs.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            {['S', 'M', 'L'].map(s => (
              <button key={s} onClick={() => setSize(s)} style={{ padding: '8px 13px', borderRadius: 8, border: size === s ? `2px solid ${GOLD}` : BORDER, background: size === s ? 'rgba(184,134,11,0.12)' : 'white', color: DARK, fontFamily: body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
          {prefsChanged && saveBtn(savePrefs, busy === 'prefs')}
          {feedback('prefs')}
        </div>
      </div>

      {shipment && (
        <div style={{ borderTop: BORDER, marginTop: 14, paddingTop: 14 }}>
          <div style={label}>Gift message for the shipment being packed</div>
          <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient's name (optional)" style={{ ...input, marginTop: 6, marginBottom: 8 }} />
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 300))} placeholder="A short message they'll read on their first tap…" rows={3} style={{ ...input, resize: 'vertical' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            {noteChanged && saveBtn(saveNote, busy === 'note')}
            {feedback('note')}
          </div>
        </div>
      )}
    </div>
  )
}
