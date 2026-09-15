'use client'
import { useEffect, useState } from 'react'

// Ministry applications awaiting a decision. Approve creates the church and
// invites the pastor; Decline sends a short note. Recently reviewed ones stay
// listed below so a decision can be seen after the fact.

type App = {
  id: string; name: string; prefix: string; subdomain: string; location: string | null; website: string | null
  pastor: string; email: string; status: 'pending' | 'approved' | 'declined'; note: string | null; org_id: string | null
  reviewed_at: string | null; created_at: string
}

const C = {
  card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E', goldText: '#9A7A35', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderNavy: 'rgba(10,22,40,0.12)', borderSilver: 'rgba(92,101,115,0.20)', green: '#4A8A6A', red: '#B4441F',
}

export default function OrgApplications() {
  const [apps, setApps] = useState<App[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/admin/org-applications')
      const d = await res.json().catch(() => ({}))
      if (res.ok) setApps(d.applications || [])
      else { setApps([]); setMsg(d.error || 'Could not load applications.') }
    } catch { setApps([]); setMsg('Network error.') }
  }
  useEffect(() => { load() }, [])

  async function decide(id: string, action: 'approve' | 'decline') {
    if (action === 'decline' && !confirm('Decline this application? The church will be emailed.')) return
    setBusy(id); setMsg('')
    try {
      const res = await fetch('/api/admin/org-applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, note: note[id] || '' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(d.error || 'That did not go through.'); return }
      setMsg(action === 'approve'
        ? (d.emailed ? 'Approved — the church is created and the pastor has been emailed a link to set their password.' : 'Approved and created, but the invitation email did not send. Ask them to use "Forgot your password" with their email.')
        : 'Declined — the church has been emailed.')
      await load()
    } catch { setMsg('Network error.') }
    finally { setBusy(null) }
  }

  const pending = (apps || []).filter(a => a.status === 'pending')
  const reviewed = (apps || []).filter(a => a.status !== 'pending').slice(0, 8)
  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }
  const head = { padding: '14px 20px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 600, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  const btn = (bg: string, fg: string, disabled: boolean) => ({ padding: '8px 16px', background: disabled ? '#C9CFD6' : bg, color: disabled ? '#fff' : fg, border: 'none', borderRadius: 6, fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600, cursor: disabled ? 'wait' : 'pointer' })

  return (
    <div style={panel}>
      <div style={head}>
        <span>Ministry applications{pending.length ? ` · ${pending.length} waiting` : ''}</span>
        <button onClick={load} style={{ background: 'none', border: 'none', color: C.goldText, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Refresh</button>
      </div>
      <div style={{ padding: '14px 20px' }}>
        {apps === null ? (
          <div style={{ fontSize: 13, color: C.secondary }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ fontSize: 13, color: C.secondary, fontStyle: 'italic' }}>Nothing waiting. New applications from the ministry sign-up page appear here, and you get a push and an email when one arrives.</div>
        ) : pending.map(a => (
          <div key={a.id} style={{ border: `1px solid ${C.gold}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: 'rgba(200,169,110,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{a.name}</div>
                <div style={{ fontSize: 13, color: C.body, marginTop: 2 }}>{a.pastor} &middot; <a href={`mailto:${a.email}`} style={{ color: C.goldText }}>{a.email}</a>{a.location ? ` · ${a.location}` : ''}</div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 4, fontFamily: 'monospace' }}>{a.prefix}-XXXXX &middot; {a.subdomain}.prayerbands.com{a.website ? ` · ${a.website}` : ''}</div>
                <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 4 }}>Applied {new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
            <input value={note[a.id] || ''} onChange={e => setNote(n => ({ ...n, [a.id]: e.target.value }))} placeholder="Optional note — included in a decline email, kept on the record for an approval" maxLength={500}
              style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '8px 10px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#fff', color: C.body }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => decide(a.id, 'approve')} disabled={busy === a.id} style={btn(C.gold, C.navy, busy === a.id)}>{busy === a.id ? 'Working…' : 'Approve & invite'}</button>
              <button onClick={() => decide(a.id, 'decline')} disabled={busy === a.id} style={{ ...btn('transparent', C.red, busy === a.id), border: `1px solid ${C.red}`, background: 'transparent', color: C.red }}>Decline</button>
            </div>
          </div>
        ))}
        {msg && <div style={{ marginTop: 6, fontSize: 13, color: msg.startsWith('Approved') || msg.startsWith('Declined') ? C.green : C.red, lineHeight: 1.5 }}>{msg}</div>}
        {reviewed.length > 0 && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.borderSilver}`, paddingTop: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.secondary, fontFamily: 'Cinzel, serif', marginBottom: 6 }}>Recently reviewed</div>
            {reviewed.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: C.body, padding: '5px 0' }}>
                <span>{a.name} <span style={{ color: C.secondary }}>· {a.pastor}</span></span>
                <span style={{ color: a.status === 'approved' ? C.green : C.red, fontWeight: 600 }}>{a.status}{a.reviewed_at ? ` · ${new Date(a.reviewed_at).toLocaleDateString()}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
