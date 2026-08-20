'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { variantForSlug, parseOrderItems, reconcilePack, orderItemLabel, type OrderItem } from '@/lib/fulfillment'

const C = {
  pageBg: '#F6F1E4',
  card: '#FFFDF8',
  navy: '#0A1628',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  heading: '#15223B',
  body: '#2A3344',
  secondary: '#5C6573',
  borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)',
  green: '#4A8A6A',
  greenBg: 'rgba(74,138,106,0.12)',
  red: '#c0392b',
  redBg: 'rgba(192,57,43,0.10)',
}

// TODO(stage 2): swap for a profiles.role check so packers sign in as themselves.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

type Order = {
  id: number
  customer_name: string | null
  customer_email: string | null
  created_at: string
  status: string | null
  amount_total: number
  order_metadata: any
  assigned_band_ids: string[] | null
  shipping_address: any
}

type Scan = {
  band_id: string
  theme: string | null
  color: string | null
  size: string | null
  known: boolean
  shippable: boolean
}

// NFC tags carry the band's own URL, so pull the id back out of whatever the tag
// hands us — and accept a bare id too, since the manual box shares this path.
function bandIdFrom(text: string): string | null {
  const m = text.match(/\/(?:r|band)\/([A-Za-z0-9-]+)/)
  if (m) return m[1].toUpperCase()
  const t = text.trim().toUpperCase()
  return /^[A-Z]{2,4}-[A-Z0-9]{4,8}$/.test(t) ? t : null
}

function designLabel(s: Scan): string {
  const d = [s.theme, s.color].filter(Boolean).join(' ') || 'Unknown'
  return s.size ? `${d} · ${s.size}` : d
}

export default function FulfillPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [authorized, setAuthorized] = useState(false)
  const [deniedAs, setDeniedAs] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [manual, setManual] = useState('')
  const [nfc, setNfc] = useState<'idle' | 'scanning' | 'error'>('idle')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<{ unavailable?: any[]; mismatches?: any[]; shortfalls?: any[] } | null>(null)
  const [done, setDone] = useState<string[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, created_at, status, amount_total, order_metadata, assigned_band_ids, shipping_address')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders((data ?? []) as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === ADMIN_EMAIL) { setAuthorized(true); loadOrders() }
      else { setAuthorized(false); setDeniedAs(user?.email ?? null); setLoading(false) }
    })()
  }, [loadOrders])

  // Stop the reader when the page goes away; a scan left running holds the NFC
  // radio open and keeps firing into a component nobody is looking at.
  useEffect(() => () => { abortRef.current?.abort() }, [])

  const active = orders.find(o => o.id === activeId) || null
  const toPack = orders.filter(o => !(o.assigned_band_ids || []).length && o.status !== 'shipped' && o.status !== 'cancelled')

  function itemsFor(o: Order): OrderItem[] {
    const items = parseOrderItems(o.order_metadata)
    if (items.length) return items
    const qty = Math.max(1, parseInt(o.order_metadata?.quantity || '1', 10) || 1)
    return [{ id: 'assorted', qty }]
  }

  // Same reconciler the server runs on save, so the live ✓/✕ next to a band in
  // the packer's hand is the verdict they will actually get.
  function progress(o: Order, list: Scan[]) {
    return reconcilePack(list.filter(s => s.shippable), itemsFor(o))
  }

  async function addBand(raw: string) {
    const id = bandIdFrom(raw)
    if (!id) { setNote('Could not read a band id from that tag.'); return }
    if (scans.some(s => s.band_id === id)) { setNote(id + ' is already on this order'); return }

    const { data } = await supabase
      .from('bands')
      .select('band_id, theme, color, size, status, owner_id, org_id')
      .eq('band_id', id)
      .maybeSingle()

    const scan: Scan = data
      ? {
          band_id: data.band_id,
          theme: data.theme,
          color: data.color,
          size: data.size,
          known: true,
          shippable: data.status === 'unregistered' && !data.owner_id && !data.org_id,
        }
      : { band_id: id, theme: null, color: null, size: null, known: false, shippable: false }

    setScans(prev => [...prev, scan])
    setProblems(null)
    setNote('')
    if (navigator.vibrate) navigator.vibrate(scan.shippable ? 40 : [60, 40, 60])
  }

  async function startScan() {
    if (!nfcSupported) return
    try {
      const reader = new (window as any).NDEFReader()
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      await reader.scan({ signal: abortRef.current.signal })
      reader.onreading = (event: any) => {
        for (const rec of event.message.records) {
          try {
            const text = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data)
            if (bandIdFrom(text)) { addBand(text); return }
          } catch {}
        }
        setNote('That tag did not carry a band id.')
      }
      setNfc('scanning')
      setNote('')
    } catch (e: any) {
      setNfc('error')
      setNote(e?.message || 'Could not start the NFC reader.')
    }
  }

  function stopScan() {
    abortRef.current?.abort()
    abortRef.current = null
    setNfc('idle')
  }

  function reset() {
    setScans([])
    setProblems(null)
    setDone(null)
    setNote('')
  }

  async function pack(allowMismatch = false) {
    if (!active) return
    setBusy(true)
    setProblems(null)
    try {
      const res = await fetch('/api/admin/pack-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: active.id, bandIds: scans.map(s => s.band_id), allowMismatch }),
      })
      const json = await res.json()
      if (res.ok && json.packed) {
        setDone(json.assigned || [])
        setScans([])
        await loadOrders()
      } else if (json.unavailable?.length || json.mismatches?.length || json.shortfalls?.length) {
        setProblems({ unavailable: json.unavailable, mismatches: json.mismatches, shortfalls: json.shortfalls })
      } else {
        setNote(json.error || 'Could not pack this order.')
      }
    } catch {
      setNote('Network error — nothing was saved.')
    } finally { setBusy(false) }
  }

  const btn = (bg: string, fg: string) => ({
    background: bg, color: fg, border: 'none', borderRadius: 10, padding: '14px 22px',
    fontSize: 13, fontWeight: 700, fontFamily: 'Cinzel, serif', letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, cursor: 'pointer', minHeight: 48,
  })
  const panel = { background: C.card, border: '1px solid ' + C.borderNavy, borderRadius: 12, overflow: 'hidden' as const }
  const panelHead = { padding: '13px 16px', borderBottom: '1px solid ' + C.borderSilver, fontWeight: 700, fontSize: 15, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'grid', placeItems: 'center', color: C.secondary, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
      Loading the packing queue…
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 10 }}>
          {deniedAs ? 'Signed in as the wrong account' : 'Sign in to pack orders'}
        </div>
        <p style={{ color: C.secondary, fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          {deniedAs
            ? <>This browser is signed in as <strong style={{ color: C.heading }}>{deniedAs}</strong>. Packing needs <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong>.</>
            : <>Sign in as <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong> to continue.</>}
        </p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/signin/personal?redirect=/fulfill' }} style={btn(C.gold, C.navy)}>
          {deniedAs ? 'Switch account' : 'Sign in'}
        </button>
      </div>
    </div>
  )

  const prog = active ? progress(active, scans) : null

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: 'Inter, sans-serif', color: C.body }}>
      <div style={{ background: C.navy, color: C.pageBg, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase' }}>Packing Station</div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20 }}>
            {toPack.length} order{toPack.length === 1 ? '' : 's'} to pack
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/fulfill/labels" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Labels</a>
          <a href="/admin" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Admin →</a>
        </div>
      </div>

      <div className="pb-fulfill-grid" style={{ padding: 20, display: 'grid', gap: 20, alignItems: 'start' }}>
        <div style={panel}>
          <div style={panelHead}>Queue</div>
          {toPack.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: C.secondary, fontStyle: 'italic' }}>Nothing waiting to be packed.</div>
          ) : toPack.map(o => {
            const isActive = o.id === activeId
            return (
              <button
                key={o.id}
                onClick={() => { setActiveId(o.id); reset() }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '14px 16px', border: 'none', borderBottom: '1px solid ' + C.borderSilver,
                  background: isActive ? C.greenBg : 'transparent',
                  borderLeft: '4px solid ' + (isActive ? C.green : 'transparent'),
                }}
              >
                <div style={{ fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 16 }}>
                  {o.customer_name || o.customer_email || 'Unnamed'}
                </div>
                <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                  Order #{o.id} · {new Date(o.created_at).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 12, color: C.goldText, marginTop: 4 }}>
                  {itemsFor(o).map(orderItemLabel).join(' · ')}
                </div>
              </button>
            )
          })}
        </div>

        <div style={panel}>
          <div style={panelHead}>{active ? 'Order #' + active.id : 'Pick an order'}</div>

          {!active ? (
            <div style={{ padding: 28, textAlign: 'center', color: C.secondary, fontStyle: 'italic' }}>
              Choose an order from the queue to start packing.
            </div>
          ) : done ? (
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20, color: C.green, marginBottom: 8 }}>Packed ✓</div>
              <p style={{ fontSize: 14, color: C.secondary, lineHeight: 1.6, marginBottom: 14 }}>
                {done.length} band{done.length === 1 ? '' : 's'} recorded against this order and linked to {active.customer_email}. It is now
                {' '}<strong style={{ color: C.heading }}>processing</strong> — add a tracking number in the admin Orders view to send the shipping email.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {done.map(id => (
                  <span key={id} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, background: C.greenBg, color: C.green, padding: '6px 10px', borderRadius: 8 }}>{id}</span>
                ))}
              </div>
              <button onClick={() => { setActiveId(null); reset() }} style={btn(C.gold, C.navy)}>Next order</button>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.secondary, marginBottom: 8 }}>To pack</div>
                {prog!.need.map((n, i) => {
                  const v = variantForSlug(n.id)
                  const filled = n.qty - n.left
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 8, marginBottom: 6, background: n.left === 0 ? C.greenBg : 'rgba(10,22,40,0.04)' }}>
                      <span style={{ color: C.heading, fontSize: 14 }}>{v.name}{n.size ? ' · ' + n.size : ''}</span>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: n.left === 0 ? C.green : C.goldText }}>{filled} / {n.qty}</span>
                    </div>
                  )
                })}
              </div>

              {nfcSupported && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  {nfc === 'scanning' ? (
                    <button onClick={stopScan} style={{ ...btn(C.navy, C.pageBg), flex: '1 1 200px' }}>◉ Tap a band… (stop)</button>
                  ) : (
                    <button onClick={startScan} style={{ ...btn(C.gold, C.navy), flex: '1 1 200px' }}>Start tapping bands</button>
                  )}
                </div>
              )}

              {!nfcSupported && (
                <p style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.6, marginBottom: 12, background: 'rgba(10,22,40,0.04)', padding: '10px 12px', borderRadius: 8 }}>
                  This device can&apos;t read NFC from a browser — Chrome on Android is the only one that can. Type or paste band ids below instead.
                </p>
              )}

              <form onSubmit={e => { e.preventDefault(); const v = manual; setManual(''); if (v.trim()) addBand(v) }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  value={manual}
                  onChange={e => setManual(e.target.value)}
                  placeholder="PB-XXXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  style={{ flex: 1, padding: '13px 14px', fontSize: 16, fontFamily: 'ui-monospace, monospace', border: '1px solid ' + C.borderSilver, borderRadius: 10, background: '#fff', color: C.heading, minWidth: 0 }}
                />
                <button type="submit" style={btn('rgba(10,22,40,0.06)', C.heading)}>Add</button>
              </form>

              {note && (
                <div style={{ fontSize: 13, color: C.red, background: C.redBg, padding: '10px 12px', borderRadius: 8, marginBottom: 14 }}>{note}</div>
              )}

              {scans.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.secondary, marginBottom: 8 }}>
                    In the envelope ({scans.length})
                  </div>
                  {scans.map(s => {
                    const ok = prog!.matchedIds.has(s.band_id)
                    return (
                      <div key={s.band_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 6, background: ok ? C.greenBg : C.redBg }}>
                        <span style={{ color: ok ? C.green : C.red, fontSize: 15 }}>{ok ? '✓' : '✕'}</span>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13.5, color: C.heading }}>{s.band_id}</span>
                        <span style={{ fontSize: 12.5, color: C.secondary, flex: 1 }}>
                          {!s.known ? 'not a known band' : !s.shippable ? 'already claimed or sold' : designLabel(s)}
                        </span>
                        <button
                          onClick={() => setScans(prev => prev.filter(x => x.band_id !== s.band_id))}
                          aria-label={'Remove ' + s.band_id}
                          style={{ background: 'none', border: 'none', color: C.secondary, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
                        >×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {problems && (
                <div style={{ background: C.redBg, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: C.red, fontSize: 13, marginBottom: 6 }}>Not saved</div>
                  {[...(problems.unavailable || []), ...(problems.mismatches || []), ...(problems.shortfalls || [])].map((p: any, i: number) => (
                    <div key={i} style={{ fontSize: 12.5, color: C.body, lineHeight: 1.6 }}>
                      {p.band_id ? <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{p.band_id}</strong> : null} {p.reason}
                    </div>
                  ))}
                  {!problems.unavailable?.length && !problems.shortfalls?.length && !!problems.mismatches?.length && (
                    <button onClick={() => pack(true)} disabled={busy} style={{ ...btn(C.red, '#fff'), marginTop: 10, padding: '10px 16px', minHeight: 40 }}>
                      Pack anyway
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => pack(false)}
                disabled={busy || scans.length === 0}
                style={{
                  ...btn(prog!.remaining === 0 ? C.green : 'rgba(10,22,40,0.10)', prog!.remaining === 0 ? '#fff' : C.secondary),
                  width: '100%',
                  opacity: busy || scans.length === 0 ? 0.6 : 1,
                }}
              >
                {busy ? 'Saving…' : prog!.remaining === 0 ? 'Pack this order' : prog!.remaining + ' band' + (prog!.remaining === 1 ? '' : 's') + ' still needed'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .pb-fulfill-grid { grid-template-columns: 360px 1fr; }
        }
      `}</style>
    </div>
  )
}
