'use client'
import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LABELS_PER_SHEET, AVERY_5160, addressLines } from '@/lib/label-sheet'

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

// TODO(stage 2): swap for a profiles.role check.
const ADMIN_EMAIL = 'dshipps941@gmail.com'

type Order = {
  id: number
  customer_name: string | null
  customer_email: string | null
  created_at: string
  status: string | null
  shipping_address: any
  assigned_band_ids: string[] | null
}

export default function LabelsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [authorized, setAuthorized] = useState(false)
  const [deniedAs, setDeniedAs] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [startAt, setStartAt] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, customer_email, created_at, status, shipping_address, assigned_band_ids')
      .neq('status', 'shipped')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders((data ?? []) as Order[])
    setLoading(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const role = await fetch('/api/me/role').then(r => r.json()).then(d => d.role).catch(() => null)
      if (role === 'admin' || role === 'fulfillment') { setAuthorized(true); load() }
      else { setAuthorized(false); setDeniedAs(user?.email ?? null); setLoading(false) }
    })()
  }, [load])

  const hasAddress = (o: Order) => !!o.shipping_address?.line1
  const printable = orders.filter(hasAddress)
  // Ticks are kept in click order so the sheet matches what the eye expects.
  const pickedOrders = picked.map(id => orders.find(o => o.id === id)).filter(Boolean) as Order[]

  function toggle(id: number) {
    setError('')
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function generate(calibration = false) {
    if (!calibration && picked.length === 0) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/label-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calibration ? { calibration: true } : { orderIds: picked, startAt }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Could not build the sheet.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      // Open rather than force-save: it lands in the browser's PDF viewer where
      // the print dialog is one click away, which is the point of the sheet.
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      setError('Network error — no sheet was produced.')
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
      Loading orders…
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 10 }}>
          {deniedAs ? 'Signed in as the wrong account' : 'Sign in to print labels'}
        </div>
        <p style={{ color: C.secondary, fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          {deniedAs
            ? <>This browser is signed in as <strong style={{ color: C.heading }}>{deniedAs}</strong>. Printing needs <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong>.</>
            : <>Sign in as <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong> to continue.</>}
        </p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/signin/personal?redirect=/fulfill/labels' }} style={btn(C.gold, C.navy)}>
          {deniedAs ? 'Switch account' : 'Sign in'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: 'Inter, sans-serif', color: C.body }}>
      <div style={{ background: C.navy, color: C.pageBg, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase' }}>Address Labels</div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 20 }}>{AVERY_5160.name} · {LABELS_PER_SHEET} per sheet</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/fulfill" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>← Packing</a>
          <a href="/fulfill/handout" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Give away</a>
          <a href="/admin" style={{ color: C.gold, fontSize: 12, fontFamily: 'Cinzel, serif', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>Admin</a>
        </div>
      </div>

      <div className="pb-labels-grid" style={{ padding: 20, display: 'grid', gap: 20, alignItems: 'start' }}>
        <div style={panel}>
          <div style={panelHead}>Orders awaiting shipment</div>
          {orders.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: C.secondary, fontStyle: 'italic' }}>Nothing waiting to ship.</div>
          ) : orders.map(o => {
            const ok = hasAddress(o)
            const on = picked.includes(o.id)
            const addr = o.shipping_address || {}
            return (
              <label
                key={o.id}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 16px',
                  borderBottom: '1px solid ' + C.borderSilver,
                  background: on ? C.greenBg : 'transparent',
                  cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.55,
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!ok}
                  onChange={() => toggle(o.id)}
                  style={{ width: 20, height: 20, marginTop: 2, accentColor: C.green, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 16 }}>
                    {o.customer_name || o.customer_email || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
                    Order #{o.id} · {new Date(o.created_at).toLocaleDateString()} · {o.status}
                    {(o.assigned_band_ids || []).length ? ' · ' + o.assigned_band_ids!.length + ' band' + (o.assigned_band_ids!.length === 1 ? '' : 's') + ' packed' : ''}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 4, color: ok ? C.goldText : C.red }}>
                    {ok
                      ? [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(', '), addr.postal_code].filter(Boolean).join(' · ')
                      : 'No shipping address on file'}
                  </div>
                </div>
              </label>
            )
          })}
          {orders.length > 0 && printable.length === 0 && (
            <div style={{ padding: '14px 16px', fontSize: 12.5, color: C.body, background: C.redBg, lineHeight: 1.6 }}>
              None of these orders has an address stored. Orders placed before the Stripe address fix will stay
              blank — the address is still in Stripe, it just never reached the database.
            </div>
          )}
        </div>

        <div style={panel}>
          <div style={panelHead}>Sheet</div>
          <div style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.secondary, marginBottom: 10 }}>
              Start at label
            </div>
            <p style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.6, marginBottom: 12 }}>
              Tap the first blank label on the sheet you are loading, so a part-used sheet gets finished instead of binned.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 260, marginBottom: 18 }}>
              {Array.from({ length: LABELS_PER_SHEET }, (_, i) => {
                const pos = i + 1
                const isStart = pos === startAt
                const used = pos >= startAt && pos < startAt + picked.length
                return (
                  <button
                    key={pos}
                    onClick={() => setStartAt(pos)}
                    aria-label={'Start at label ' + pos}
                    style={{
                      height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 10,
                      fontFamily: 'ui-monospace, monospace',
                      border: '1px solid ' + (isStart ? C.green : C.borderSilver),
                      background: used ? C.greenBg : 'transparent',
                      color: used ? C.green : C.secondary,
                      fontWeight: isStart ? 700 : 400,
                    }}
                  >{pos}</button>
                )
              })}
            </div>

            <div style={{ fontSize: 13, color: C.body, marginBottom: 14, lineHeight: 1.7 }}>
              <strong style={{ color: C.heading }}>{picked.length}</strong> label{picked.length === 1 ? '' : 's'} selected
              {picked.length > 0 && (
                <> · {Math.ceil((startAt - 1 + picked.length) / LABELS_PER_SHEET)} sheet{Math.ceil((startAt - 1 + picked.length) / LABELS_PER_SHEET) === 1 ? '' : 's'}</>
              )}
            </div>

            {pickedOrders.length > 0 && (
              <div style={{ marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
                {pickedOrders.map((o, i) => (
                  <div key={o.id} style={{ display: 'flex', gap: 8, fontSize: 12, color: C.secondary, padding: '5px 0', borderBottom: '1px solid ' + C.borderSilver }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: C.goldText, flexShrink: 0 }}>{startAt + i}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {addressLines({
                        name: o.customer_name || o.customer_email,
                        line1: o.shipping_address?.line1,
                        line2: o.shipping_address?.line2,
                        city: o.shipping_address?.city,
                        state: o.shipping_address?.state,
                        postal_code: o.shipping_address?.postal_code,
                        country: o.shipping_address?.country,
                      }).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div style={{ fontSize: 13, color: C.red, background: C.redBg, padding: '10px 12px', borderRadius: 8, marginBottom: 14, lineHeight: 1.6 }}>{error}</div>
            )}

            <button
              onClick={() => generate(false)}
              disabled={busy || picked.length === 0}
              style={{ ...btn(picked.length ? C.green : 'rgba(10,22,40,0.10)', picked.length ? '#fff' : C.secondary), width: '100%', opacity: busy || !picked.length ? 0.6 : 1 }}
            >
              {busy ? 'Building…' : 'Open PDF'}
            </button>

            <button
              onClick={() => generate(true)}
              disabled={busy}
              style={{ ...btn('transparent', C.goldText), width: '100%', marginTop: 8, minHeight: 40, padding: '10px 16px', border: '1px solid ' + C.borderSilver }}
            >
              Alignment test sheet
            </button>

            <p style={{ fontSize: 12, color: C.secondary, lineHeight: 1.6, marginTop: 14, background: 'rgba(10,22,40,0.04)', padding: '10px 12px', borderRadius: 8 }}>
              Print at <strong style={{ color: C.heading }}>100% / actual size</strong> — any &ldquo;fit to page&rdquo; or
              &ldquo;shrink oversized pages&rdquo; setting will shift every label off its backing. Run one sheet on plain
              paper and hold it against a label sheet before committing.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .pb-labels-grid { grid-template-columns: 1fr 380px; }
        }
      `}</style>
    </div>
  )
}
