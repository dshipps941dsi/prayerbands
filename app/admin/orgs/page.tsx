'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminOrgs() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [bands, setBands] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [bandInput, setBandInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
      setOrgs(orgsData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function loadOrgBands(orgId: string) {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('bands')
      .select('band_id, status, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    setBands(data || [])
  }

  async function assignBands() {
    if (!selectedOrg || !bandInput.trim()) return
    setSaving(true)
    setMessage('')

    const ids = bandInput.split('\n').map(s => s.trim()).filter(Boolean)
    const res = await fetch('/api/admin-assign-bands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: selectedOrg.id, band_ids: ids }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`✅ Assigned ${data.count} bands to ${selectedOrg.name}`)
      setBandInput('')
      loadOrgBands(selectedOrg.id)
    } else {
      setMessage('❌ Error: ' + data.error)
    }
    setSaving(false)
  }

  const green = '#1a6b4a'

  if (loading) return (
    <div style={{ padding: 40, fontFamily: 'Georgia, serif', color: '#8a7c6a' }}>Loading... ✝</div>
  )

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#f7f4ef', minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/admin" style={{ color: green, fontSize: 14, textDecoration: 'none' }}>← Admin</a>
          <h1 style={{ fontSize: 26, fontWeight: 'bold', marginTop: 8, color: '#1a1208' }}>Church Accounts</h1>
          <p style={{ color: '#8a7c6a', fontSize: 14 }}>Manage organizations and assign bands.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
          {/* Org list */}
          <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', fontWeight: 'bold', fontSize: 15 }}>
              Organizations ({orgs.length})
            </div>
            {orgs.map(org => (
              <div
                key={org.id}
                onClick={() => { setSelectedOrg(org); loadOrgBands(org.id) }}
                style={{
                  padding: '14px 20px', cursor: 'pointer',
                  borderBottom: '1px solid #f7f4ef',
                  background: selectedOrg?.id === org.id ? '#f0f7f3' : '#fff',
                  borderLeft: selectedOrg?.id === org.id ? `3px solid ${green}` : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1208' }}>{org.name}</div>
                <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 2 }}>
                  {org.prefix}-XXXXX · {org.subdomain}.prayerbands.com
                </div>
                <div style={{ fontSize: 11, color: '#8a7c6a', marginTop: 2 }}>
                  {new Date(org.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {orgs.length === 0 && (
              <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>
                No organizations yet.
              </div>
            )}
          </div>

          {/* Assign bands */}
          <div>
            {selectedOrg ? (
              <div>
                <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, padding: 24, marginBottom: 20 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 4 }}>{selectedOrg.name}</h2>
                  <div style={{ fontSize: 13, color: '#8a7c6a', marginBottom: 20 }}>
                    Prefix: <span style={{ fontFamily: 'monospace', color: green }}>{selectedOrg.prefix}-XXXXX</span>
                  </div>

                  <label style={{ fontSize: 12, fontWeight: 600, color: '#7a6c5a', display: 'block', marginBottom: 6 }}>
                    ASSIGN BAND IDs (one per line)
                  </label>
                  <textarea
                    value={bandInput}
                    onChange={e => setBandInput(e.target.value)}
                    placeholder={`${selectedOrg.prefix}-00001\n${selectedOrg.prefix}-00002\n${selectedOrg.prefix}-00003`}
                    rows={6}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 7,
                      border: '1px solid #ddd6ca', fontSize: 13,
                      fontFamily: 'monospace', background: '#fdfaf7',
                      color: '#2c2416', boxSizing: 'border-box' as const,
                      resize: 'vertical', marginBottom: 12,
                    }}
                  />

                  {message && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 7, marginBottom: 12,
                      background: message.startsWith('✅') ? '#e6f4ee' : '#fef0f0',
                      color: message.startsWith('✅') ? green : '#c0392b',
                      fontSize: 13,
                    }}>
                      {message}
                    </div>
                  )}

                  <button
                    onClick={assignBands}
                    disabled={saving || !bandInput.trim()}
                    style={{
                      background: (!saving && bandInput.trim()) ? green : '#ccc',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '11px 24px', fontSize: 14, fontWeight: 'bold',
                      cursor: 'pointer', fontFamily: 'Georgia, serif',
                    }}
                  >
                    {saving ? 'Assigning...' : 'Assign Bands'}
                  </button>
                </div>

                {/* Existing bands */}
                <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', fontWeight: 'bold', fontSize: 15 }}>
                    Assigned Bands ({bands.length})
                  </div>
                  {bands.slice(0, 20).map((b, i) => (
                    <div key={b.band_id} style={{
                      display: 'flex', alignItems: 'center', padding: '10px 20px',
                      borderBottom: i < bands.length - 1 ? '1px solid #f7f4ef' : 'none',
                      gap: 12,
                    }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, color: green, fontWeight: 'bold', flex: 1 }}>
                        {b.band_id}
                      </div>
                      <div style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: b.status === 'registered' ? '#e6f4ee' : '#fef3e2',
                        color: b.status === 'registered' ? green : '#c17f2a',
                        textTransform: 'capitalize' as const,
                      }}>
                        {b.status}
                      </div>
                    </div>
                  ))}
                  {bands.length === 0 && (
                    <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>
                      No bands assigned yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10,
                padding: 40, textAlign: 'center', color: '#8a7c6a',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✝</div>
                <div style={{ fontSize: 14 }}>Select a church to manage their bands.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
