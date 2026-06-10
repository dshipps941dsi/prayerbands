'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

// PrayerBands brand palette
const C = {
  pageBg: '#F6F1E4',
  card: '#FFFDF8',
  navy: '#0A1628',
  navyMid: '#0E1E38',
  gold: '#C8A96E',
  goldText: '#9A7A35',
  goldDark: '#5A3E12',
  silver: '#C9CFD6',
  silverBg: '#ECEEF1',
  heading: '#15223B',
  body: '#2A3344',
  secondary: '#5C6573',
  borderGold: 'rgba(200,169,110,0.34)',
  borderNavy: 'rgba(10,22,40,0.12)',
  borderSilver: 'rgba(92,101,115,0.20)',
  green: '#4A8A6A',
  greenBg: 'rgba(74,138,106,0.12)',
  red: '#c0392b',
}

const ADMIN_EMAIL = 'dshipps941@gmail.com'

type Order = {
  id: number
  stripe_session_id: string
  customer_name: string
  customer_email: string
  amount_total: number
  payment_status: string
  status: string
  has_custom_bands: boolean
  shipping_address: any
  order_metadata: any
  created_at: string
  tracking_number?: string
  assigned_band_ids?: string[]
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [markingShipped, setMarkingShipped] = useState<number | null>(null)
  const [assigningBands, setAssigningBands] = useState<number | null>(null)
  const [availableBands, setAvailableBands] = useState<number>(0)
  const [selectedBands, setSelectedBands] = useState<{[orderId: number]: string[]}>({})
  const [trackingInputs, setTrackingInputs] = useState<{[orderId: number]: string}>({})
  const [stats, setStats] = useState({ total: 0, pending: 0, shipped: 0, revenue: 0 })
  const [flaggedPrayers, setFlaggedPrayers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [contactSubmissions, setContactSubmissions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'prayers' | 'users' | 'contact' | 'activity' | 'pricing'>('orders')
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [siteConfig, setSiteConfig] = useState<{ key: string; value: string; label: string | null }[]>([])
  const [configDraft, setConfigDraft] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) {
      setAuthorized(true)
      loadAll()
    } else {
      setLoading(false)
    }
  }

  async function loadAll() {
    await Promise.all([loadOrders(), loadStats(), loadFlaggedPrayers(), loadContactSubmissions(), loadActivityFeed(), loadSiteConfig()])
    setLoading(false)
  }

  async function loadSiteConfig() {
    const res = await fetch('/api/admin/site-config')
    if (!res.ok) return
    const { rows } = await res.json()
    if (rows) {
      setSiteConfig(rows)
      const draft: Record<string, string> = {}
      rows.forEach((r: any) => { draft[r.key] = (Number(r.value) / 100).toFixed(2) })
      setConfigDraft(draft)
    }
  }

  async function saveConfig(key: string) {
    const dollars = parseFloat(configDraft[key])
    if (Number.isNaN(dollars) || dollars < 0) { alert('Enter a valid dollar amount.'); return }
    const cents = Math.round(dollars * 100)
    setSavingKey(key)
    const res = await fetch('/api/admin/site-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: cents }),
    })
    setSavingKey(null)
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert('Save failed: ' + (d.error || res.status)); return }
    setSiteConfig(prev => prev.map(r => r.key === key ? { ...r, value: String(cents) } : r))
    setConfigDraft(d => ({ ...d, [key]: (cents / 100).toFixed(2) }))
  }

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
  }

  async function loadStats() {
    const { data: ordersData } = await supabase.from('orders').select('status, amount_total')
    const { count: bandCount } = await supabase.from('bands').select('*', { count: 'exact', head: true }).eq('status', 'available')

    if (ordersData) {
      const total = ordersData.length
      const pending = ordersData.filter(o => o.status === 'pending').length
      const shipped = ordersData.filter(o => o.status === 'shipped').length
      const revenue = ordersData.reduce((sum, o) => sum + (o.amount_total || 0), 0) / 100
      setStats({ total, pending, shipped, revenue })
    }
    if (bandCount !== null) setAvailableBands(bandCount)
  }

  async function loadFlaggedPrayers() {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('flagged', true)
      .order('created_at', { ascending: false })
    if (data) setFlaggedPrayers(data)
  }

  async function loadContactSubmissions() {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setContactSubmissions(data)
  }

  async function loadActivityFeed() {
    const { data } = await supabase
      .from('registrations')
      .select('id, band_id, user_name, location_name, created_at, prayer_text')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setActivityFeed(data)
  }

  async function assignBands(order: Order) {
    const qty = order.order_metadata?.quantity || 1
    setAssigningBands(order.id)
    try {
      const { data: bands } = await supabase
        .from('bands')
        .select('band_id')
        .eq('status', 'available')
        .limit(qty)

      if (!bands || bands.length < qty) {
        alert('Not enough available bands in inventory.')
        return
      }

      const bandIds = bands.map((b: any) => b.band_id)

      await supabase
        .from('bands')
        .update({ status: 'assigned' })
        .in('band_id', bandIds)

      await supabase
        .from('orders')
        .update({ assigned_band_ids: bandIds, status: 'processing' })
        .eq('id', order.id)

      setSelectedBands(prev => ({ ...prev, [order.id]: bandIds }))
      await loadOrders()
      await loadStats()
    } finally {
      setAssigningBands(null)
    }
  }

  async function markAsShipped(order: Order) {
    const tracking = trackingInputs[order.id]?.trim() || ''
    if (!tracking) {
      alert('Please enter a tracking number before marking as shipped.')
      return
    }
    setMarkingShipped(order.id)
    try {
      await supabase
        .from('orders')
        .update({ status: 'shipped', tracking_number: tracking })
        .eq('id', order.id)

      await fetch('/api/send-shipping-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          bandIds: order.assigned_band_ids || selectedBands[order.id] || [],
          trackingNumber: tracking,
        }),
      })

      setTrackingInputs(prev => {
        const next = { ...prev }
        delete next[order.id]
        return next
      })

      await loadOrders()
      await loadStats()
    } finally {
      setMarkingShipped(null)
    }
  }

  async function searchUsers() {
    if (!userSearch.trim()) return
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/admin/user-lookup?q=${encodeURIComponent(userSearch)}`)
      const data = await res.json()
      setUserResults(data.users || [])
    } finally {
      setSearchingUsers(false)
    }
  }

  async function approvePrayer(id: number) {
    await supabase.from('registrations').update({ flagged: false, flagged_reason: null }).eq('id', id)
    setFlaggedPrayers(prev => prev.filter(p => p.id !== id))
  }

  async function removePrayer(id: number) {
    await supabase.from('registrations').update({ prayer_text: null, flagged: false }).eq('id', id)
    setFlaggedPrayers(prev => prev.filter(p => p.id !== id))
  }

  async function promoteToFaq(submission: any) {
    await fetch('/api/admin/promote-faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: submission.id, question: submission.message }),
    })
    alert('Promoted to FAQ review queue.')
  }

  const filteredOrders = orders.filter(o => filter === 'all' ? true : o.status === filter)

  const shippingAddr = (order: Order) => {
    const a = order.shipping_address
    if (!a) return 'No address on file'
    return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', color: C.goldText }}>Loading admin panel...</p>
    </div>
  )

  if (!authorized) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', color: C.goldText }}>Access denied.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: 'Inter, sans-serif', color: C.body }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(10,22,40,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <PrayerBandsLogo size={38} color={C.gold} />
          <div>
            <h1 style={{ margin: 0, color: C.gold, fontSize: '22px', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>PrayerBands Admin</h1>
            <p style={{ margin: '2px 0 0', color: C.silver, fontSize: '12px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order Management &amp; Fulfillment</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href="/admin/products" style={{ color: C.gold, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Products</a>
          <a href="/admin/bands" style={{ color: C.gold, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Band Management</a>
          <a href="/admin/orgs" style={{ color: C.gold, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Churches</a>
          <a href="/dashboard" style={{ color: C.silver, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dashboard</a>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '24px 32px 0' }}>
        {[
          { label: 'Total Orders', value: stats.total },
          { label: 'Pending', value: stats.pending, highlight: stats.pending > 0 },
          { label: 'Shipped', value: stats.shipped },
          { label: 'Bands Available', value: availableBands },
        ].map(s => (
          <div key={s.label} style={{
            background: C.card,
            border: `1px solid ${s.highlight ? C.borderGold : C.borderNavy}`,
            borderRadius: '10px',
            padding: '16px 20px',
            boxShadow: s.highlight ? `0 0 0 2px rgba(200,169,110,0.18), 0 2px 8px rgba(10,22,40,0.06)` : '0 2px 8px rgba(10,22,40,0.06)',
          }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: s.highlight ? C.goldText : C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: C.secondary, marginTop: '4px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '20px 32px 0', borderBottom: `1px solid ${C.borderGold}`, marginTop: '8px' }}>
        {(['orders', 'prayers', 'users', 'contact', 'activity', 'pricing'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px',
            background: activeTab === tab ? C.navy : 'transparent',
            color: activeTab === tab ? C.gold : C.secondary,
            border: 'none',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'Cinzel, serif',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}>{tab}{tab === 'prayers' && flaggedPrayers.length > 0 ? ` (${flaggedPrayers.length})` : ''}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px' }}>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {/* Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['pending', 'processing', 'shipped', 'all'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '6px 16px',
                  background: filter === f ? C.gold : C.card,
                  color: filter === f ? C.navy : C.secondary,
                  border: `1px solid ${filter === f ? C.gold : C.borderNavy}`,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'Cinzel, serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{f}</button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: C.secondary, fontStyle: 'italic' }}>
                No {filter} orders.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredOrders.map(order => {
                  const bands = order.assigned_band_ids || selectedBands[order.id] || []
                  const qty = order.order_metadata?.quantity || 1
                  const needsAssignment = bands.length === 0 && order.status === 'pending'
                  const needsShipping = (order.status === 'processing' || (bands.length > 0 && order.status !== 'shipped'))
                  const isShipped = order.status === 'shipped'

                  return (
                    <div key={order.id} style={{
                      background: C.card,
                      border: `1px solid ${C.borderNavy}`,
                      borderRadius: '10px',
                      padding: '20px 24px',
                      borderLeft: `4px solid ${isShipped ? C.green : needsAssignment ? C.gold : C.goldText}`,
                      boxShadow: '0 2px 8px rgba(10,22,40,0.06)',
                    }}>
                      {/* Order header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{order.customer_name}</div>
                          <div style={{ fontSize: '13px', color: C.goldText }}>{order.customer_email}</div>
                          <div style={{ fontSize: '12px', color: C.secondary, marginTop: '2px' }}>
                            {new Date(order.created_at).toLocaleDateString()} &middot; Order #{order.id}
                          </div>
                          {order.order_metadata?.backordered && (
                            <div style={{ display: 'inline-block', marginTop: 6, background: C.gold, color: C.navy, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 10, fontFamily: 'Cinzel, serif' }}>⚑ Backorder</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                            ${(order.amount_total / 100).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: '12px',
                              background: isShipped ? C.greenBg : needsAssignment ? 'rgba(200,169,110,0.14)' : 'rgba(154,122,53,0.14)',
                              color: isShipped ? C.green : needsAssignment ? C.goldText : C.goldDark,
                              fontSize: '11px',
                              fontFamily: 'Cinzel, serif',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.05em',
                            }}>{order.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Order details */}
                      <div style={{ fontSize: '13px', color: C.body, marginBottom: '12px', lineHeight: '1.6' }}>
                        <strong>Type:</strong> {order.has_custom_bands ? 'Custom' : 'Standard'} &middot; <strong>Qty:</strong> {qty}<br />
                        <strong>Ship to:</strong> {shippingAddr(order)}
                      </div>

                      {/* Assigned bands */}
                      {bands.length > 0 && (
                        <div style={{ marginBottom: '12px', padding: '10px 14px', background: C.silverBg, borderRadius: '6px', fontSize: '13px', border: `1px solid ${C.borderSilver}` }}>
                          <strong style={{ color: C.heading }}>Assigned bands:</strong>{' '}
                          {bands.map((b: string) => (
                            <span key={b} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 8px', background: 'rgba(200,169,110,0.14)', border: `1px solid ${C.borderGold}`, borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: C.goldText }}>{b}</span>
                          ))}
                        </div>
                      )}

                      {/* Tracking number (shipped) */}
                      {isShipped && order.tracking_number && (
                        <div style={{ padding: '10px 14px', background: C.greenBg, border: `1px solid rgba(74,138,106,0.28)`, borderRadius: '6px', fontSize: '13px', color: C.green }}>
                          <strong>Tracking:</strong> {order.tracking_number}
                        </div>
                      )}

                      {/* Actions */}
                      {!isShipped && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          {needsAssignment && (
                            <button
                              onClick={() => assignBands(order)}
                              disabled={assigningBands === order.id}
                              style={{
                                padding: '8px 18px',
                                background: C.gold,
                                color: C.navy,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'Cinzel, serif',
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.05em',
                                fontWeight: '600',
                              }}
                            >
                              {assigningBands === order.id ? 'Assigning...' : `Assign ${qty} Band${qty > 1 ? 's' : ''} \u2192`}
                            </button>
                          )}

                          {needsShipping && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flex: 1 }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', color: C.goldText, marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontFamily: 'Cinzel, serif' }}>
                                  Pirateship Tracking #
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 9400111899223456789012"
                                  value={trackingInputs[order.id] || ''}
                                  onChange={e => setTrackingInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: `1px solid ${C.borderNavy}`,
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    background: C.pageBg,
                                    color: C.body,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => markAsShipped(order)}
                                disabled={markingShipped === order.id || !trackingInputs[order.id]?.trim()}
                                style={{
                                  padding: '8px 18px',
                                  background: trackingInputs[order.id]?.trim() ? C.green : C.silver,
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: trackingInputs[order.id]?.trim() ? 'pointer' : 'not-allowed',
                                  fontSize: '11px',
                                  fontFamily: 'Cinzel, serif',
                                  textTransform: 'uppercase' as const,
                                  letterSpacing: '0.05em',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {markingShipped === order.id ? 'Sending...' : '\u2713 Mark as Shipped'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* PRAYERS TAB */}
        {activeTab === 'prayers' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Flagged Prayers</h2>
            {flaggedPrayers.length === 0 ? (
              <p style={{ color: C.secondary, fontStyle: 'italic' }}>No flagged prayers. All clear.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {flaggedPrayers.map(p => (
                  <div key={p.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
                    <div style={{ fontSize: '13px', marginBottom: '8px', color: C.body }}>
                      <strong style={{ color: C.heading }}>{p.user_name || 'Anonymous'}</strong> &middot; Band {p.band_id}
                    </div>
                    <p style={{ margin: '0 0 8px', color: C.body, fontSize: '14px' }}>{p.prayer_text}</p>
                    {p.flagged_reason && <p style={{ margin: '0 0 12px', fontSize: '12px', color: C.secondary }}>Reason: {p.flagged_reason}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => approvePrayer(p.id)} style={{ padding: '6px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approve</button>
                      <button onClick={() => removePrayer(p.id)} style={{ padding: '6px 14px', background: C.red, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>User Lookup</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                style={{ flex: 1, padding: '10px 14px', border: `1px solid ${C.borderNavy}`, borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '14px', background: C.pageBg, color: C.body, outline: 'none' }}
              />
              <button onClick={searchUsers} disabled={searchingUsers} style={{ padding: '10px 20px', background: C.gold, color: C.navy, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
                {searchingUsers ? 'Searching...' : 'Search'}
              </button>
            </div>
            {userResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userResults.map(u => (
                  <div key={u.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: C.heading }}>{u.full_name || 'No name'}</div>
                      <div style={{ fontSize: '13px', color: C.goldText }}>{u.email}</div>
                      <div style={{ fontSize: '12px', color: C.secondary }}>{u.band_count || 0} bands registered</div>
                    </div>
                    <a href={`/dashboard?viewAs=${u.id}`} style={{ padding: '7px 16px', background: C.gold, color: C.navy, borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>View Dashboard</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Contact Submissions</h2>
            {contactSubmissions.length === 0 ? (
              <p style={{ color: C.secondary, fontStyle: 'italic' }}>No submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contactSubmissions.map(s => (
                  <div key={s.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ color: C.heading }}>{s.name}</strong> &middot; <span style={{ color: C.goldText, fontSize: '13px' }}>{s.email}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: C.secondary }}>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: '14px', color: C.body }}>{s.message}</p>
                    <button onClick={() => promoteToFaq(s)} style={{ padding: '5px 14px', background: 'transparent', border: `1px solid ${C.borderGold}`, color: C.goldText, borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Promote to FAQ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Live Activity Feed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activityFeed.map(a => (
                <div key={a.id} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(10,22,40,0.05)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.green, marginTop: '6px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: C.body }}>
                      <strong style={{ color: C.heading }}>{a.user_name || 'Anonymous'}</strong> registered band <span style={{ fontFamily: 'monospace', color: C.goldText }}>{a.band_id}</span>
                      {a.location_name && <> in <em>{a.location_name}</em></>}
                    </div>
                    {a.prayer_text && <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.secondary, fontStyle: 'italic' }}>"{a.prayer_text}"</p>}
                    <div style={{ fontSize: '11px', color: C.secondary, marginTop: '4px' }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRICING & SHIPPING TAB */}
        {activeTab === 'pricing' && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Pricing &amp; Shipping</h2>
            <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 20px' }}>Edit amounts in dollars. Saved values drive Stripe checkout immediately.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
              {siteConfig.length === 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '20px', textAlign: 'center', color: C.secondary, fontSize: '13px' }}>
                  No config rows found. Run the site_config migration in Supabase.
                </div>
              )}
              {siteConfig.map(row => (
                <div key={row.key} style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: C.heading, fontWeight: '600' }}>{row.label || row.key}</div>
                    <div style={{ fontSize: '11px', color: C.secondary, fontFamily: 'monospace' }}>{row.key}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: C.goldText, fontWeight: '600' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={configDraft[row.key] ?? ''}
                      onChange={e => setConfigDraft(d => ({ ...d, [row.key]: e.target.value }))}
                      style={{ width: '90px', padding: '8px 10px', border: `1px solid ${C.borderNavy}`, borderRadius: '6px', fontSize: '14px', fontFamily: 'Inter, sans-serif', background: C.pageBg, color: C.body, outline: 'none' }}
                    />
                  </div>
                  <button
                    onClick={() => saveConfig(row.key)}
                    disabled={savingKey === row.key}
                    style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600' }}
                  >
                    {savingKey === row.key ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
