'use client'
import { useState, useEffect } from 'react'
import { THEME_OPTIONS, loadThemes, getThemeOptions } from '@/lib/themes'

// Production batch generator: per-row quantities for either a THEME (artwork) or
// a SOLID COLOR. Generates unique PB-XXXXX IDs (general inventory, unowned) and
// downloads one supplier CSV.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', silver: '#C9CFD6', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderNavy: 'rgba(10,22,40,0.12)', green: '#4A8A6A', red: '#c0392b',
}

type Row = { kind: 'theme' | 'color'; theme: string; color: string; quantity: number }
type PastBatch = { batch: string; total: number; created: string; themes: string[]; colors: string[] }

function csvField(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// Build + download the supplier CSV from a list of band rows. Shared by a fresh
// generation and by re-downloading a past batch so both files are identical.
function downloadCsv(bands: any[], filename: string) {
  const header = ['sequence', 'band_id', 'theme', 'color', 'nfc_url', 'outside_text', 'inside_text']
  const lines = [header.join(',')]
  bands.forEach((b, i) => {
    lines.push([i + 1, csvField(b.band_id), csvField(b.theme), csvField(b.color || ''), csvField(b.nfc_url), csvField(b.outside_text), csvField(b.inside_text)].join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function BatchGenerator() {
  const [themeOptions, setThemeOptions] = useState<{ id: string; label: string }[]>(THEME_OPTIONS)
  const [rows, setRows] = useState<Row[]>([{ kind: 'theme', theme: 'mountain', color: '', quantity: 50 }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [past, setPast] = useState<PastBatch[]>([])
  const [pastLoading, setPastLoading] = useState(true)
  const [downloading, setDownloading] = useState('')

  useEffect(() => { loadThemes().then(() => setThemeOptions(getThemeOptions())) }, [])

  async function loadPast() {
    setPastLoading(true)
    try {
      const res = await fetch('/api/admin/batches')
      const d = await res.json()
      if (res.ok) setPast(d.batches || [])
    } catch { /* leave list empty */ }
    setPastLoading(false)
  }
  useEffect(() => { loadPast() }, [])

  async function downloadPast(b: PastBatch) {
    setDownloading(b.batch)
    try {
      const res = await fetch(`/api/admin/batches?batch=${encodeURIComponent(b.batch)}`)
      const d = await res.json()
      if (!res.ok) { setMsg('❌ ' + (d.error || 'Could not load that batch.')); return }
      downloadCsv(d.bands, `${d.batch}_${d.total}-bands.csv`)
    } catch {
      setMsg('❌ Could not download that batch.')
    } finally {
      setDownloading('')
    }
  }

  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)

  function setRow(i: number, patch: Partial<Row>) { setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r)) }
  function addRow(kind: 'theme' | 'color') {
    setRows(prev => [...prev, { kind, theme: themeOptions[0]?.id || 'default', color: '', quantity: 50 }])
  }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)) }

  async function generate() {
    const active = rows.filter(r => r.quantity > 0)
    if (!active.length) { setMsg('❌ Add at least one row with a quantity.'); return }
    if (active.some(r => r.kind === 'color' && !r.color.trim())) { setMsg('❌ Give each solid-color row a color name (e.g. Black).'); return }
    if (!confirm(`Generate ${total} band IDs across ${active.length} design(s)? This seeds them into the database and downloads the supplier CSV.`)) return
    setBusy(true); setMsg('Generating…')
    try {
      const items = rows.map(r => r.kind === 'color'
        ? { color: r.color.trim(), quantity: r.quantity }
        : { theme: r.theme, quantity: r.quantity })
      const res = await fetch('/api/admin/generate-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg('❌ ' + (d.error || 'Failed.')); return }

      downloadCsv(d.bands, `${d.batch}_${d.total}-bands.csv`)
      setMsg(`✅ Generated ${d.total} bands (batch ${d.batch}) and downloaded the CSV.`)
      loadPast()
    } catch {
      setMsg('❌ Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Generate IDs for Production</h2>
      <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>Create unique <strong>PB-XXXXX</strong> IDs for a manufacturing run. Each row is a <strong>theme</strong> (artwork) or a <strong>solid color</strong>; set a quantity, then download one CSV to send your supplier. Bands are seeded as unclaimed general inventory.</p>

      {msg && <div style={{ marginBottom: 16, fontSize: 14, color: msg.startsWith('❌') ? C.red : C.green }}>{msg}</div>}

      <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 120 }}><span style={label}>Type</span></div>
          <div style={{ flex: 1 }}><span style={label}>Theme / Color</span></div>
          <div style={{ width: 90 }}><span style={label}>Qty</span></div>
          <div style={{ width: 32 }} />
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <select style={{ ...input, width: 120 }} value={r.kind} onChange={e => setRow(i, { kind: e.target.value as Row['kind'] })}>
              <option value="theme">Theme</option>
              <option value="color">Solid color</option>
            </select>
            {r.kind === 'theme' ? (
              <select style={{ ...input, flex: 1 }} value={r.theme} onChange={e => setRow(i, { theme: e.target.value })}>
                {themeOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            ) : (
              <input style={{ ...input, flex: 1 }} value={r.color} onChange={e => setRow(i, { color: e.target.value })} placeholder="Color name — e.g. Black, Pink, Teal" />
            )}
            <input type="number" min={0} style={{ ...input, width: 90 }} value={r.quantity} onChange={e => setRow(i, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            <button onClick={() => removeRow(i)} disabled={rows.length === 1} title="Remove" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 6, border: `1px solid ${C.borderNavy}`, background: 'transparent', color: rows.length === 1 ? C.silver : C.red, cursor: rows.length === 1 ? 'not-allowed' : 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button onClick={() => addRow('theme')} style={{ background: 'transparent', border: `1px dashed ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Add theme</button>
          <button onClick={() => addRow('color')} style={{ background: 'transparent', border: `1px dashed ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Add color</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderNavy}` }}>
          <div style={{ fontSize: 14, color: C.body, fontFamily: 'Inter, sans-serif' }}>Total: <strong style={{ color: C.heading, fontSize: 18 }}>{total}</strong> bands</div>
          <button onClick={generate} disabled={busy || total <= 0} style={{ background: busy || total <= 0 ? C.silver : C.gold, color: busy || total <= 0 ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 12, fontWeight: 700, cursor: busy || total <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{busy ? 'Generating…' : 'Generate & Download CSV'}</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.secondary, marginTop: 14, lineHeight: 1.5 }}>CSV columns: <code>sequence, band_id, theme, color, nfc_url, outside_text, inside_text</code>. <strong>theme</strong> = which artwork; <strong>color</strong> = the solid color (blank for themed bands); <strong>nfc_url</strong> = what to program into each chip.</p>
      <p style={{ fontSize: 12, color: C.secondary, marginTop: 8, lineHeight: 1.5 }}>Note: solid-color generation needs the <code>color</code> column — run <code>db/bands-color.sql</code> in Supabase once.</p>

      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Past Batches</h2>
        <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>Every production run is kept here. Re-download the exact supplier CSV for any batch — nothing is lost even if the original file is gone.</p>

        {pastLoading ? (
          <div style={{ fontSize: 14, color: C.secondary }}>Loading…</div>
        ) : past.length === 0 ? (
          <div style={{ background: C.card, border: `1px dashed ${C.borderNavy}`, borderRadius: 12, padding: '18px 20px', fontSize: 14, color: C.secondary }}>No batches yet — your first generation will appear here.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(b => {
              const designs = [...b.themes.filter(t => t !== 'default' || b.colors.length === 0), ...b.colors].filter(Boolean)
              return (
                <div key={b.batch} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '14px 18px', boxShadow: '0 2px 10px rgba(10,22,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.heading, fontFamily: 'Inter, sans-serif' }}>{b.batch}</span>
                      <span style={{ fontSize: 13, color: C.secondary }}>{new Date(b.created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.secondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: C.body }}>{b.total}</strong> bands{designs.length ? ` · ${designs.join(', ')}` : ''}
                    </div>
                  </div>
                  <button onClick={() => downloadPast(b)} disabled={downloading === b.batch} style={{ flexShrink: 0, background: downloading === b.batch ? C.silver : 'transparent', color: downloading === b.batch ? '#fff' : C.goldText, border: `1px solid ${downloading === b.batch ? C.silver : C.gold}`, borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: downloading === b.batch ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{downloading === b.batch ? 'Preparing…' : '↓ Download CSV'}</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
