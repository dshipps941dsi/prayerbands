'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type Band = { band_id: string; label: string | null; status: string | null; taken: boolean; holder: string | null; credited_to: string | null }
type Batch = {
  key: string; created_at: string; reason: string; recipient_name: string | null; recipient_email: string | null; note: string | null
  upline_email: string | null; upline_user_id: string | null; upline_name: string | null
  handout_ids: number[]; bands: Band[]
}

const REASON_LABEL: Record<string, string> = { seed: 'Seeding', donation: 'Donation', gift: 'Gift', sample: 'Sample', damaged: 'Damaged' }

// Recent batches scanned out of stock, newest first. A batch that left with no
// giver on it is flagged; type the person's email and the whole batch is
// credited to them, so their downline forms even though the bands are long gone.
export default function HandoutBatches({ C }: { C: C }) {
  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [days, setDays] = useState(90)
  const [emailFor, setEmailFor] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [msgFor, setMsgFor] = useState<Record<string, string>>({})
  const [onlyUncredited, setOnlyUncredited] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/handout-batches?days=${days}`)
    const d = await res.json().catch(() => ({}))
    setBatches(res.ok ? (d.batches ?? []) : [])
  }, [days])
  useEffect(() => { load() }, [load])

  async function credit(b: Batch) {
    const email = (emailFor[b.key] || '').trim()
    if (!email) return
    setBusyKey(b.key); setMsgFor(m => ({ ...m, [b.key]: '' }))
    const res = await fetch('/api/admin/handout-batches', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handout_ids: b.handout_ids, email }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      let msg = `✅ ${d.count} band${d.count === 1 ? '' : 's'} credited to ${d.email}.`
      msg += d.linked ? ' Linked to their account.' : ' No account yet — it attaches when they sign up.'
      if (d.placed?.length) msg += ` Placed under them: ${d.placed.join(', ')}.`
      setMsgFor(m => ({ ...m, [b.key]: msg }))
      setEmailFor(m => ({ ...m, [b.key]: '' }))
      load()
    } else {
      setMsgFor(m => ({ ...m, [b.key]: '❌ ' + (d.error || 'Could not credit that batch.') }))
    }
    setBusyKey(null)
  }

  const shown = (batches ?? []).filter(b => !onlyUncredited || !b.upline_email)
  const uncredited = (batches ?? []).filter(b => !b.upline_email).length

  return (
    <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '22px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Taken out of stock</h2>
        {batches && <span style={{ fontSize: 13, color: C.secondary }}>{batches.length} batch{batches.length === 1 ? '' : 'es'} in the last {days} days{uncredited ? ` · ${uncredited} with no giver` : ''}</span>}
      </div>
      <p style={{ fontSize: 13, color: C.secondary, margin: '0 0 14px', lineHeight: 1.5 }}>
        Every scan-out, grouped as it was scanned. A batch that left with no email can be credited to the giver here later, so the people they hand bands to land under them.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.borderNavy}`, background: C.pageBg, fontSize: 13 }}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.body, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyUncredited} onChange={e => setOnlyUncredited(e.target.checked)} /> Only batches with no giver
        </label>
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${C.borderNavy}`, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: C.secondary, cursor: 'pointer' }}>Refresh</button>
      </div>

      {batches === null && <p style={{ fontSize: 13, color: C.secondary }}>Loading…</p>}
      {batches && shown.length === 0 && <p style={{ fontSize: 13, color: C.secondary }}>Nothing here.</p>}

      {shown.map(b => {
        const taken = b.bands.filter(x => x.taken).length
        const nogiver = !b.upline_email
        return (
          <div key={b.key} style={{ border: `1px solid ${nogiver ? 'rgba(200,169,110,0.7)' : C.borderSilver}`, background: nogiver ? 'rgba(200,169,110,0.08)' : 'transparent', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 14.5, color: C.heading }}>{new Date(b.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
              <span style={{ fontSize: 12, color: C.goldText, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{REASON_LABEL[b.reason] || b.reason}</span>
              <span style={{ fontSize: 13, color: C.secondary }}>{b.bands.length} band{b.bands.length === 1 ? '' : 's'}{taken ? ` · ${taken} taken` : ''}</span>
              {b.recipient_name && <span style={{ fontSize: 13, color: C.body }}>to {b.recipient_name}</span>}
            </div>
            <div style={{ fontSize: 13, marginTop: 6, color: nogiver ? '#8A6A1E' : C.body }}>
              {nogiver
                ? '⚠ No giver on this batch — nobody gets credit yet.'
                : <>Credited to <strong>{b.upline_name || b.upline_email}</strong>{b.upline_name ? ` (${b.upline_email})` : ''}{b.upline_user_id ? '' : ' · no account yet, attaches on sign-up'}</>}
              {b.note && <span style={{ color: C.secondary }}> · “{b.note}”</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {b.bands.map(x => (
                <span key={x.band_id} title={x.taken ? `Taken${x.holder ? ` by ${x.holder}` : ''}${x.credited_to && x.credited_to !== b.upline_email ? ` · credited to ${x.credited_to}` : ''}` : x.credited_to && x.credited_to !== b.upline_email ? `Credited to ${x.credited_to}` : 'Not taken yet'}
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, background: x.taken ? 'rgba(74,138,106,0.12)' : '#fff', color: C.body }}>
                  {x.band_id}{x.label ? <span style={{ color: C.secondary }}> · {x.label}</span> : ''}{x.taken ? ' ✓' : ''}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={emailFor[b.key] || ''}
                onChange={e => setEmailFor(m => ({ ...m, [b.key]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') credit(b) }}
                placeholder={nogiver ? 'Giver’s email — credit this batch' : 'Change the giver (email)'}
                style={{ flex: '1 1 240px', padding: '9px 12px', borderRadius: 7, border: `1px solid ${C.borderNavy}`, fontSize: 14, background: C.pageBg }}
              />
              <button onClick={() => credit(b)} disabled={busyKey === b.key || !(emailFor[b.key] || '').trim()}
                style={{ background: (emailFor[b.key] || '').trim() ? C.gold : C.silver, color: (emailFor[b.key] || '').trim() ? C.navy : '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif', cursor: 'pointer' }}>
                {busyKey === b.key ? 'Saving…' : nogiver ? 'Credit batch' : 'Re-credit'}
              </button>
            </div>
            {msgFor[b.key] && <div style={{ fontSize: 13, marginTop: 8, color: msgFor[b.key].startsWith('✅') ? C.green : C.red }}>{msgFor[b.key]}</div>}
          </div>
        )
      })}
    </div>
  )
}
