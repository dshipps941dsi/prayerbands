'use client'
import { useState, useEffect } from 'react'

// Band operations: link bands to an account, complete replacement orders, and
// replace a lost band. Self-contained; the parent screen handles admin auth.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', silver: '#C9CFD6', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderGold: 'rgba(200,169,110,0.34)', borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)', green: '#4A8A6A', red: '#c0392b',
}

export default function BandsManager() {
  const [email, setEmail] = useState('')
  const [assignIds, setAssignIds] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignMsg, setAssignMsg] = useState('')
  const [uplineEmail, setUplineEmail] = useState('')
  const [uplineIds, setUplineIds] = useState('')
  const [uplineMsg, setUplineMsg] = useState('')
  const [uplineSaving, setUplineSaving] = useState(false)
  // Put a band into transfer on the holder's behalf.
  const [xferId, setXferId] = useState('')
  const [xferTo, setXferTo] = useState('')
  const [xferNote, setXferNote] = useState('')
  const [xferMsg, setXferMsg] = useState('')
  const [xferBusy, setXferBusy] = useState(false)

  const [oldId, setOldId] = useState('')
  const [newId, setNewId] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [replaceMsg, setReplaceMsg] = useState('')

  const [pending, setPending] = useState<any[]>([])
  const [pendingIds, setPendingIds] = useState<Record<string, string>>({})
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [pendingMsg, setPendingMsg] = useState('')

  type Finding = { key: string; kind: string; severity: 'high' | 'medium' | 'low'; band_id?: string; summary: string }
  const [integrity, setIntegrity] = useState<Finding[] | null>(null)
  const [integrityBusy, setIntegrityBusy] = useState(false)
  const [integrityMsg, setIntegrityMsg] = useState('')
  async function runIntegrity() {
    setIntegrityBusy(true); setIntegrityMsg('')
    try {
      const res = await fetch('/api/cron/integrity')
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setIntegrityMsg(d.error || 'The check could not run.'); return }
      setIntegrity(d.findings || [])
    } catch { setIntegrityMsg('Network error.') }
    finally { setIntegrityBusy(false) }
  }
  useEffect(() => { runIntegrity() }, [])

  function loadPending() {
    fetch('/api/admin/replacements').then(r => r.json()).then(d => { if (d.pending) setPending(d.pending) }).catch(() => {})
  }

  useEffect(() => { loadPending() }, [])

  async function completeReplacement(orderId: string) {
    const newBandId = (pendingIds[orderId] || '').trim()
    if (!newBandId) return
    setCompletingId(orderId); setPendingMsg('')
    const res = await fetch('/api/admin/replacements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, new_band_id: newBandId }),
    })
    const data = await res.json()
    if (res.ok) {
      setPendingMsg(`✅ ${data.oldBandId} → ${data.newBandId}: moved ${data.movedRegistrations} prayer record(s).`)
      loadPending()
    } else {
      setPendingMsg('❌ ' + (data.error || 'Failed to complete replacement.'))
    }
    setCompletingId(null)
  }

  async function assignBands() {
    setAssigning(true); setAssignMsg('')
    const band_ids = assignIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
    const res = await fetch('/api/admin/assign-bands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, band_ids }),
    })
    const data = await res.json()
    if (res.ok) {
      let msg = `✅ Linked ${data.count} band(s) to ${email}.`
      if (data.missing?.length) msg += ` Not found: ${data.missing.join(', ')}.`
      setAssignMsg(msg)
      setAssignIds('')
    } else {
      setAssignMsg('❌ ' + (data.error || 'Failed to assign bands.'))
    }
    setAssigning(false)
  }

  async function startTransfer() {
    setXferBusy(true); setXferMsg('')
    const res = await fetch('/api/admin/start-transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_id: xferId, recipient_name: xferTo, note: xferNote }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setXferMsg(`✅ ${data.band_id} is in transfer${data.from ? ` from ${data.from}` : ''}${data.recipient_name ? ` to ${data.recipient_name}` : ''}. The next person to tap it gets the hand-off screen.`)
      setXferId(''); setXferTo(''); setXferNote('')
    } else {
      setXferMsg('❌ ' + (data.error || 'Could not start the transfer.'))
    }
    setXferBusy(false)
  }

  async function setUpline() {
    setUplineSaving(true); setUplineMsg('')
    const band_ids = uplineIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
    const res = await fetch('/api/admin/set-upline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uplineEmail, band_ids }),
    })
    const data = await res.json()
    if (res.ok) {
      let msg = `✅ Credited ${data.count} band(s) to ${data.email}.`
      // Worth saying out loud: with no account yet the credit is held against
      // the address and attaches on signup, so this is not a silent no-op.
      msg += data.linked
        ? ' Linked to their account.'
        : ' No account yet — it will attach automatically when they sign up.'
      if (data.placed?.length) msg += ` Placed under them: ${data.placed.join(', ')}.`
      if (data.missing?.length) msg += ` Not found: ${data.missing.join(', ')}.`
      setUplineMsg(msg)
      setUplineIds('')
    } else {
      setUplineMsg('❌ ' + (data.error || 'Failed to credit bands.'))
    }
    setUplineSaving(false)
  }

  async function replaceBand() {
    setReplacing(true); setReplaceMsg('')
    const res = await fetch('/api/admin/replace-band', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_band_id: oldId, new_band_id: newId }),
    })
    const data = await res.json()
    if (res.ok) {
      setReplaceMsg(`✅ ${data.oldBandId} replaced by ${data.newBandId}. Moved ${data.movedRegistrations} prayer record(s); old band retired.`)
      setOldId(''); setNewId('')
    } else {
      setReplaceMsg('❌ ' + (data.error || 'Failed to replace band.'))
    }
    setReplacing(false)
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 7, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none', marginBottom: 14 }
  const btn = (busy: boolean): React.CSSProperties => ({ background: busy ? C.silver : C.gold, color: busy ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 11, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em' })
  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '24px 26px', marginBottom: 24, boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Management</h2>
      <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 20px' }}>Link bands to a personal account, or replace a lost band.</p>

      {/* Things that should not be true. The same check the daily cron runs;
          here it is live, so a problem can be seen the minute it is suspected. */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Things that should not be true</h2>
          <button onClick={runIntegrity} disabled={integrityBusy} style={{ padding: '8px 16px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: integrityBusy ? 'wait' : 'pointer', opacity: integrityBusy ? 0.6 : 1 }}>{integrityBusy ? 'Checking…' : 'Check now'}</button>
        </div>
        <p style={{ fontSize: 13, color: C.secondary, marginBottom: 14, lineHeight: 1.5 }}>A band on the wrong account, a hand-off that landed back on the giver, an owner who isn&rsquo;t the holder, a sign-up that stalled at the code. Runs every day at 8 am Eastern and emails you anything new; this button runs it right now.</p>
        {integrity === null ? (
          <div style={{ fontSize: 13, color: C.secondary }}>Not checked yet this visit.</div>
        ) : integrity.length === 0 ? (
          <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>✓ Nothing found. Every band sits with its holder.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {integrity.map(f => (
              <li key={f.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderTop: `1px solid ${C.borderSilver}`, fontSize: 13, color: C.body, lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 4, marginTop: 2, color: f.severity === 'high' ? '#B4441F' : f.severity === 'medium' ? C.goldText : C.secondary, background: f.severity === 'high' ? 'rgba(180,68,31,0.10)' : f.severity === 'medium' ? 'rgba(200,169,110,0.18)' : '#ECEEF1' }}>{f.severity.toUpperCase()}</span>
                <span>{f.summary}{f.band_id && <> &middot; <a href={`/band/${f.band_id}`} target="_blank" rel="noopener" style={{ color: C.goldText }}>open band ↗</a></>}</span>
              </li>
            ))}
          </ul>
        )}
        {integrityMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: C.red }}>{integrityMsg}</div>}
      </div>

      {/* Pending replacements first and full width: it is the only queue here
          that represents someone waiting, and it reads as a list. */}
      {pending.length > 0 && (
        <div style={{ ...card, borderColor: C.borderGold }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Pending Replacement Orders ({pending.length})</h2>
          <p style={{ fontSize: 13, color: C.secondary, marginBottom: 18, lineHeight: 1.5 }}>Customers who ordered a replacement. Enter the band ID you&rsquo;re shipping and complete — the lost band&rsquo;s journey transfers automatically.</p>
          {pending.map(p => (
            <div key={p.order_id} style={{ borderTop: `1px solid ${C.borderSilver}`, paddingTop: 14, marginTop: 14 }}>
              <div style={{ fontSize: 13, color: C.body, marginBottom: 8 }}>
                Replacing <strong style={{ color: C.heading }}>{p.replaces}</strong> &middot; <span style={{ color: C.secondary }}>{p.email || 'unknown email'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={pendingIds[p.order_id] || ''}
                  onChange={e => setPendingIds(prev => ({ ...prev, [p.order_id]: e.target.value }))}
                  placeholder="Shipped band ID (e.g. PB-NEW34)"
                  style={{ ...input, marginBottom: 0, flex: 1, minWidth: 200 }}
                />
                <button onClick={() => completeReplacement(p.order_id)} disabled={completingId === p.order_id || !(pendingIds[p.order_id] || '').trim()} style={btn(completingId === p.order_id || !(pendingIds[p.order_id] || '').trim())}>
                  {completingId === p.order_id ? 'Completing…' : 'Complete'}
                </button>
              </div>
            </div>
          ))}
          {pendingMsg && <div style={{ marginTop: 14, fontSize: 13, color: pendingMsg.startsWith('❌') ? C.red : C.green, lineHeight: 1.5 }}>{pendingMsg}</div>}
        </div>
      )}

      {/* The two standing tools sit side by side rather than stacked — both are
          short forms, and stacking them pushed "Replace a Lost Band" below the
          fold for no reason. Collapses to one column under 720px. */}
      <div className="pb-admin-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      {/* Assign bands to an account */}
      <div style={card}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Assign Bands to an Account</h2>
        <p style={{ fontSize: 13, color: C.secondary, marginBottom: 18, lineHeight: 1.5 }}>Sets each band&rsquo;s owner to this account so they all appear under the person&rsquo;s dashboard. Useful for sending someone a curated set of design bands.</p>
        <label style={label}>Account email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" style={input} />
        <label style={label}>Band IDs (one per line, or comma/space separated)</label>
        <textarea value={assignIds} onChange={e => setAssignIds(e.target.value)} placeholder={'PB-AB12C\nPB-XY34Z'} rows={4} style={{ ...input, resize: 'vertical', minHeight: 90 }} />
        <button onClick={assignBands} disabled={assigning || !email.trim() || !assignIds.trim()} style={btn(assigning || !email.trim() || !assignIds.trim())}>{assigning ? 'Assigning…' : 'Assign Bands'}</button>
        {assignMsg && <div style={{ marginTop: 14, fontSize: 13, color: assignMsg.startsWith('❌') ? C.red : C.green, lineHeight: 1.5 }}>{assignMsg}</div>}
      </div>

      {/* Attribute bands to whoever hands them out */}
      <div style={card}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Credit Bands to a Giver</h2>
        <p style={{ fontSize: 13, color: C.secondary, marginBottom: 18, lineHeight: 1.5 }}>Records who put these bands into circulation. Their name shows as &ldquo;Given by&rdquo; at the top of each band&rsquo;s journey, and anyone who has already claimed one of these bands is placed under the giver (unless they already have someone above them). Use it to fix bands that were handed out without going through the Hand out tool. The giver does <strong>not</strong> need an account yet — the credit attaches automatically the moment they sign up with this address.</p>
        <label style={label}>Giver&rsquo;s email</label>
        <input value={uplineEmail} onChange={e => setUplineEmail(e.target.value)} placeholder="taylor@example.com" style={input} />
        <label style={label}>Band IDs (one per line, or comma/space separated)</label>
        <textarea value={uplineIds} onChange={e => setUplineIds(e.target.value)} placeholder={'PB-AB12C\nPB-XY34Z'} rows={4} style={{ ...input, resize: 'vertical', minHeight: 90 }} />
        <button onClick={setUpline} disabled={uplineSaving || !uplineEmail.trim() || !uplineIds.trim()} style={btn(uplineSaving || !uplineEmail.trim() || !uplineIds.trim())}>{uplineSaving ? 'Saving…' : 'Credit Bands'}</button>
        {uplineMsg && <div style={{ marginTop: 14, fontSize: 13, color: uplineMsg.startsWith('❌') ? C.red : C.green, lineHeight: 1.5 }}>{uplineMsg}</div>}
      </div>

      {/* Put a band into transfer for someone who handed it over without pressing the button */}
      <div style={card}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Put a Band into Transfer</h2>
        <p style={{ fontSize: 13, color: C.secondary, marginBottom: 18, lineHeight: 1.5 }}>The same as the holder pressing &ldquo;Pass this band on&rdquo;: the band waits in transfer from its current owner, and whoever taps it next gets the hand-off screen and becomes its holder. Name and note are optional.</p>
        <label style={label}>Band ID</label>
        <input value={xferId} onChange={e => setXferId(e.target.value)} placeholder="PB-AB12C" style={input} />
        <label style={label}>Recipient&rsquo;s name (optional)</label>
        <input value={xferTo} onChange={e => setXferTo(e.target.value)} placeholder="Who it is going to" style={input} />
        <label style={label}>Note for them (optional)</label>
        <textarea value={xferNote} onChange={e => setXferNote(e.target.value)} placeholder="A prayer or a few words from the giver" rows={3} style={{ ...input, resize: 'vertical', minHeight: 70 }} />
        <button onClick={startTransfer} disabled={xferBusy || !xferId.trim()} style={btn(xferBusy || !xferId.trim())}>{xferBusy ? 'Working…' : 'Put into Transfer'}</button>
        {xferMsg && <div style={{ marginTop: 14, fontSize: 13, color: xferMsg.startsWith('❌') ? C.red : C.green, lineHeight: 1.5 }}>{xferMsg}</div>}
      </div>

      {/* Replace a lost band */}
      <div style={card}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Replace a Lost Band</h2>
        <p style={{ fontSize: 13, color: C.secondary, marginBottom: 18, lineHeight: 1.5 }}>Ship a new physical band and carry the lost band&rsquo;s identity onto it: the new band inherits the owner and theme, the full prayer journey moves over, and the old band is retired.</p>
        <label style={label}>Lost band ID</label>
        <input value={oldId} onChange={e => setOldId(e.target.value)} placeholder="PB-OLD12 (the lost band)" style={input} />
        <label style={label}>New band ID</label>
        <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="PB-NEW34 (the replacement)" style={input} />
        <button onClick={replaceBand} disabled={replacing || !oldId.trim() || !newId.trim()} style={btn(replacing || !oldId.trim() || !newId.trim())}>{replacing ? 'Replacing…' : 'Replace Band'}</button>
        {replaceMsg && <div style={{ marginTop: 14, fontSize: 13, color: replaceMsg.startsWith('❌') ? C.red : C.green, lineHeight: 1.5 }}>{replaceMsg}</div>}
      </div>
      </div>
    </div>
  )
}
