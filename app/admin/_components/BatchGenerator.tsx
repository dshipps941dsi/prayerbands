'use client'
import { useState, useEffect } from 'react'
import { THEME_OPTIONS, loadThemes, getThemeOptions } from '@/lib/themes'

// Production batch generator: enter per-theme quantities, generate unique
// PB-XXXXX IDs (general inventory, unowned), and download a single supplier CSV.
const C = {
  pageBg: '#F6F1E4', card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E',
  goldText: '#9A7A35', silver: '#C9CFD6', heading: '#15223B', body: '#2A3344',
  secondary: '#5C6573', borderNavy: 'rgba(10,22,40,0.12)', green: '#4A8A6A', red: '#c0392b',
}

type Row = { theme: string; quantity: number }

function csvField(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export default function BatchGenerator() {
  const [themeOptions, setThemeOptions] = useState<{ id: string; label: string }[]>(THEME_OPTIONS)
  const [rows, setRows] = useState<Row[]>([{ theme: 'mountain', quantity: 50 }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadThemes().then(() => setThemeOptions(getThemeOptions())) }, [])

  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)

  function setRow(i: number, patch: Partial<Row>) { setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r)) }
  function addRow() { setRows(prev => [...prev, { theme: themeOptions[0]?.id || 'default', quantity: 50 }]) }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)) }

  async function generate() {
    if (total <= 0) { setMsg('❌ Add at least one theme with a quantity.'); return }
    if (!confirm(`Generate ${total} band IDs across ${rows.filter(r => r.quantity > 0).length} theme(s)? This seeds them into the database and downloads the supplier CSV.`)) return
    setBusy(true); setMsg('Generating…')
    try {
      const res = await fetch('/api/admin/generate-batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg('❌ ' + (d.error || 'Failed.')); return }

      const header = ['sequence', 'band_id', 'theme', 'nfc_url', 'outside_text', 'inside_text']
      const lines = [header.join(',')]
      d.bands.forEach((b: any, i: number) => {
        lines.push([i + 1, csvField(b.band_id), csvField(b.theme), csvField(b.nfc_url), csvField(b.outside_text), csvField(b.inside_text)].join(','))
      })
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${d.batch}_${d.total}-bands.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg(`✅ Generated ${d.total} bands (batch ${d.batch}) and downloaded the CSV.`)
    } catch {
      setMsg('❌ Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.goldText, display: 'block', marginBottom: 5, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif' }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${C.borderNavy}`, fontSize: 14, fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Generate IDs for Production</h2>
      <p style={{ color: C.secondary, fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>Create unique <strong>PB-XXXXX</strong> IDs for a manufacturing run — set a quantity per theme, then download one CSV (with a theme column) to send your supplier. Bands are seeded as unclaimed general inventory.</p>

      {msg && <div style={{ marginBottom: 16, fontSize: 14, color: msg.startsWith('❌') ? C.red : C.green }}>{msg}</div>}

      <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 10px rgba(10,22,40,0.06)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1 }}><span style={label}>Theme</span></div>
          <div style={{ width: 110 }}><span style={label}>Quantity</span></div>
          <div style={{ width: 32 }} />
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
            <select style={{ ...input, flex: 1 }} value={r.theme} onChange={e => setRow(i, { theme: e.target.value })}>
              {themeOptions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input type="number" min={0} style={{ ...input, width: 110 }} value={r.quantity} onChange={e => setRow(i, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            <button onClick={() => removeRow(i)} disabled={rows.length === 1} title="Remove" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 6, border: `1px solid ${C.borderNavy}`, background: 'transparent', color: rows.length === 1 ? C.silver : C.red, cursor: rows.length === 1 ? 'not-allowed' : 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        ))}
        <button onClick={addRow} style={{ background: 'transparent', border: `1px dashed ${C.borderNavy}`, color: C.body, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>+ Add theme</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderNavy}` }}>
          <div style={{ fontSize: 14, color: C.body, fontFamily: 'Inter, sans-serif' }}>Total: <strong style={{ color: C.heading, fontSize: 18 }}>{total}</strong> bands</div>
          <button onClick={generate} disabled={busy || total <= 0} style={{ background: busy || total <= 0 ? C.silver : C.gold, color: busy || total <= 0 ? '#fff' : C.navy, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 12, fontWeight: 700, cursor: busy || total <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{busy ? 'Generating…' : 'Generate & Download CSV'}</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.secondary, marginTop: 14, lineHeight: 1.5 }}>The CSV columns are <code>sequence, band_id, theme, nfc_url, outside_text, inside_text</code> — the <strong>theme</strong> tells the manufacturer which artwork goes on each band, and <strong>nfc_url</strong> is what to program into each chip.</p>
    </div>
  )
}
