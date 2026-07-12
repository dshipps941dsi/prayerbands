'use client'
import { useEffect, useState } from 'react'
import { parseOrderItems, orderItemLabel } from '@/lib/fulfillment'

const C = {
  card: '#FFFDF8', navy: '#0A1628', gold: '#C8A96E', goldText: '#9A7A35',
  heading: '#15223B', body: '#2A3344', secondary: '#5C6573', pageBg: '#F6F1E4',
  border: 'rgba(10,22,40,0.12)', green: '#4A8A6A', greenBg: 'rgba(74,138,106,0.12)',
}

type Addr = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } | null
function fmtAddr(a: Addr): string {
  if (!a) return ''
  return [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.postal_code, a.country].filter(Boolean).join(' · ')
}

const money = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`
const date = (s: string) => (s ? new Date(s).toLocaleDateString() : '—')

// Admin "mini-CRM": everything about one customer in a modal — contact,
// addresses, orders (with status + assigned bands), bands owned, subscription.
export default function CustomerDetail({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/customer?id=${encodeURIComponent(userId)}`)
        if (res.ok) setData(await res.json())
      } finally { setLoading(false) }
    })()
  }, [userId])

  const profile = data?.profile
  const bands: any[] = data?.bands ?? []
  const orders: any[] = data?.orders ?? []
  const subscription = data?.subscription
  const spent = orders.reduce((s, o) => s + (o.amount_total || 0), 0)
  const awaiting = orders.filter(o => o.status === 'pending' || o.status === 'processing')
  const addresses = Array.from(new Set(orders.map(o => fmtAddr(o.shipping_address)).filter(Boolean)))

  const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.goldText, fontFamily: 'Cinzel, serif', margin: '0 0 8px' }
  const badge = (status: string) => {
    const ship = status === 'shipped'
    const pend = status === 'pending' || status === 'processing'
    return <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Cinzel, serif', padding: '2px 9px', borderRadius: 12, background: ship ? C.greenBg : pend ? 'rgba(200,169,110,0.16)' : 'rgba(92,101,115,0.12)', color: ship ? C.green : pend ? C.goldText : C.secondary }}>{status}</span>
  }
  const section = (title: string, count: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 20 }}>
      <div style={label}>{title}{count ? ` · ${count}` : ''}</div>
      {children}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.pageBg, borderRadius: 14, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(10,22,40,0.4)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: C.navy, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#F5EDD8', fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{loading ? 'Loading…' : (profile?.full_name || 'No name')}</div>
            {profile?.email && <div style={{ fontSize: 13, color: C.gold, marginTop: 2 }}>{profile.email}</div>}
            {profile && <div style={{ fontSize: 11.5, color: 'rgba(245,237,216,0.55)', marginTop: 3 }}>Member since {date(profile.created_at)}{profile.org_id ? ' · Church account' : ''}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(200,169,110,0.4)', color: C.gold, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '22px 24px' }}>
          {loading ? (
            <div style={{ color: C.secondary, fontSize: 14, textAlign: 'center', padding: 20 }}>Loading customer…</div>
          ) : !profile ? (
            <div style={{ color: C.secondary, fontSize: 14, textAlign: 'center', padding: 20 }}>Customer not found.</div>
          ) : (<>
            {/* Stat strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 22 }}>
              {[['Orders', String(orders.length)], ['Total spent', money(spent)], ['Bands owned', String(bands.length)], ['Awaiting ship', String(awaiting.length)]].map(([l, v]) => (
                <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Cinzel, serif' }}>{l}</div>
                </div>
              ))}
            </div>

            {addresses.length > 0 && section('Shipping addresses', String(addresses.length),
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {addresses.map((a, i) => <div key={i} style={{ fontSize: 13, color: C.body, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px' }}>{a}</div>)}
              </div>
            )}

            {subscription && section('Subscription', '',
              <div style={{ fontSize: 13, color: C.body, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px' }}>
                {badge(subscription.status)} &nbsp;{subscription.band_design || subscription.band_color || 'band'} · next ship {date(subscription.next_ship_date)}{subscription.cancel_at_period_end ? ' · cancelling' : ''}
              </div>
            )}

            {section('Orders', String(orders.length),
              orders.length === 0 ? <div style={{ fontSize: 13, color: C.secondary, fontStyle: 'italic' }}>No orders.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orders.map(o => {
                    const items = parseOrderItems(o.order_metadata)
                    const assigned: string[] = Array.isArray(o.assigned_band_ids) ? o.assigned_band_ids : []
                    return (
                      <div key={o.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontSize: 13, color: C.heading, fontWeight: 600 }}>Order #{o.id} · {date(o.created_at)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{badge(o.status)}<span style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{money(o.amount_total)}</span></div>
                        </div>
                        {items.length > 0 && <div style={{ fontSize: 12.5, color: C.secondary, marginTop: 5 }}>{items.map(orderItemLabel).join(' · ')}</div>}
                        {assigned.length > 0 && <div style={{ fontSize: 12, color: C.goldText, marginTop: 5, fontFamily: 'monospace' }}>Bands: {assigned.join(', ')}</div>}
                        {o.tracking_number && <div style={{ fontSize: 12, color: C.secondary, marginTop: 4 }}>Tracking: {o.tracking_number}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {section('Bands owned', String(bands.length),
              bands.length === 0 ? <div style={{ fontSize: 13, color: C.secondary, fontStyle: 'italic' }}>No bands linked to this account.</div> : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bands.map(b => (
                    <a key={b.band_id} href={`/band/${b.band_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.body, textDecoration: 'none', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.heading }}>{b.band_id}</span>
                      <span style={{ color: C.secondary }}> · {b.theme}{b.color ? `/${b.color}` : ''}{b.size ? ` ${b.size}` : ''} · {b.status}</span>
                    </a>
                  ))}
                </div>
              )
            )}
          </>)}
        </div>
      </div>
    </div>
  )
}
