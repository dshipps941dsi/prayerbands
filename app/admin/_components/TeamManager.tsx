'use client'
import { useState, useEffect, useCallback } from 'react'

type Member = { id: string; email: string; full_name: string | null; team_role: string }

export default function TeamManager({ C }: { C: any }) {
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'fulfillment'>('fulfillment')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/team')
    if (res.ok) { const d = await res.json(); setMembers(d.members ?? []) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function setMemberRole(e: string, r: 'admin' | 'fulfillment' | null) {
    setSaving(true); setMsg('')
    const res = await fetch('/api/admin/team', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, role: r }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setEmail(''); await load() } else { setMsg(d.error || 'Something went wrong.') }
    setSaving(false)
  }

  const panel = { background: C.card, border: `1px solid ${C.borderSilver}`, borderRadius: 10, overflow: 'hidden' }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const input = { padding: '9px 12px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', color: C.body, background: '#fff' }
  const btn = { padding: '9px 18px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }

  return (
    <div style={panel}>
      <div style={head}>Team</div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 14, lineHeight: 1.6 }}>
          Grant a teammate access. <strong style={{ color: C.body }}>Admin</strong> sees the whole Control Centre;{' '}
          <strong style={{ color: C.body }}>Fulfillment</strong> only reaches the packing / shipping / hand-out pages.
          They must have signed in once (any method) so an account exists.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <input style={{ ...input, flex: 1, minWidth: 200 }} type="email" placeholder="teammate@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          <select style={input} value={role} onChange={e => setRole(e.target.value as 'admin' | 'fulfillment')}>
            <option value="fulfillment">Fulfillment</option>
            <option value="admin">Admin</option>
          </select>
          <button style={{ ...btn, opacity: saving || !email.trim() ? 0.6 : 1 }} disabled={saving || !email.trim()} onClick={() => setMemberRole(email.trim(), role)}>Add</button>
        </div>
        {msg && <div style={{ fontSize: 12.5, color: '#B4441F', marginBottom: 8 }}>{msg}</div>}

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <div style={{ color: C.secondary, fontSize: 13 }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ color: C.secondary, fontSize: 13, fontStyle: 'italic' }}>No teammates yet — you're the only one with access.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.secondary, fontSize: 11 }}>
                  <th style={{ padding: '6px 8px' }}>Person</th><th style={{ padding: '6px 8px' }}>Role</th><th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${C.borderSilver}` }}>
                    <td style={{ padding: '8px' }}>
                      <div style={{ color: C.heading, fontWeight: 600 }}>{m.full_name || '—'}</div>
                      <div style={{ color: C.secondary, fontSize: 11 }}>{m.email}</div>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <select style={input} value={m.team_role} onChange={e => setMemberRole(m.email, e.target.value as 'admin' | 'fulfillment')}>
                        <option value="fulfillment">Fulfillment</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button onClick={() => setMemberRole(m.email, null)} style={{ background: 'none', border: 'none', color: '#B4441F', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ fontSize: 11, color: C.secondary, marginTop: 14, fontStyle: 'italic' }}>
          You (the owner) are always an admin via the ADMIN_EMAILS setting and can't be removed here.
        </div>
      </div>
    </div>
  )
}
