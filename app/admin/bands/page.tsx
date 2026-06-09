'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

const ADMIN_EMAIL = 'dshipps941@gmail.com'
const green = '#1a6b4a'

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
    <div style={{ padding: 40, fontFamily: 'Georgia, serif', color: '#8a7c6a' }}>Loading... ✝</div>
  )

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#7a6c5a', display: 'block', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid #ddd6ca', fontSize: 15, fontFamily: 'Georgia, serif', background: '#fdfaf7', color: '#2c2416', boxSizing: 'border-box', outline: 'none', marginBottom: 14 }
  const btn = (busy: boolean): React.CSSProperties => ({ background: busy ? '#ccc' : green, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 'bold', cursor: busy ? 'default' : 'pointer', fontFamily: 'Georgia, serif' })
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: '24px 26px', marginBottom: 24 }

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}><PrayerBandsLogo size={34} color={green} /></div>
          <a href="/admin" style={{ color: green, fontSize: 14, textDecoration: 'none' }}>← Admin</a>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginTop: 8, color: '#1a1208' }}>Band Management</h1>
          <p style={{ color: '#8a7c6a', fontSize: 14 }}>Link bands to a personal account, or replace a lost band.</p>
        </div>

        {/* Assign bands to an account */}
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 6, color: '#1a1208' }}>Assign Bands to an Account</h2>
          <p style={{ fontSize: 13, color: '#8a7c6a', marginBottom: 18, lineHeight: 1.5 }}>Sets each band&rsquo;s owner to this account so they all appear under the person&rsquo;s dashboard. Useful for sending someone a curated set of design bands.</p>
          <label style={label}>Account email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" style={input} />
          <label style={label}>Band IDs (one per line, or comma/space separated)</label>
          <textarea value={assignIds} onChange={e => setAssignIds(e.target.value)} placeholder={'PB-AB12C\nPB-XY34Z'} rows={4} style={{ ...input, resize: 'vertical', minHeight: 90 }} />
          <button onClick={assignBands} disabled={assigning || !email.trim() || !assignIds.trim()} style={btn(assigning || !email.trim() || !assignIds.trim())}>{assigning ? 'Assigning…' : 'Assign Bands'}</button>
          {assignMsg && <div style={{ marginTop: 14, fontSize: 13, color: assignMsg.startsWith('❌') ? '#c0392b' : green, lineHeight: 1.5 }}>{assignMsg}</div>}
        </div>

        {/* Pending replacement orders */}
        {pending.length > 0 && (
          <div style={{ ...card, borderColor: '#B8972A', background: '#fffdf5' }}>
            <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 6, color: '#1a1208' }}>Pending Replacement Orders ({pending.length})</h2>
            <p style={{ fontSize: 13, color: '#8a7c6a', marginBottom: 18, lineHeight: 1.5 }}>Customers who ordered a replacement. Enter the band ID you&rsquo;re shipping and complete — the lost band&rsquo;s journey transfers automatically.</p>
            {pending.map(p => (
              <div key={p.order_id} style={{ borderTop: '1px solid #efe6cf', paddingTop: 14, marginTop: 14 }}>
                <div style={{ fontSize: 13, color: '#2c2416', marginBottom: 8 }}>
                  Replacing <strong>{p.replaces}</strong> &middot; <span style={{ color: '#8a7c6a' }}>{p.email || 'unknown email'}</span>
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
            {pendingMsg && <div style={{ marginTop: 14, fontSize: 13, color: pendingMsg.startsWith('❌') ? '#c0392b' : green, lineHeight: 1.5 }}>{pendingMsg}</div>}
          </div>
        )}

        {/* Replace a lost band */}
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 6, color: '#1a1208' }}>Replace a Lost Band</h2>
          <p style={{ fontSize: 13, color: '#8a7c6a', marginBottom: 18, lineHeight: 1.5 }}>Ship a new physical band and carry the lost band&rsquo;s identity onto it: the new band inherits the owner and theme, the full prayer journey moves over, and the old band is retired.</p>
          <label style={label}>Lost band ID</label>
          <input value={oldId} onChange={e => setOldId(e.target.value)} placeholder="PB-OLD12 (the lost band)" style={input} />
          <label style={label}>New band ID</label>
          <input value={newId} onChange={e => setNewId(e.target.value)} placeholder="PB-NEW34 (the replacement)" style={input} />
          <button onClick={replaceBand} disabled={replacing || !oldId.trim() || !newId.trim()} style={btn(replacing || !oldId.trim() || !newId.trim())}>{replacing ? 'Replacing…' : 'Replace Band'}</button>
          {replaceMsg && <div style={{ marginTop: 14, fontSize: 13, color: replaceMsg.startsWith('❌') ? '#c0392b' : green, lineHeight: 1.5 }}>{replaceMsg}</div>}
        </div>
      </div>
    </div>
  )
}
