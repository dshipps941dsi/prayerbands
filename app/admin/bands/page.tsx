'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

// PrayerBands brand palette
const C = {
  pageBg: '#F6F1E4',
  card: '#FFFDF8',
  navy: '#0A1628',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  silver: '#C9CFD6',
  silverBg: '#ECEEF1',
  heading: '#15223B',
  body: '#2A3344',
  secondary: '#5C6573',
  borderGold: 'rgba(200,169,110,0.34)',
  borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)',
  green: '#4A8A6A',
  red: '#c0392b',
}

export default function AdminBands() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Assign
  const [email, setEmail] = useState('')
  const [assignIds, setAssignIds] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignMsg, setAssignMsg] = useState('')

  // Replace
  const [oldId, setOldId] = useState('')
  const [newId, setNewId] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [replaceMsg, setReplaceMsg] = useState('')

  // Pending replacement orders
  const [pending, setPending] = useState<any[]>([])
  const [pendingIds, setPendingIds] = useState<Record<string, string>>({})
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [pendingMsg, setPendingMsg] = useState('')

  function loadPending() {
    fetch('/api/admin/replacements').then(r => r.json()).then(d => { if (d.pending) setPending(d.pending) }).catch(() => {})
  }

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) { window.location.href = '/signin'; return }
      setAuthorized(true)
      setLoading(false)
      loadPending()
    })
  }, [])

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

  if (loading || !authorized) return (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: C.secondary }}>Loading... ✝</div>
  )

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 8, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 7, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none', marginBottom: 14 }
  const btn = (busy: boolean): React.CSSProperties => ({ background: busy ? C.silver : C.gold, color: busy ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 11, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em' })
  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '24px 26px', marginBottom: 24, boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: C.pageBg, minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}><PrayerBandsLogo size={34} color={C.gold} /></div>
          <a href="/admin" style={{ color: C.goldText, fontSize: 13, textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← Admin</a>
          <h1 style={{ fontSize: 30, fontWeight: 600, marginTop: 8, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Band Management</h1>
          <p style={{ color: C.secondary, fontSize: 14 }}>Link bands to a personal account, or replace a lost band.</p>
        </div>

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

        {/* Pending replacement orders */}
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
