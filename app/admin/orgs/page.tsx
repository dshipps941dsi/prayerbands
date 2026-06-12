'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import { THEME_OPTIONS } from '@/lib/themes'

const ADMIN_EMAIL = 'dshipps941@gmail.com'

export default function AdminOrgs() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [bands, setBands] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [bandInput, setBandInput] = useState('')
  const [generateQty, setGenerateQty] = useState(100)
  const [bandTheme, setBandTheme] = useState('default')
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/signin'
        return
      }
      setAuthorized(true)
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

  async function generateBands() {
    if (!selectedOrg) return
    setGenerating(true)
    setMessage('')
    const res = await fetch('/api/generate-org-bands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: selectedOrg.id, quantity: generateQty, theme: bandTheme }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`✅ Generated ${data.count} bands (${data.prefix} prefix) — supplier CSV emailed to you. Sample: ${data.sample?.join(', ')}`)
      loadOrgBands(selectedOrg.id)
    } else {
      setMessage('❌ Error: ' + data.error)
    }
    setGenerating(false)
  }

  // Prayer Bands brand palette
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

  if (!authorized || loading) return (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: C.secondary }}>Loading... ✝</div>
  )

  return (
    <div className="pb-orgs-root" style={{ fontFamily: 'Inter, sans-serif', background: C.pageBg, minHeight: '100vh', padding: 32 }}>
      {/* Inline styles can't be hit by media queries — collapse the desktop
          two-column grids to a single column on phones. */}
      <style>{`
        @media (max-width: 760px) {
          .pb-orgs-root { padding: 18px 14px !important; }
          .pb-orgs-main { grid-template-columns: 1fr !important; gap: 16px !important; }
          .pb-orgs-tools { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 12 }}><PrayerBandsLogo size={34} color={C.gold} /></div>
          <a href="/admin" style={{ color: C.goldText, fontSize: 13, textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>← Admin</a>
          <h1 style={{ fontSize: 30, fontWeight: 600, marginTop: 8, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Church Accounts</h1>
          <p style={{ color: C.secondary, fontSize: 14 }}>Manage organizations, generate and assign bands.</p>
        </div>

        <div className="pb-orgs-main" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Org list */}
          <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 600, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              Organizations ({orgs.length})
            </div>
            {orgs.map(org => (
              <div
                key={org.id}
                onClick={() => { setSelectedOrg(org); loadOrgBands(org.id); setMessage('') }}
                style={{
                  padding: '14px 20px', cursor: 'pointer',
                  borderBottom: `1px solid ${C.borderSilver}`,
                  background: selectedOrg?.id === org.id ? 'rgba(200,169,110,0.08)' : C.card,
                  borderLeft: selectedOrg?.id === org.id ? `3px solid ${C.gold}` : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: C.heading }}>{org.name}</div>
                <div style={{ fontSize: 12, color: C.goldText, marginTop: 2, fontFamily: 'monospace' }}>
                  {org.prefix}-XXXXX
                </div>
                <div style={{ fontSize: 11, color: C.secondary, marginTop: 2 }}>
                  {new Date(org.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {orgs.length === 0 && (
              <div style={{ padding: '24px 20px', color: C.secondary, fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
                No organizations yet.
              </div>
            )}
          </div>

          {/* Right panel */}
          <div>
            {selectedOrg ? (
              <div>
                {/* Header */}
                <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16, boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{selectedOrg.name}</h2>
                  <div style={{ fontSize: 13, color: C.secondary }}>
                    <span style={{ fontFamily: 'monospace', color: C.goldText }}>{selectedOrg.prefix}-XXXXX</span>
                    {' · '}
                    <a href={`https://${selectedOrg.subdomain}.prayerbands.com`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldText }}>
                      {selectedOrg.subdomain}.prayerbands.com ↗
                    </a>
                  </div>
                </div>

                {message && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                    background: message.startsWith('✅') ? 'rgba(74,138,106,0.1)' : 'rgba(192,57,43,0.08)',
                    color: message.startsWith('✅') ? C.green : C.red,
                    fontSize: 13, lineHeight: 1.5,
                    border: `1px solid ${message.startsWith('✅') ? 'rgba(74,138,106,0.25)' : 'rgba(192,57,43,0.25)'}`,
                  }}>
                    {message}
                  </div>
                )}

                <div className="pb-orgs-tools" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  {/* Generate bands */}
                  <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, padding: '20px 24px', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                      Generate New Bands
                    </h3>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 8, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Quantity
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {[50, 100, 250, 500].map(qty => (
                        <button key={qty} onClick={() => setGenerateQty(qty)} style={{
                          padding: '6px 14px', borderRadius: 6,
                          border: generateQty === qty ? `2px solid ${C.gold}` : `1px solid ${C.borderNavy}`,
                          background: generateQty === qty ? 'rgba(200,169,110,0.14)' : C.pageBg,
                          color: generateQty === qty ? C.goldText : C.secondary,
                          fontWeight: generateQty === qty ? 700 : 400,
                          cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif',
                        }}>{qty}</button>
                      ))}
                    </div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 8, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Theme
                    </label>
                    <select
                      value={bandTheme}
                      onChange={e => setBandTheme(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, background: C.pageBg, color: C.body, fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16, cursor: 'pointer', outline: 'none' }}
                    >
                      {THEME_OPTIONS.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: C.secondary, marginBottom: 16, lineHeight: 1.5 }}>
                      Generates {generateQty} unique {selectedOrg.prefix}-XXXXX IDs in the <strong style={{ color: C.body }}>{THEME_OPTIONS.find(t => t.id === bandTheme)?.label}</strong> theme, seeds them into Supabase, and emails you the supplier NFC CSV.
                    </div>
                    <button
                      onClick={generateBands}
                      disabled={generating}
                      style={{
                        background: generating ? C.silver : C.gold,
                        color: generating ? '#fff' : C.navy, border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontSize: 11, fontWeight: 700,
                        cursor: generating ? 'default' : 'pointer',
                        fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%',
                      }}
                    >
                      {generating ? 'Generating...' : `Generate ${generateQty} Bands ✝`}
                    </button>
                  </div>

                  {/* Manual assign */}
                  <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, padding: '20px 24px', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                      Manual Assign
                    </h3>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 6, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Band IDs (one per line)
                    </label>
                    <textarea
                      value={bandInput}
                      onChange={e => setBandInput(e.target.value)}
                      placeholder={`${selectedOrg.prefix}-00001\n${selectedOrg.prefix}-00002`}
                      rows={4}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 7,
                        border: `1px solid ${C.borderNavy}`, fontSize: 12,
                        fontFamily: 'monospace', background: C.pageBg,
                        color: C.body, boxSizing: 'border-box' as const,
                        resize: 'vertical', marginBottom: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={assignBands}
                      disabled={saving || !bandInput.trim()}
                      style={{
                        background: (!saving && bandInput.trim()) ? C.gold : C.silver,
                        color: (!saving && bandInput.trim()) ? C.navy : '#fff', border: 'none', borderRadius: 8,
                        padding: '10px 20px', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', width: '100%',
                      }}
                    >
                      {saving ? 'Assigning...' : 'Assign Bands'}
                    </button>
                  </div>
                </div>

                {/* Existing bands */}
                <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
                  <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderSilver}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Assigned Bands ({bands.length})</span>
                    <span style={{ fontSize: 12, color: C.secondary }}>
                      {bands.filter(b => b.status === 'registered').length} registered · {bands.filter(b => b.status === 'unregistered').length} unregistered
                    </span>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {bands.slice(0, 50).map((b, i) => (
                      <div key={b.band_id} style={{
                        display: 'flex', alignItems: 'center', padding: '10px 20px',
                        borderBottom: i < bands.length - 1 ? `1px solid ${C.borderSilver}` : 'none',
                        gap: 12,
                      }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, color: C.goldText, fontWeight: 'bold', flex: 1 }}>
                          {b.band_id}
                        </div>
                        <div style={{ fontSize: 11, color: C.secondary }}>
                          {new Date(b.created_at).toLocaleDateString()}
                        </div>
                        <div style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 10,
                          background: b.status === 'registered' ? 'rgba(74,138,106,0.14)' : 'rgba(200,169,110,0.14)',
                          color: b.status === 'registered' ? C.green : C.goldText,
                          textTransform: 'capitalize' as const,
                          fontFamily: 'Cinzel, serif',
                          letterSpacing: '0.04em',
                        }}>
                          {b.status}
                        </div>
                      </div>
                    ))}
                    {bands.length === 0 && (
                      <div style={{ padding: '24px 20px', color: C.secondary, fontSize: 13, textAlign: 'center', fontStyle: 'italic' }}>
                        No bands assigned yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10,
                padding: 60, textAlign: 'center', color: C.secondary, boxShadow: '0 2px 10px rgba(10,22,40,0.06)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: C.borderGold }}>✝</div>
                <div style={{ fontSize: 14, fontStyle: 'italic' }}>Select a church to manage their bands.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
