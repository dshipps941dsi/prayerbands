'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function OrgDashboardPage() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'Overview'
  const [org, setOrg] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [bands, setBands] = useState<any[]>([])
  const [prayers, setPrayers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orderQty, setOrderQty] = useState(100)

  useEffect(() => {
    async function load() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, organizations(*)')
        .eq('id', user.id)
        .single()

      if (!profile?.org_id) return
      const orgData = (profile as any).organizations
      setOrg(orgData)

      // Load stats
      const { data: statsData } = await supabase
        .rpc('get_org_stats', { org_uuid: profile.org_id })
      setStats(statsData)

      // Load bands
      const { data: bandsData } = await supabase
        .from('bands')
        .select('band_id, status, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(50)
      setBands(bandsData || [])

      // Load prayers
      const { data: prayersData } = await supabase
        .from('registrations')
        .select('band_id, user_name, prayer, city, country, registered_at')
        .not('prayer', 'is', null)
        .order('registered_at', { ascending: false })
        .limit(20)
      setPrayers(prayersData || [])

      // Load orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
      setOrders(ordersData || [])

      setLoading(false)
    }
    load()
  }, [])

  const green = org?.color || '#1a6b4a'
  const pricePerBand = orderQty >= 500 ? 3.75 : orderQty >= 250 ? 4.0 : orderQty >= 100 ? 4.2 : 4.75
  const orderTotal = (orderQty * pricePerBand).toLocaleString('en-US', { minimumFractionDigits: 2 })

  const statusColor = (s: string) => {
    if (s === 'registered') return { bg: '#e6f4ee', color: '#1a6b4a' }
    if (s === 'unregistered') return { bg: '#fef3e2', color: '#c17f2a' }
    return { bg: '#f3f3f3', color: '#888' }
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) return (
    <div style={{ color: '#8a7c6a', fontSize: 15, paddingTop: 40, textAlign: 'center' }}>
      Loading... ✝
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 7,
    border: '1px solid #ddd6ca', fontSize: 15,
    fontFamily: 'Georgia, serif', background: '#fdfaf7',
    color: '#2c2416', boxSizing: 'border-box' as const, outline: 'none',
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 600 as const, color: '#7a6c5a',
    display: 'block' as const, marginBottom: 6, letterSpacing: 0.4,
  }

  // ── OVERVIEW ──────────────────────────────────────────────
  if (tab === 'Overview') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4, color: '#1a1208' }}>
        Ministry Dashboard
      </h1>
      <p style={{ color: '#8a7c6a', marginBottom: 28, fontSize: 14 }}>
        Every band is a prayer in motion. Here's how far {org?.name}'s love has traveled.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Bands', value: stats?.total_bands || 0, icon: '⟳' },
          { label: 'Active Bands', value: stats?.active_bands || 0, icon: '✦' },
          { label: 'Prayers Offered', value: stats?.total_prayers || 0, icon: '◎' },
          { label: 'Countries', value: stats?.countries || 0, icon: '◈' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e8e1d6',
            borderRadius: 10, padding: '20px 20px 16px',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6, color: green }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 'bold', color: '#1a1208', lineHeight: 1 }}>
              {s.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Recent bands */}
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Bands</span>
            <a href="/org/dashboard?tab=Bands" style={{ fontSize: 12, color: green, textDecoration: 'none' }}>View all →</a>
          </div>
          {bands.slice(0, 6).map((b, i) => {
            const sc = statusColor(b.status)
            const lastReg = b.registrations?.[0]
            return (
              <div key={b.band_id} style={{
                display: 'flex', alignItems: 'center',
                padding: '12px 20px', gap: 12,
                borderBottom: i < 5 ? '1px solid #f7f4ef' : 'none',
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: green, fontWeight: 'bold', minWidth: 100 }}>
                  {b.band_id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {lastReg?.user_name || 'Unregistered'}
                  </div>
                  <div style={{ fontSize: 11, color: '#8a7c6a' }}>
                    {lastReg ? [lastReg.city, lastReg.country].filter(Boolean).join(', ') : '—'}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: sc.bg, color: sc.color, textTransform: 'capitalize',
                }}>{b.status}</div>
              </div>
            )
          })}
          {bands.length === 0 && (
            <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>
              No bands yet — order your first batch to get started.
            </div>
          )}
        </div>

        {/* Prayer wall preview */}
        <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>Recent Prayers</span>
            <a href="/org/dashboard?tab=Prayer Wall" style={{ fontSize: 12, color: green, textDecoration: 'none' }}>View all →</a>
          </div>
          {prayers.slice(0, 4).map((p, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: i < 3 ? '1px solid #f7f4ef' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 'bold' }}>{p.user_name}</span>
                <span style={{ fontSize: 11, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
              </div>
              <div style={{ fontSize: 12, color: '#5a4f42', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{p.prayer}"
              </div>
              <div style={{ fontSize: 10, color: green, fontFamily: 'monospace', marginTop: 4 }}>{p.band_id}</div>
            </div>
          ))}
          {prayers.length === 0 && (
            <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>
              Prayers will appear here as bands are registered.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── BANDS ─────────────────────────────────────────────────
  if (tab === 'Bands') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Your Bands</h1>
      <p style={{ color: '#8a7c6a', marginBottom: 24, fontSize: 14 }}>
        All bands under the {org?.prefix} prefix.
      </p>
      <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0ece6', background: '#fbf9f7', display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr', gap: 12 }}>
          {['Band ID', 'Last Holder', 'Location', 'Status'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#8a7c6a', letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>
        {bands.map((b, i) => {
          const sc = statusColor(b.status)
          const lastReg = b.registrations?.[0]
          return (
            <div key={b.band_id} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr 1fr',
              gap: 12, padding: '13px 20px', alignItems: 'center',
              borderBottom: i < bands.length - 1 ? '1px solid #f7f4ef' : 'none',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: green, fontWeight: 'bold' }}>{b.band_id}</div>
              <div style={{ fontSize: 13 }}>{lastReg?.user_name || '—'}</div>
              <div style={{ fontSize: 12, color: '#8a7c6a' }}>
                {lastReg ? [lastReg.city, lastReg.country].filter(Boolean).join(', ') : '—'}
              </div>
              <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize', display: 'inline-block' }}>
                {b.status}
              </div>
            </div>
          )
        })}
        {bands.length === 0 && (
          <div style={{ padding: '40px 20px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>
            No bands yet. Order your first batch to get started. ✝
          </div>
        )}
      </div>
    </div>
  )

  // ── PRAYER WALL ───────────────────────────────────────────
  if (tab === 'Prayer Wall') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Prayer Wall</h1>
      <p style={{ color: '#8a7c6a', marginBottom: 24, fontSize: 14 }}>
        Every prayer left by someone holding a {org?.prefix} band.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {prayers.map((p, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #e8e1d6',
            borderRadius: 10, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{p.user_name}</span>
              <span style={{ fontSize: 12, color: '#b0a090' }}>{timeAgo(p.registered_at)}</span>
            </div>
            <div style={{ fontSize: 15, color: '#3a2f22', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>
              "{p.prayer}"
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8a7c6a' }}>
              <span style={{ fontFamily: 'monospace', color: green }}>{p.band_id}</span>
              {p.city && <span>{[p.city, p.country].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
        ))}
        {prayers.length === 0 && (
          <div style={{ padding: '40px', color: '#8a7c6a', fontSize: 14, textAlign: 'center' }}>
            Prayers will appear here as bands are registered. ✝
          </div>
        )}
      </div>
    </div>
  )

  // ── ORDERS ────────────────────────────────────────────────
  if (tab === 'Orders') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Order Bands</h1>
      <p style={{ color: '#8a7c6a', marginBottom: 28, fontSize: 14 }}>
        All bands ship laser-engraved with NFC chips and your {org?.prefix} prefix.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: 28, marginBottom: 24, maxWidth: 520 }}>
        <h2 style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 20 }}>New Band Order</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>QUANTITY</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {[50, 100, 250, 500, 1000].map(qty => (
              <button key={qty} onClick={() => setOrderQty(qty)} style={{
                padding: '8px 18px', borderRadius: 6,
                border: orderQty === qty ? `2px solid ${green}` : '2px solid #e8e1d6',
                background: orderQty === qty ? '#e6f4ee' : '#fff',
                color: orderQty === qty ? green : '#5a4f42',
                fontWeight: orderQty === qty ? 700 : 400,
                cursor: 'pointer', fontSize: 14,
              }}>{qty}</button>
            ))}
          </div>
        </div>

        <div style={{ background: '#f7f4ef', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>Volume Pricing</div>
          {[
            { min: 50, max: 99, price: 4.50 },
            { min: 100, max: 249, price: 4.20 },
            { min: 250, max: 499, price: 4.00 },
            { min: 500, max: null, price: 3.75 },
          ].map(tier => {
            const active = orderQty >= tier.min && (tier.max === null || orderQty <= tier.max)
            return (
              <div key={tier.min} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: active ? green : '#8a7c6a', fontWeight: active ? 700 : 400 }}>
                <span>{tier.max ? `${tier.min}–${tier.max} bands` : `${tier.min}+ bands`}</span>
                <span>${tier.price.toFixed(2)}/band</span>
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid #e8e1d6', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#8a7c6a' }}>{orderQty} bands × ${pricePerBand}/band</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>${orderTotal}</div>
          </div>
          <button
            onClick={async () => {
              const res = await fetch('/api/create-org-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: orderQty, orgId: org?.id, orgName: org?.name, prefix: org?.prefix }),
              })
              const { url } = await res.json()
              if (url) window.location.href = url
            }}
            style={{
              background: green, color: '#fff', border: 'none',
              borderRadius: 8, padding: '12px 24px', fontSize: 15,
              fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Georgia, serif',
            }}
          >
            Order Bands →
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: '#8a7c6a', textAlign: 'center' }}>
          Engraved with {org?.prefix}-XXXXX · NFC chip included · Ships in 2–3 weeks
        </div>
      </div>

      {/* Order history */}
      <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 10, overflow: 'hidden', maxWidth: 520 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0ece6', fontWeight: 'bold', fontSize: 15 }}>Order History</div>
        {orders.map((o, i) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < orders.length - 1 ? '1px solid #f7f4ef' : 'none', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' }}>ORD-{o.id}</div>
              <div style={{ fontSize: 11, color: '#8a7c6a' }}>{new Date(o.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{ flex: 1, fontSize: 13 }}>{o.order_metadata?.quantity || '—'} bands</div>
            <div style={{ fontWeight: 'bold' }}>${((o.amount_total || 0) / 100).toFixed(2)}</div>
            <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: '#e6f4ee', color: green, textTransform: 'capitalize' }}>
              {o.status}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div style={{ padding: '24px 20px', color: '#8a7c6a', fontSize: 13, textAlign: 'center' }}>
            No orders yet.
          </div>
        )}
      </div>
    </div>
  )

  // ── SETTINGS ──────────────────────────────────────────────
  if (tab === 'Settings') return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>Church Settings</h1>
      <p style={{ color: '#8a7c6a', marginBottom: 28, fontSize: 14 }}>Your organization profile.</p>
      <div style={{ background: '#fff', border: '1px solid #e8e1d6', borderRadius: 12, padding: 28, maxWidth: 520 }}>
        {[
          { label: 'CHURCH NAME', value: org?.name },
          { label: 'BAND PREFIX', value: `${org?.prefix}-XXXXX`, mono: true },
          { label: 'SUBDOMAIN', value: `${org?.subdomain}.prayerbands.com`, mono: true },
          { label: 'LOCATION', value: org?.location || '—' },
          { label: 'WEBSITE', value: org?.website || '—' },
          { label: 'PLAN', value: org?.plan || 'Ministry' },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 20 }}>
            <label style={labelStyle}>{field.label}</label>
            <div style={{
              border: '1px solid #e8e1d6', borderRadius: 6, padding: '10px 14px',
              fontSize: field.mono ? 13 : 14,
              fontFamily: field.mono ? 'monospace' : 'Georgia, serif',
              background: '#fbf9f7', color: '#2c2416',
            }}>
              {field.value}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: '#8a7c6a', marginTop: 8 }}>
          To update your church details, contact support@prayerbands.com
        </div>
      </div>
    </div>
  )

  return null
}
