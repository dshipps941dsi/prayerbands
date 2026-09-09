'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type Row = {
  slug: string
  name: string
  size: string
  shelf: number
  reserved: number
  available: number
  soldInWindow: number
  ordersInWindow: number
  ratePerWeek: number
  daysOfCover: number | null
  stockoutOn: string | null
  reorderPoint: number
  suggested: number
  urgency: 'now' | 'soon' | 'ok' | 'low' | 'none'
  confidence: 'ok' | 'thin'
}

type Params = { lead: number; buffer: number; target: number; window: number; floor: number }
const DEFAULTS: Params = { lead: 45, buffer: 14, target: 90, window: 56, floor: 5 }
const LS_KEY = 'pb-admin-reorder-params'

// Suggested reorders, one row per style and size. The arithmetic lives in
// /api/admin/reorder-suggestions; this card shows it with the inputs (lead
// time, safety buffer, target cover) editable so the suggestion can be tuned
// against what the supplier actually does. Inputs persist per browser.
export default function ReorderSuggestions({ C }: { C: C }) {
  const [params, setParams] = useState<Params>(DEFAULTS)
  const [rows, setRows] = useState<Row[]>([])
  const [meta, setMeta] = useState<{ daysObserved: number; ordersInWindow: number; assortedUnits: number; historyThin: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
      if (saved && typeof saved === 'object') setParams({ ...DEFAULTS, ...saved })
    } catch {}
  }, [])

  const load = useCallback(async (p: Params) => {
    setLoading(true); setError('')
    try {
      const qs = new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)]))
      const res = await fetch(`/api/admin/reorder-suggestions?${qs}`)
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not compute suggestions.'); return }
      setRows(d.rows || [])
      setMeta({ daysObserved: d.daysObserved, ordersInWindow: d.ordersInWindow, assortedUnits: d.assortedUnits, historyThin: !!d.historyThin })
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }, [])

  // Debounce so typing a lead time doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(params)) } catch {}
      load(params)
    }, 350)
    return () => clearTimeout(t)
  }, [params, load])

  const needs = rows.filter(r => r.suggested > 0)
  const visible = showAll ? rows : needs

  // Roll the per-size suggestions up by style, which is how a supplier order
  // is actually placed: "30 Light Grey — 8 S, 12 M, 10 L".
  const byStyle = new Map<string, { name: string; total: number; sizes: string[] }>()
  for (const r of needs) {
    const cur = byStyle.get(r.slug) || { name: r.name, total: 0, sizes: [] }
    cur.total += r.suggested
    cur.sizes.push(r.size === '—' ? String(r.suggested) : `${r.size} ${r.suggested}`)
    byStyle.set(r.slug, cur)
  }
  const orderList = [...byStyle.values()].sort((a, b) => b.total - a.total)
  const orderTotal = orderList.reduce((n, s) => n + s.total, 0)

  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }
  const th = { padding: '6px 8px', textAlign: 'left' as const, whiteSpace: 'nowrap' as const }
  const td = { padding: '6px 8px', color: C.body, whiteSpace: 'nowrap' as const }
  const num = { ...td, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const }
  const input = { width: 58, padding: '5px 7px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 12.5, textAlign: 'right' as const, fontFamily: 'Inter, sans-serif', background: '#fff', color: C.body }
  const lbl = { fontSize: 11.5, color: C.secondary, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' as const }

  const pill = (u: Row['urgency']) => {
    const m: Record<Row['urgency'], [string, string, string]> = {
      now: ['Order now', '#B4441F', 'rgba(180,68,31,0.10)'],
      low: ['Running low', '#B4441F', 'rgba(180,68,31,0.10)'],
      soon: ['Order soon', C.goldText, 'rgba(200,169,110,0.18)'],
      ok: ['Covered', C.green, C.greenBg],
      none: ['No sales yet', C.secondary, C.silverBg],
    }
    const [label, fg, bg] = m[u]
    return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: fg, background: bg }}>{label}</span>
  }

  const field = (key: keyof Params, label: string, title: string) => (
    <label style={lbl} title={title}>
      {label}
      <input style={input} type="number" value={params[key]} onChange={e => {
        const v = parseInt(e.target.value, 10)
        if (Number.isFinite(v)) setParams(p => ({ ...p, [key]: v }))
      }} />
    </label>
  )

  return (
    <div style={panel}>
      <div style={head}>
        <span>Reorder suggestions</span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {field('lead', 'Lead time (days)', 'How long the supplier takes from order to delivery.')}
          {field('buffer', 'Safety (days)', 'Extra days of stock to keep on hand in case the shipment or sales run late.')}
          {field('target', 'Cover after delivery (days)', 'How many days of sales a shipment should cover once it lands.')}
          {field('window', 'Sales window (days)', 'How far back to look when measuring how fast a style sells.')}
          {field('floor', 'Low-stock floor', 'Flag any size at or below this many available, even with no recent sales.')}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6, marginBottom: 14 }}>
          For each style and size: how fast it sells, how long the shelf lasts at that pace, and how many to
          order so a shipment placed today lands before it runs out. Suggested quantities restock to{' '}
          <strong style={{ color: C.heading }}>{params.target} days</strong> of cover beyond the {params.lead}-day lead time.
          {meta && meta.historyThin && (
            <> <strong style={{ color: '#B4441F' }}>History is thin</strong> ({meta.ordersInWindow} paid order{meta.ordersInWindow === 1 ? '' : 's'} in
            the last {params.window} days), so the rates are rough &mdash; treat these as a prompt to look, not a purchase order.
            They firm up as sales come in.</>
          )}
          {meta && meta.assortedUnits > 0 && (
            <> {meta.assortedUnits} band{meta.assortedUnits === 1 ? '' : 's'} sold as packs or custom orders are not attributed to a style.</>
          )}
        </div>

        {error && <div style={{ fontSize: 12, color: '#B4441F', marginBottom: 12 }}>{error}</div>}

        {loading && rows.length === 0 ? (
          <div style={{ color: C.secondary, fontSize: 13 }}>Computing…</div>
        ) : (
          <>
            {orderList.length > 0 ? (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(200,169,110,0.10)', border: `1px solid ${C.borderGold}`, borderRadius: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.heading, marginBottom: 6 }}>
                  Suggested order today &mdash; {orderTotal} band{orderTotal === 1 ? '' : 's'}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.body, lineHeight: 1.7 }}>
                  {orderList.map(s => (
                    <li key={s.name}><strong>{s.total}× {s.name}</strong>{s.sizes.length > 1 || s.sizes[0] !== String(s.total) ? <span style={{ color: C.secondary }}> ({s.sizes.join(', ')})</span> : null}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.green, marginBottom: 12 }}>Nothing needs reordering at the current pace.</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: C.secondary }}>
                {showAll ? `All ${rows.length} sizes` : `${needs.length} size${needs.length === 1 ? '' : 's'} flagged`}
                {meta ? ` · rates from the last ${meta.daysObserved} days` : ''}
              </div>
              <button onClick={() => setShowAll(v => !v)} style={{ background: 'none', border: 'none', color: C.goldText, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                {showAll ? 'Show only flagged' : 'Show every size'}
              </button>
            </div>

            {visible.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                  <thead>
                    <tr style={{ color: C.secondary, fontSize: 11 }}>
                      <th style={th}>Style</th><th style={th}>Size</th><th style={th}>Status</th>
                      <th style={{ ...th, textAlign: 'right' }}>Available</th>
                      <th style={{ ...th, textAlign: 'right' }} title="Units sold in the window">Sold</th>
                      <th style={{ ...th, textAlign: 'right' }}>Per week</th>
                      <th style={{ ...th, textAlign: 'right' }} title="Days until the shelf hits zero at the current pace">Cover</th>
                      <th style={th}>Runs out</th>
                      <th style={{ ...th, textAlign: 'right' }} title="Order when available drops to this">Reorder at</th>
                      <th style={{ ...th, textAlign: 'right' }}>Suggest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(r => (
                      <tr key={`${r.slug}|${r.size}`} style={{ borderTop: `1px solid ${C.borderSilver}` }}>
                        <td style={td}>{r.name}</td>
                        <td style={td}>{r.size}</td>
                        <td style={td}>{pill(r.urgency)}{r.confidence === 'thin' && r.urgency !== 'none' && <span title="Fewer than 3 orders for this size in the window" style={{ marginLeft: 6, color: C.secondary, fontSize: 11 }}>~</span>}</td>
                        <td style={num}>{r.available}{r.reserved > 0 && <span style={{ color: C.secondary, fontSize: 11 }}> ({r.reserved} held)</span>}</td>
                        <td style={num}>{r.soldInWindow || '—'}</td>
                        <td style={num}>{r.ratePerWeek || '—'}</td>
                        <td style={num}>{r.daysOfCover === null ? '—' : `${r.daysOfCover}d`}</td>
                        <td style={{ ...td, color: r.urgency === 'now' ? '#B4441F' : C.body }}>{r.stockoutOn ? new Date(r.stockoutOn + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</td>
                        <td style={num}>{r.reorderPoint || '—'}</td>
                        <td style={{ ...num, fontWeight: 700, color: r.suggested > 0 ? C.heading : C.secondary }}>{r.suggested || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
