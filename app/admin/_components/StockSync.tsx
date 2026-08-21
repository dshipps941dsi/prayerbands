'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type Row = {
  id: string
  slug: string
  name: string
  active: boolean
  size: string
  stored: number
  actual: number
  shelf: number
  reserved: number
  delta: number
}

type Orphan = { theme: string; color: string; count: number }

// The store now counts bands directly, so what customers see is always right.
// This panel exists for the number that is *not* automatic: the stored copy in
// product_variants, which the product editor and the webhook's backorder check
// still read. It shows where that copy has fallen behind and writes it back.
//
// It also names stock the store has no way to sell — a design in the box that no
// active product maps to. That stock counts zero everywhere else, so without
// saying it here it would just look like the bands never existed.
export default function StockSync({ C }: { C: C }) {
  const [rows, setRows] = useState<Row[]>([])
  const [orphans, setOrphans] = useState<Orphan[]>([])
  const [shelfTotal, setShelfTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/resync-stock')
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not read stock.'); return }
      setRows(d.rows || []); setOrphans(d.orphans || []); setShelfTotal(d.shelfTotal ?? null)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function resync() {
    setSaving(true); setError(''); setNote('')
    try {
      const res = await fetch('/api/admin/resync-stock', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Resync failed.'); return }
      setNote(d.updated ? `Updated ${d.updated} size${d.updated === 1 ? '' : 's'}.` : 'Already up to date.')
      await load()
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  const drifted = rows.filter(r => r.delta !== 0)

  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const btn = { padding: '9px 18px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: saving ? 'wait' : 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600, opacity: saving ? 0.6 : 1 }
  const th = { padding: '6px 8px', textAlign: 'left' as const }
  const td = { padding: '6px 8px', color: C.body }

  return (
    <div style={panel}>
      <div style={head}>Store stock</div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6, marginBottom: 14 }}>
          The storefront counts unclaimed bands live, so anything that takes a band out of the box &mdash;
          a sale, a hand-out, a registration, someone claiming it &mdash; comes off the shelf on its own.
          {shelfTotal !== null && <> There {shelfTotal === 1 ? 'is' : 'are'} <strong style={{ color: C.heading }}>{shelfTotal}</strong> band{shelfTotal === 1 ? '' : 's'} on the shelf right now.</>}
          {' '}The stored copy below is only what the product editor shows; resync it when it drifts.
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <button style={btn} onClick={resync} disabled={saving}>{saving ? 'Resyncing…' : 'Resync stored numbers'}</button>
          {note && <span style={{ fontSize: 12, color: C.secondary }}>{note}</span>}
          {error && <span style={{ fontSize: 12, color: '#B4441F' }}>{error}</span>}
        </div>

        {loading ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>Loading…</div>
        ) : drifted.length === 0 ? (
          <div style={{ fontSize: 13, color: C.secondary }}>Stored numbers match the shelf.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>
              {drifted.length} size{drifted.length === 1 ? '' : 's'} where the stored number disagrees with the shelf:
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ color: C.secondary, fontSize: 11 }}>
                  <th style={th}>Product</th><th style={th}>Size</th>
                  <th style={th}>Stored</th><th style={th}>On shelf</th><th style={th}>Reserved</th><th style={th}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {drifted.map(r => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.borderSilver}` }}>
                    <td style={td}>{r.name}{!r.active && <span style={{ color: C.secondary }}> (inactive)</span>}</td>
                    <td style={td}>{r.size}</td>
                    <td style={{ ...td, color: C.secondary }}>{r.stored}</td>
                    <td style={td}>{r.shelf}</td>
                    <td style={td}>{r.reserved || '—'}</td>
                    <td style={{ ...td, fontWeight: 700, color: r.delta < 0 ? '#B4441F' : C.heading }}>{r.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {orphans.length > 0 && (
          <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(180,68,31,0.06)', border: '1px solid rgba(180,68,31,0.28)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#B4441F', marginBottom: 6 }}>
              In the box, but nothing in the store sells them
            </div>
            <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6, marginBottom: 8 }}>
              These bands are unclaimed and ready to ship, but no active product matches their design, so no
              customer can order one and they count toward nothing.
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.body }}>
              {orphans.map((o, i) => (
                <li key={i} style={{ marginBottom: 2 }}>
                  <strong>{o.count}</strong> &times; {o.theme}{o.color !== '—' ? ` · ${o.color}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
