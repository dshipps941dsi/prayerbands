'use client'
import { useCallback, useEffect, useState } from 'react'

type C = Record<string, string>

type Event = {
  kind: 'registration' | 'transfer' | 'ownership'
  at: string
  band_id: string
  who: string | null
  email: string | null
  detail: string | null
  style: string | null
}

type Inventory = {
  sellable: number
  org_stock: number
  registered: number
  handed_out?: number
  total: number
  breakdown: { theme: string; color: string; size: string; count: number }[]
}

const when = (iso: string) => {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return d.toLocaleString()
}

// Launch-window telemetry. Everything here is read-only: a feed of what is
// happening to bands, a full history for one band, and what is left in stock.
// `show` splits the two audiences this data serves: the live feed belongs with
// moderation under Activity, while stock levels belong with Orders, next to the
// fulfilment work that consumes them.
// One label for a stock row: the theme (title-cased) for themed bands, else the
// engraved colour. Combines the old Design + Colour columns into one.
function styleLabel(r: { theme: string; color: string }): string {
  const t = (r.theme || '').trim()
  if (t && t !== 'default' && t !== '—') return t.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const c = (r.color || '').trim()
  return c && c !== '—' ? c : 'Classic'
}

export default function ActivityFeed({ C, show = 'feed' }: { C: C; show?: 'feed' | 'inventory' }) {
  const [events, setEvents] = useState<Event[]>([])
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<any | null>(null)
  const [historyError, setHistoryError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/admin/activity?${params}`)
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not load activity.'); return }
      const d = await res.json()
      setEvents(d.events || [])
      setInventory(d.inventory || null)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  async function loadHistory() {
    // Band history needs an actual band, so the search text is read as one.
    const id = search.trim()
    if (!id) { setHistoryError('Type a band ID first.'); return }
    setHistory(null); setHistoryError('')
    const res = await fetch(`/api/admin/activity?mode=band&bandId=${encodeURIComponent(id)}`)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setHistoryError(d.error || 'Could not load that band.'); return }
    setHistory(d)
  }

  const panel = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }
  const head = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const input = { padding: '9px 12px', border: `1px solid ${C.borderSilver}`, borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', color: C.body, background: '#fff' }
  const btn = { padding: '9px 18px', background: C.gold, color: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }

  return (
    <div>
      {/* Inventory */}
      {show === 'inventory' && (
      <div style={panel}>
        <div style={head}>Inventory</div>
        <div style={{ padding: 16 }}>
          {inventory ? (
            <>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  { n: inventory.sellable, l: 'Sellable' },
                  { n: inventory.registered, l: 'Registered' },
                  { n: inventory.handed_out ?? 0, l: 'Given away' },
                  { n: inventory.org_stock, l: 'Church stock' },
                  { n: inventory.total, l: 'Total made' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: C.secondary, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>Unclaimed stock by style and size — what you can actually ship. Rows with 5 or fewer left are flagged.</div>
              <div style={{ overflowX: 'auto', maxWidth: 440 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: C.secondary, fontSize: 11 }}>
                      <th style={{ padding: '6px 8px' }}>Style</th>
                      <th style={{ padding: '6px 8px' }}>Size</th><th style={{ padding: '6px 8px' }}>Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...inventory.breakdown]
                      .map(r => ({ ...r, _style: styleLabel(r) }))
                      .sort((a, b) => a._style.localeCompare(b._style) || a.size.localeCompare(b.size))
                      .map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.borderSilver}`, background: r.count <= 5 ? 'rgba(180,68,31,0.09)' : 'transparent' }}>
                        <td style={{ padding: '7px 8px', color: r.count <= 5 ? '#B4441F' : C.body, fontWeight: r.count <= 5 ? 600 : 400 }}>{r._style}</td>
                        <td style={{ padding: '7px 8px', color: r.count <= 5 ? '#B4441F' : C.body }}>{r.size}</td>
                        <td style={{ padding: '7px 8px', fontWeight: 700, color: r.count <= 5 ? '#B4441F' : C.heading, whiteSpace: 'nowrap' }}>
                          {r.count}{r.count <= 5 && <span style={{ marginLeft: 6, fontSize: 9, fontFamily: 'Cinzel, serif', letterSpacing: '0.06em', color: '#B4441F', border: '1px solid rgba(180,68,31,0.4)', borderRadius: 10, padding: '1px 6px' }}>LOW</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div style={{ color: C.secondary, fontSize: 13 }}>{loading ? 'Loading…' : '—'}</div>}
        </div>
      </div>
      )}

      {show === 'feed' && (<>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {/* One box. You rarely know which of the three you are holding when you
            start typing, and the server matches all of them rather than
            guessing — "MASON" is both a band code and a person. */}
        <input
          style={{ ...input, minWidth: 300, flex: 1 }}
          placeholder="Search band ID, name, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load() }}
        />
        <button style={btn} onClick={load}>Refresh</button>
        <button style={{ ...btn, background: 'transparent', color: C.goldText, border: `1px solid ${C.gold}` }} onClick={loadHistory}>Band history</button>
        {search && (
          <button style={{ ...btn, background: 'transparent', color: C.secondary, border: `1px solid ${C.borderSilver}` }} onClick={() => { setSearch(''); setHistory(null); setHistoryError('') }}>Clear</button>
        )}
      </div>

      {historyError && <div style={{ color: '#B4441F', fontSize: 13, marginBottom: 12 }}>{historyError}</div>}

      {/* Single-band history */}
      {history && (
        <div style={panel}>
          <div style={head}>{history.band.band_id} — full history</div>
          <div style={{ padding: 16, fontSize: 13, fontFamily: 'Inter, sans-serif', color: C.body }}>
            <div style={{ marginBottom: 14, color: C.secondary }}>
              {history.band.status} · {history.band.theme || 'default'} · {history.band.color || 'no colour'} · {history.band.size || 'no size'} · batch {history.band.batch || '—'}<br />
              Owner: <strong style={{ color: C.heading }}>{history.band.owner_email || 'nobody'}</strong>
              {history.band.dedication_recipient && <> · Dedicated to <strong style={{ color: C.heading }}>{history.band.dedication_recipient}</strong>{history.band.dedication_viewed ? ' (seen)' : ' (not yet seen)'}</>}
            </div>
            {history.registrations.length === 0 && <div style={{ color: C.secondary }}>Never registered.</div>}
            {history.registrations.map((r: any, i: number) => (
              <div key={r.id} style={{ borderTop: `1px solid ${C.borderSilver}`, padding: '10px 0' }}>
                <strong style={{ color: C.heading }}>{i + 1}. {r.user_name || 'Someone'}</strong>
                {' — '}{[r.city, r.state, r.country].filter(Boolean).join(', ') || 'no location'}
                <div style={{ color: C.secondary, fontSize: 12, marginTop: 3 }}>
                  {new Date(r.registered_at).toLocaleString()} · {r.account_email || <span style={{ color: '#B4441F' }}>guest — no account linked</span>}
                  {!r.geocoded && <span style={{ color: '#B4441F' }}> · no map pin</span>}
                </div>
                {r.prayer && <div style={{ fontStyle: 'italic', color: C.secondary, marginTop: 4 }}>&ldquo;{r.prayer}&rdquo;</div>}
              </div>
            ))}
            {history.ownership?.map((o: any) => (
              <div key={`own-${o.id}`} style={{ borderTop: `1px solid ${C.borderSilver}`, padding: '10px 0', color: C.secondary }}>
                ⚑ {o.new_email
                  ? (o.old_email ? <>ownership moved from <strong style={{ color: C.heading }}>{o.old_email}</strong> to <strong style={{ color: C.heading }}>{o.new_email}</strong></> : <>claimed by <strong style={{ color: C.heading }}>{o.new_email}</strong></>)
                  : <>released from <strong style={{ color: C.heading }}>{o.old_email || 'unknown'}</strong></>}
                {' · '}{new Date(o.changed_at).toLocaleString()}
              </div>
            ))}
            {history.transfers.map((t: any) => (
              <div key={t.id} style={{ borderTop: `1px solid ${C.borderSilver}`, padding: '10px 0', color: C.secondary }}>
                ↗ passed on by {t.from_email || 'unknown'} · {t.status} · {new Date(t.created_at).toLocaleString()}
                {t.note && <div style={{ fontStyle: 'italic', marginTop: 4 }}>&ldquo;{t.note}&rdquo;</div>}
              </div>
            ))}

            {/* Lineage — the history above says where the object went; this says
                what it grew. Kept in the same panel so one band ID answers both. */}
            {history.lineage && (
              <div style={{ borderTop: `2px solid ${C.borderSilver}`, marginTop: 14, paddingTop: 14 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 16, fontWeight: 700, color: C.heading, marginBottom: 8 }}>
                  Lineage
                </div>

                <div style={{ color: C.secondary, marginBottom: 12 }}>
                  {history.lineage.giver_email ? (
                    <>Put into circulation by <strong style={{ color: C.heading }}>{history.lineage.giver_email}</strong>
                      {history.lineage.giver_pending && <span style={{ color: '#B4441F' }}> (no account yet — credit attaches when they sign up)</span>}
                    </>
                  ) : 'No giver recorded — nobody is credited for this band.'}
                </div>

                {history.lineage.introduced.length === 0 ? (
                  <div style={{ color: C.secondary }}>Nobody has joined through this band yet.</div>
                ) : (
                  history.lineage.introduced.map((p: any) => (
                    <div key={p.id} style={{ borderTop: `1px solid ${C.borderSilver}`, padding: '10px 0' }}>
                      <div>
                        ↳ <strong style={{ color: C.heading }}>{p.name || p.email}</strong>
                        <span style={{ color: C.secondary }}> joined through this band · {new Date(p.joined_at).toLocaleDateString()}</span>
                      </div>
                      {p.downline.length === 0 ? (
                        <div style={{ color: C.secondary, fontSize: 12, marginTop: 4, paddingLeft: 16 }}>No one under them yet.</div>
                      ) : (
                        <>
                          <div style={{ color: C.secondary, fontSize: 12, margin: '6px 0 4px', paddingLeft: 16 }}>
                            {p.downline.length} {p.downline.length === 1 ? 'person' : 'people'} below them:
                          </div>
                          {p.downline.map((d: any, i: number) => (
                            <div key={i} style={{ fontSize: 12.5, color: C.body, paddingLeft: 16 + d.depth * 14, marginTop: 2 }}>
                              <span style={{ color: C.secondary }}>{'└ '}</span>{d.name || d.email || 'unknown'}
                              <span style={{ color: C.secondary }}> · level {d.depth}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={panel}>
        <div style={head}>Recent activity</div>
        <div style={{ padding: 16 }}>
          {error && <div style={{ color: '#B4441F', fontSize: 13 }}>{error}</div>}
          {!error && loading && <div style={{ color: C.secondary, fontSize: 13 }}>Loading…</div>}
          {!error && !loading && events.length === 0 && <div style={{ color: C.secondary, fontSize: 13 }}>Nothing yet.</div>}
          {events.map((e, i) => (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.borderSilver}`, padding: '10px 0', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              <div>
                <span style={{ display: 'inline-block', minWidth: 74, fontSize: 10, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: e.kind === 'registration' ? C.secondary : C.goldText }}>
                  {e.kind === 'transfer' ? 'Passed on' : e.kind === 'ownership' ? 'Claimed' : 'Registered'}
                </span>
                <button
                  onClick={() => { setSearch(e.band_id); setHistory(null); setHistoryError('') }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, color: C.heading, fontWeight: 700 }}
                >{e.band_id}</button>
                {/* What the band physically is, so a row names an object and
                    not just a code. */}
                {e.style && <span style={{ color: C.goldText, fontSize: 12 }}> · {e.style}</span>}
                {e.who && <span style={{ color: C.body }}> · {e.who}</span>}
                {e.email && <span style={{ color: C.secondary }}> · {e.email}</span>}
              </div>
              <div style={{ color: C.secondary, fontSize: 12, marginTop: 3, paddingLeft: 74 }}>
                {when(e.at)}{e.detail ? ` · ${e.detail}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </div>
  )
}
