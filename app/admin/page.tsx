'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'
import BandsManager from './_components/BandsManager'
import ProductsManager from './_components/ProductsManager'
import PricingManager from './_components/PricingManager'
import ThemesManager from './_components/ThemesManager'
import BatchGenerator from './_components/BatchGenerator'
import CustomerDetail from './_components/CustomerDetail'
import { parseOrderItems, orderItemLabel } from '@/lib/fulfillment'

// Prayer Bands brand palette
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

const dedInput: CSSProperties = { padding: '10px 12px', border: `1px solid ${C.borderNavy}`, borderRadius: 6, fontSize: 14, fontFamily: 'Inter, sans-serif', color: C.heading, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }

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
  // What the browser session says when authorization fails: an email means a
  // different account is signed in, null means no session at all. Drives the
  // denied screen, which used to just say "Access denied".
  const [deniedAs, setDeniedAs] = useState<string | null>(null)
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
  const [activeTab, setActiveTab] = useState<'orders' | 'shipments' | 'sales' | 'catalog' | 'prayers' | 'users'>('orders')
  const [crmUserId, setCrmUserId] = useState<string | null>(null)
  const [catalogSub, setCatalogSub] = useState<'bands' | 'products' | 'pricing' | 'themes' | 'generate'>('bands')
  const [sales, setSales] = useState<any>(null)
  const [salesDays, setSalesDays] = useState('30')
  const [dedBandId, setDedBandId] = useState('')
  const [dedRecipient, setDedRecipient] = useState('')
  const [dedNote, setDedNote] = useState('')
  const [dedSaving, setDedSaving] = useState(false)
  const [dedMsg, setDedMsg] = useState('')
  const [shipments, setShipments] = useState<any[]>([])
  const [shipTracking, setShipTracking] = useState<{ [id: string]: string }>({})
  const [shipBusy, setShipBusy] = useState<string | null>(null)
  const [bandLookup, setBandLookup] = useState('')
  const [bandPrayers, setBandPrayers] = useState<any[] | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  // Search prayers by text / name / city — find a wall prayer without its band ID.
  const [prayerSearch, setPrayerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searchingPrayers, setSearchingPrayers] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAuth()
    // Deep links from old standalone pages: /admin?tab=catalog&sub=products
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'catalog') {
      setActiveTab('catalog')
      const sub = params.get('sub')
      if (sub === 'products' || sub === 'pricing' || sub === 'bands' || sub === 'themes' || sub === 'generate') setCatalogSub(sub)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'sales' && authorized) loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, salesDays, authorized])

  useEffect(() => {
    if (activeTab === 'shipments' && authorized) loadShipments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authorized])

  async function loadSales() {
    const res = await fetch('/api/admin/sales?days=' + salesDays)
    if (res.ok) setSales(await res.json())
  }

  async function preDedicate() {
    if (!dedBandId.trim()) { setDedMsg('Enter a band ID.'); return }
    setDedSaving(true); setDedMsg('')
    try {
      const res = await fetch('/api/save-dedications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId: dedBandId.trim(), dedication_recipient: dedRecipient, dedication_note: dedNote, adminOverride: true }),
      })
      if (res.ok) {
        // Echo the band the server actually wrote to (normalized/uppercased),
        // so a mistyped ID is obvious rather than a bare "Saved".
        const d = await res.json().catch(() => ({}))
        setDedMsg('saved:' + (d.bandId || dedBandId.trim().toUpperCase()))
        setDedBandId(''); setDedRecipient(''); setDedNote(''); setTimeout(() => setDedMsg(''), 5000)
      }
      else { const d = await res.json().catch(() => ({})); setDedMsg(d.error || 'Could not save.') }
    } catch { setDedMsg('Network error.') }
    setDedSaving(false)
  }

  async function loadShipments() {
    const res = await fetch('/api/admin/subscription-shipments')
    if (res.ok) { const d = await res.json(); setShipments(d.shipments || []) }
  }

  async function assignShipment(s: any) {
    setShipBusy(s.id)
    try {
      const res = await fetch('/api/admin/subscription-shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', shipmentId: s.id }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error || 'Could not assign bands.'); return }
      await loadShipments()
    } finally { setShipBusy(null) }
  }

  async function shipShipment(s: any) {
    const tracking = shipTracking[s.id]?.trim() || ''
    if (!tracking) { alert('Enter a tracking number before marking as shipped.'); return }
    setShipBusy(s.id)
    try {
      const res = await fetch('/api/admin/subscription-shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ship', shipmentId: s.id, tracking }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error || 'Could not mark shipped.'); return }
      // Email the subscriber (reuses the order shipping confirmation).
      if (s.customer_email) {
        await fetch('/api/send-shipping-confirmation', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: s.id, customerEmail: s.customer_email, customerName: s.customer_name || 'Friend', bandIds: s.band_ids || d.shipment?.band_ids || [], trackingNumber: tracking }),
        })
      }
      await loadShipments()
    } finally { setShipBusy(null) }
  }

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email === ADMIN_EMAIL) {
      setAuthorized(true)
      setDeniedAs(null)
      loadAll()
    } else {
      // Also runs on re-checks, so a session that dies or switches while the
      // panel is open drops it out of the authorized view instead of leaving a
      // working-looking UI whose every request 401s.
      setAuthorized(false)
      setDeniedAs(user?.email ?? null)
      setLoading(false)
    }
  }

  // Re-verify whenever the tab regains focus, and whenever any admin request
  // comes back 401. Authorization was previously checked once on mount and
  // cached in state, so signing in as a test account in the same browser left
  // the panel fully rendered while the server saw somebody else.
  useEffect(() => {
    const recheck = () => { checkAuth() }
    const onVisible = () => { if (document.visibilityState === 'visible') recheck() }
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', onVisible)

    const originalFetch = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args)
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? ''
      if (res.status === 401 && url.includes('/api/')) recheck()
      return res
    }

    return () => {
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', onVisible)
      window.fetch = originalFetch
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    await Promise.all([loadOrders(), loadStats(), loadFlaggedPrayers()])
    setLoading(false)
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
    // Shippable inventory = general-store bands not yet claimed by anyone. (Bands
    // are seeded 'unregistered'; 'available' was never written, so the old query
    // always read 0.) org_id null excludes church/org stock; 'assigned' bands
    // also leave this pool.
    const { count: bandCount } = await supabase.from('bands').select('band_id', { count: 'exact', head: true }).eq('status', 'unregistered').is('owner_id', null).is('org_id', null)

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
    const res = await fetch('/api/admin/band-prayers?flagged=true')
    if (res.ok) { const d = await res.json(); setFlaggedPrayers(d.prayers || []) }
  }

  async function assignBands(order: Order) {
    setAssigningBands(order.id)
    try {
      // Server-side matching: picks bands whose design (theme/color) and size
      // match each ordered line, links the buyer, and reports any shortfalls.
      const res = await fetch('/api/admin/assign-order-bands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        const short = Array.isArray(d.shortfalls) && d.shortfalls.length
          ? '\n\nShort on: ' + d.shortfalls.map((s: any) => `${s.ordered - s.matched}× ${s.design}${s.size ? ' ' + s.size : ''}`).join(', ')
          : ''
        alert((d.error || 'Could not assign bands.') + short)
        return
      }
      if (Array.isArray(d.shortfalls) && d.shortfalls.length) {
        alert(`Assigned ${d.count} band(s), but inventory is short on:\n` +
          d.shortfalls.map((s: any) => `• ${s.ordered - s.matched}× ${s.design}${s.size ? ' ' + s.size : ''}`).join('\n') +
          '\n\nGenerate more of those designs, then assign the rest.')
      }
      setSelectedBands(prev => ({ ...prev, [order.id]: d.assigned || [] }))
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
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', id }) })
    if (res.ok) setFlaggedPrayers(prev => prev.filter(p => p.id !== id))
  }

  async function removePrayer(id: number) {
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id }) })
    if (res.ok) setFlaggedPrayers(prev => prev.filter(p => p.id !== id))
  }

  async function lookupBandPrayers() {
    const id = bandLookup.trim()
    if (!id) return
    setLookingUp(true)
    const res = await fetch('/api/admin/band-prayers?bandId=' + encodeURIComponent(id))
    const d = res.ok ? await res.json() : { prayers: [] }
    setBandPrayers(d.prayers || [])
    setLookingUp(false)
  }

  // Remove a specific prayer: clear its text and hide it from the public wall.
  // The registration row stays so the band's journey/lineage is preserved.
  async function removeBandPrayer(id: number) {
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id }) })
    if (res.ok) setBandPrayers(prev => prev ? prev.map(p => p.id === id ? { ...p, prayer: null, flagged: true } : p) : prev)
    else alert('Could not remove the prayer. Please try again.')
  }

  // Hard delete: removes the registration row entirely (prayer AND the band-journey
  // stop). Use for test data. Irreversible.
  async function deleteBandRegistration(id: number) {
    if (!confirm('Delete this entry entirely? This removes the prayer AND this stop from the band’s journey. This cannot be undone.')) return
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    if (res.ok) setBandPrayers(prev => prev ? prev.filter(p => p.id !== id) : prev)
    else alert('Could not delete the entry. Please try again.')
  }

  // Search prayers across all bands by text / name / city / band id.
  async function searchPrayers() {
    const q = prayerSearch.trim()
    if (!q) return
    setSearchingPrayers(true)
    const res = await fetch('/api/admin/band-prayers?search=' + encodeURIComponent(q))
    const d = res.ok ? await res.json() : { prayers: [] }
    setSearchResults(d.prayers || [])
    setSearchingPrayers(false)
  }

  // Remove / delete acting on the search results list.
  async function removeSearchPrayer(id: number) {
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', id }) })
    if (res.ok) setSearchResults(prev => prev ? prev.map(p => p.id === id ? { ...p, prayer: null, flagged: true } : p) : prev)
    else alert('Could not remove the prayer. Please try again.')
  }
  async function deleteSearchRegistration(id: number) {
    if (!confirm('Delete this entry entirely? This removes the prayer AND this stop from the band’s journey. This cannot be undone.')) return
    const res = await fetch('/api/admin/band-prayers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    if (res.ok) setSearchResults(prev => prev ? prev.filter(p => p.id !== id) : prev)
    else alert('Could not delete the entry. Please try again.')
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
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: 460, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 24, fontWeight: 700, color: C.heading, marginBottom: 10 }}>
          {deniedAs ? 'Signed in as the wrong account' : 'Your admin session has expired'}
        </div>
        <p style={{ color: C.secondary, fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>
          {deniedAs
            ? <>This browser is signed in as <strong style={{ color: C.heading }}>{deniedAs}</strong>. The admin panel needs <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong>.</>
            : <>Sign in again as <strong style={{ color: C.heading }}>{ADMIN_EMAIL}</strong> to continue.</>}
        </p>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/signin/personal?redirect=/admin' }}
          style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '12px 26px', fontSize: 13, fontWeight: 700, fontFamily: 'Cinzel, serif', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          {deniedAs ? 'Switch account' : 'Sign in'}
        </button>
      </div>
    </div>
  )

  const money = (c: number) => '$' + ((c || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const kpiCard: CSSProperties = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }
  const kpiValue: CSSProperties = { fontSize: 26, fontWeight: 600, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }
  const kpiLabel: CSSProperties = { fontSize: 11, color: C.secondary, marginTop: 4, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }
  const panel: CSSProperties = { background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }
  const panelHead: CSSProperties = { padding: '13px 16px', borderBottom: `1px solid ${C.borderSilver}`, fontWeight: 700, fontSize: 14, color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, fontFamily: 'Inter, sans-serif', color: C.body }}>
      {/* Mobile-responsive overrides. Inline styles can't be hit by media queries,
          so these class hooks + !important collapse the desktop grids on phones. */}
      <style>{`
        @media (max-width: 720px) {
          .pb-admin-header { padding: 14px 16px !important; flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .pb-admin-nav { gap: 14px 16px !important; }
          .pb-admin-kpis { grid-template-columns: repeat(2, 1fr) !important; padding-left: 16px !important; padding-right: 16px !important; gap: 12px !important; }
          .pb-admin-grid4 { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .pb-admin-tabs { padding: 14px 16px 0 !important; flex-wrap: wrap !important; row-gap: 4px; }
          .pb-admin-content { padding: 18px 16px !important; }
          .pb-admin-grid2 { grid-template-columns: 1fr !important; }
          .pb-admin-chartgrid { grid-template-columns: 1fr !important; }
          .pb-admin-card { padding: 16px 16px !important; }
        }
      `}</style>
      {/* Header */}
      <div className="pb-admin-header" style={{ background: C.navy, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(10,22,40,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/" aria-label="Prayer Bands home" style={{ display: 'inline-flex' }}><PrayerBandsLogo size={38} color={C.gold} /></a>
          <div>
            <h1 style={{ margin: 0, color: C.gold, fontSize: '22px', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Prayer Bands Admin</h1>
            <p style={{ margin: '2px 0 0', color: C.silver, fontSize: '12px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order Management &amp; Fulfillment</p>
          </div>
        </div>
        <div className="pb-admin-nav" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <a href="/admin/orgs" style={{ color: C.gold, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Churches</a>
          <a href="/admin/contacts" style={{ color: C.gold, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contacts</a>
          <a href="/dashboard" style={{ color: C.silver, fontSize: '12px', textDecoration: 'none', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dashboard</a>
        </div>
      </div>

      {/* KPI Row */}
      <div className="pb-admin-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '24px 32px 0' }}>
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
      <div className="pb-admin-tabs" style={{ display: 'flex', gap: '4px', padding: '20px 32px 0', borderBottom: `1px solid ${C.borderGold}`, marginTop: '8px' }}>
        {(['orders', 'shipments', 'sales', 'catalog', 'prayers', 'users'] as const).map(tab => (
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
          }}>{tab === 'catalog' ? 'Band Mgmt' : tab}{tab === 'prayers' && flaggedPrayers.length > 0 ? ` (${flaggedPrayers.length})` : ''}</button>
        ))}
      </div>

      <div className="pb-admin-content" style={{ padding: '24px 32px' }}>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {/* Pre-dedicate a band */}
            <div style={{ background: C.card, border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Pre-dedicate a Band</div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 14, lineHeight: 1.5 }}>Attach a recipient + message so the band shows a &ldquo;sent especially for you&rdquo; screen on the recipient&rsquo;s first tap.</div>
              <div className="pb-admin-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input value={dedBandId} onChange={e => setDedBandId(e.target.value)} placeholder="Band ID (e.g. PB-1234)" style={dedInput} />
                <input value={dedRecipient} onChange={e => setDedRecipient(e.target.value)} placeholder="Recipient name" style={dedInput} />
              </div>
              <textarea value={dedNote} onChange={e => setDedNote(e.target.value)} placeholder="Personal message…" style={{ ...dedInput, minHeight: 72, resize: 'vertical' as const, fontFamily: 'Inter, sans-serif' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <button onClick={preDedicate} disabled={dedSaving} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: dedSaving ? 'wait' : 'pointer' }}>{dedSaving ? 'Saving…' : 'Save Dedication'}</button>
                {dedMsg.startsWith('saved:') ? <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>Saved to {dedMsg.slice(6)} ✓</span> : dedMsg && <span style={{ color: C.red, fontSize: 13 }}>{dedMsg}</span>}
              </div>
            </div>

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
                    <div key={order.id} className="pb-admin-card" style={{
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
                        {(() => {
                          const items = parseOrderItems(order.order_metadata)
                          return items.length ? (
                            <><strong>Ordered:</strong> {items.map(orderItemLabel).join(' · ')}<br /></>
                          ) : null
                        })()}
                        <strong>Ship to:</strong> {shippingAddr(order)}
                      </div>

                      {/* Personalization — read before fulfilling */}
                      {(order.order_metadata?.customMessage || order.order_metadata?.verse || order.order_metadata?.color) && (
                        <div style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(200,169,110,0.10)', border: `1px solid ${C.borderGold}`, borderRadius: '6px', fontSize: '13px', lineHeight: '1.65', color: C.body }}>
                          {order.order_metadata?.color && (
                            <div><strong style={{ color: C.heading }}>Band color:</strong> {order.order_metadata.color}</div>
                          )}
                          {order.order_metadata?.customMessage && (
                            <div style={{ marginTop: order.order_metadata?.color ? 5 : 0 }}>
                              <strong style={{ color: C.heading }}>✍️ Dedication / message:</strong>{' '}
                              <span style={{ fontStyle: 'italic', color: C.goldDark }}>&ldquo;{order.order_metadata.customMessage}&rdquo;</span>
                            </div>
                          )}
                          {order.order_metadata?.verse && (
                            <div style={{ marginTop: 5 }}><strong style={{ color: C.heading }}>Verse:</strong> {order.order_metadata.verse}</div>
                          )}
                        </div>
                      )}

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
            {/* Search prayers (by text / name / city) and remove without the band ID */}
            <div style={{ background: C.card, border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Search prayers</div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 14, lineHeight: 1.5 }}>Find any wall prayer by its words, the person&rsquo;s name, city, or band ID — no band ID required. Then remove (hide) or delete it.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={prayerSearch} onChange={e => setPrayerSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchPrayers() }} placeholder="e.g. healing, Maria, Dallas, PB-…" style={{ ...dedInput, maxWidth: 320 }} />
                <button onClick={searchPrayers} disabled={searchingPrayers} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: searchingPrayers ? 'wait' : 'pointer' }}>{searchingPrayers ? 'Searching…' : 'Search'}</button>
              </div>
              {searchResults !== null && (
                searchResults.length === 0 ? (
                  <p style={{ color: C.secondary, fontStyle: 'italic', marginTop: 14 }}>No prayers match that search.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: C.secondary }}>{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}{searchResults.length === 50 ? ' (showing first 50 — narrow your search)' : ''}</div>
                    {searchResults.map(p => (
                      <div key={p.id} style={{ border: `1px solid ${C.borderNavy}`, borderRadius: 8, padding: '12px 14px', background: '#fff' }}>
                        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 6 }}>
                          <strong style={{ color: C.heading }}>{p.user_name || 'Anonymous'}</strong>
                          {' · '}<a href={`/band/${p.band_id}`} target="_blank" rel="noopener noreferrer" style={{ color: C.goldText, textDecoration: 'none', fontFamily: 'monospace' }}>{p.band_id}</a>
                          {(p.city || p.country) && <> &middot; {[p.city, p.country].filter(Boolean).join(', ')}</>}
                          {' · '}{new Date(p.registered_at).toLocaleDateString()}
                          {p.flagged && <span style={{ marginLeft: 8, color: C.red, fontSize: 11, fontWeight: 600 }}>hidden</span>}
                        </div>
                        {p.prayer
                          ? <p style={{ margin: '0 0 10px', fontSize: 14, color: C.body, fontStyle: 'italic' }}>&ldquo;{p.prayer}&rdquo;</p>
                          : <p style={{ margin: '0 0 10px', fontSize: 13, color: C.secondary, fontStyle: 'italic' }}>(prayer removed)</p>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {p.prayer && (
                            <button onClick={() => removeSearchPrayer(p.id)} style={{ padding: '6px 14px', background: C.red, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remove Prayer</button>
                          )}
                          <button onClick={() => deleteSearchRegistration(p.id)} style={{ padding: '6px 14px', background: 'transparent', color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delete Entirely</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Look up a band and remove a specific prayer */}
            <div style={{ background: C.card, border: `1px solid ${C.borderGold}`, borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 18, fontWeight: 700, color: C.heading, marginBottom: 4 }}>Look up a band</div>
              <div style={{ fontSize: 12, color: C.secondary, marginBottom: 14, lineHeight: 1.5 }}>Find a band&rsquo;s prayers and remove a specific one (e.g. a test prayer). Removing clears the text and hides it from the wall; the band&rsquo;s journey is kept.</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={bandLookup} onChange={e => setBandLookup(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') lookupBandPrayers() }} placeholder="Band ID (e.g. PB-TEST1)" style={{ ...dedInput, maxWidth: 260 }} />
                <button onClick={lookupBandPrayers} disabled={lookingUp} style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, cursor: lookingUp ? 'wait' : 'pointer' }}>{lookingUp ? 'Looking…' : 'Look Up'}</button>
              </div>
              {bandPrayers !== null && (
                bandPrayers.length === 0 ? (
                  <p style={{ color: C.secondary, fontStyle: 'italic', marginTop: 14 }}>No prayers found for that band ID.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                    {bandPrayers.map(p => (
                      <div key={p.id} style={{ border: `1px solid ${C.borderNavy}`, borderRadius: 8, padding: '12px 14px', background: '#fff' }}>
                        <div style={{ fontSize: 12, color: C.secondary, marginBottom: 6 }}>
                          <strong style={{ color: C.heading }}>{p.user_name || 'Anonymous'}</strong>
                          {(p.city || p.country) && <> &middot; {[p.city, p.country].filter(Boolean).join(', ')}</>}
                          {' · '}{new Date(p.registered_at).toLocaleDateString()}
                          {p.flagged && <span style={{ marginLeft: 8, color: C.red, fontSize: 11, fontWeight: 600 }}>hidden</span>}
                        </div>
                        {p.prayer
                          ? <p style={{ margin: '0 0 10px', fontSize: 14, color: C.body, fontStyle: 'italic' }}>&ldquo;{p.prayer}&rdquo;</p>
                          : <p style={{ margin: '0 0 10px', fontSize: 13, color: C.secondary, fontStyle: 'italic' }}>(prayer removed)</p>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {p.prayer && (
                            <button onClick={() => removeBandPrayer(p.id)} style={{ padding: '6px 14px', background: C.red, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remove Prayer</button>
                          )}
                          <button onClick={() => deleteBandRegistration(p.id)} style={{ padding: '6px 14px', background: 'transparent', color: C.red, border: `1px solid ${C.red}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delete Entirely</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

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
                    <p style={{ margin: '0 0 8px', color: C.body, fontSize: '14px' }}>{p.prayer}</p>
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
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setCrmUserId(u.id)} style={{ padding: '7px 16px', background: C.navy, color: C.gold, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Customer</button>
                      <a href={`/dashboard?viewAs=${u.id}`} style={{ padding: '7px 16px', background: C.gold, color: C.navy, borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Dashboard</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {crmUserId && <CustomerDetail userId={crmUserId} onClose={() => setCrmUserId(null)} />}

        {/* BAND MANAGEMENT TAB — bands, products, pricing */}
        {activeTab === 'catalog' && (
          <div>
            <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.borderGold}`, marginBottom: 24 }}>
              {(['bands', 'products', 'pricing', 'themes', 'generate'] as const).map(s => (
                <button key={s} onClick={() => setCatalogSub(s)} style={{
                  padding: '8px 18px',
                  background: catalogSub === s ? C.navy : 'transparent',
                  color: catalogSub === s ? C.gold : C.secondary,
                  border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
                  fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                }}>{s === 'generate' ? 'Generate IDs' : s}</button>
              ))}
            </div>
            {catalogSub === 'bands' && <BandsManager />}
            {catalogSub === 'products' && <ProductsManager />}
            {catalogSub === 'pricing' && <PricingManager />}
            {catalogSub === 'themes' && <ThemesManager />}
            {catalogSub === 'generate' && <BatchGenerator />}
          </div>
        )}


        {/* SUBSCRIPTION SHIPMENTS TAB */}
        {activeTab === 'shipments' && (
          <div>
            {shipments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: C.secondary, fontStyle: 'italic' }}>No subscription shipments yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {shipments.map(s => {
                  const bands = s.band_ids || []
                  const isShipped = s.status === 'shipped'
                  const needsAssign = bands.length === 0 && s.status === 'pending'
                  return (
                    <div key={s.id} className="pb-admin-card" style={{ background: C.card, border: `1px solid ${C.borderNavy}`, borderRadius: '10px', padding: '20px 24px', borderLeft: `4px solid ${isShipped ? C.green : needsAssign ? C.gold : C.goldText}`, boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>{s.customer_name || s.shipping_name || 'Subscriber'}</div>
                          <div style={{ fontSize: '13px', color: C.goldText }}>{s.customer_email}</div>
                          <div style={{ fontSize: '12px', color: C.secondary, marginTop: '2px' }}>{new Date(s.created_at).toLocaleDateString()} &middot; {s.bands_quantity} band{s.bands_quantity > 1 ? 's' : ''}{s.band_design ? ` · ${s.band_design}` : ''} &middot; {s.band_color}</div>
                        </div>
                        <span style={{ padding: '2px 10px', borderRadius: '12px', background: isShipped ? C.greenBg : needsAssign ? 'rgba(200,169,110,0.14)' : 'rgba(154,122,53,0.14)', color: isShipped ? C.green : needsAssign ? C.goldText : C.goldDark, fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{s.status}</span>
                      </div>

                      <div style={{ fontSize: '13px', color: C.body, marginBottom: '12px', lineHeight: '1.6' }}>
                        <strong>Ship to:</strong> {[s.shipping_line1, s.shipping_line2, s.shipping_city, s.shipping_state, s.shipping_zip].filter(Boolean).join(', ') || '—'}
                      </div>

                      {(s.dedication_note || s.dedication_recipient) && (
                        <div style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(200,169,110,0.10)', border: `1px solid ${C.borderGold}`, borderRadius: '6px', fontSize: '13px', lineHeight: '1.65', color: C.body }}>
                          {s.dedication_recipient && <div><strong style={{ color: C.heading }}>For:</strong> {s.dedication_recipient}</div>}
                          {s.dedication_note && (
                            <div style={{ marginTop: s.dedication_recipient ? 5 : 0 }}>
                              <strong style={{ color: C.heading }}>✍️ Gift message:</strong>{' '}
                              <span style={{ fontStyle: 'italic', color: C.goldDark }}>&ldquo;{s.dedication_note}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      )}

                      {bands.length > 0 && (
                        <div style={{ marginBottom: '12px', padding: '10px 14px', background: C.silverBg, borderRadius: '6px', fontSize: '13px', border: `1px solid ${C.borderSilver}` }}>
                          <strong style={{ color: C.heading }}>Bands:</strong>{' '}
                          {bands.map((b: string) => (
                            <span key={b} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 8px', background: 'rgba(200,169,110,0.14)', border: `1px solid ${C.borderGold}`, borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: C.goldText }}>{b}</span>
                          ))}
                        </div>
                      )}

                      {isShipped && s.tracking_number && (
                        <div style={{ padding: '10px 14px', background: C.greenBg, border: '1px solid rgba(74,138,106,0.28)', borderRadius: '6px', fontSize: '13px', color: C.green }}>
                          <strong>Tracking:</strong> {s.tracking_number}
                        </div>
                      )}

                      {!isShipped && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          {needsAssign && (
                            <button onClick={() => assignShipment(s)} disabled={shipBusy === s.id} style={{ padding: '8px 18px', background: C.gold, color: C.navy, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: '600' }}>
                              {shipBusy === s.id ? 'Assigning...' : `Assign ${s.bands_quantity} Band${s.bands_quantity > 1 ? 's' : ''} →`}
                            </button>
                          )}
                          {bands.length > 0 && (
                            <>
                              <input value={shipTracking[s.id] || ''} onChange={e => setShipTracking(p => ({ ...p, [s.id]: e.target.value }))} placeholder="Tracking #" style={{ ...dedInput, width: 180 }} />
                              <button onClick={() => shipShipment(s)} disabled={shipBusy === s.id} style={{ padding: '8px 18px', background: C.navy, color: C.gold, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Cinzel, serif', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: '600' }}>
                                {shipBusy === s.id ? '…' : 'Mark Shipped'}
                              </button>
                            </>
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

        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: C.heading, fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600 }}>Sales</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {([['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All time']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSalesDays(val)} style={{ padding: '6px 14px', background: salesDays === val ? C.gold : C.card, color: salesDays === val ? C.navy : C.secondary, border: `1px solid ${salesDays === val ? C.gold : C.borderNavy}`, borderRadius: 20, cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</button>
                ))}
              </div>
            </div>

            {!sales ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.secondary, fontStyle: 'italic' }}>Loading sales…</div>
            ) : (
              <>
                <div className="pb-admin-grid4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                  {[
                    { label: salesDays === 'all' ? 'Revenue (all time)' : `Revenue (${salesDays}d)`, value: money(sales.period.revenueCents) },
                    { label: 'Orders', value: sales.period.orders },
                    { label: 'Avg Order', value: money(sales.period.aovCents) },
                    { label: 'Bands Sold', value: sales.period.bands },
                  ].map(c => (
                    <div key={c.label} style={kpiCard}><div style={kpiValue}>{c.value}</div><div style={kpiLabel}>{c.label}</div></div>
                  ))}
                </div>
                <div className="pb-admin-grid4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'All-Time Revenue', value: money(sales.allTime.revenueCents) },
                    { label: 'Active Subscriptions', value: sales.subscriptions.active },
                    { label: 'Subscription MRR', value: money(sales.subscriptions.mrrCents) },
                    { label: `Referral Revenue · ${sales.referrals.orders} ord`, value: money(sales.referrals.revenueCents) },
                  ].map(c => (
                    <div key={c.label} style={kpiCard}><div style={kpiValue}>{c.value}</div><div style={kpiLabel}>{c.label}</div></div>
                  ))}
                </div>

                <div className="pb-admin-chartgrid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
                  <div style={panel}>
                    <div style={panelHead}>Revenue {salesDays === 'all' ? 'by month' : 'by day'}</div>
                    <div style={{ padding: '18px 16px' }}>
                      {sales.series.length === 0 ? (
                        <div style={{ color: C.secondary, fontStyle: 'italic', fontSize: 13 }}>No sales in this period.</div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
                          {(() => {
                            const max = Math.max(...sales.series.map((s: any) => s.cents), 1)
                            return sales.series.map((s: any) => (
                              <div key={s.label} title={`${s.label}: ${money(s.cents)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
                                <div style={{ width: '100%', maxWidth: 22, height: Math.max(2, Math.round((s.cents / max) * 140)), background: `linear-gradient(180deg, ${C.gold}, ${C.goldText})`, borderRadius: '3px 3px 0 0' }} />
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={panel}>
                    <div style={panelHead}>Top Sellers ({salesDays === 'all' ? 'all time' : salesDays + 'd'})</div>
                    <div>
                      {sales.topSellers.length === 0 ? (
                        <div style={{ padding: 18, color: C.secondary, fontStyle: 'italic', fontSize: 13 }}>No items sold in this period.</div>
                      ) : sales.topSellers.map((t: any, i: number) => (
                        <div key={t.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: i < sales.topSellers.length - 1 ? `1px solid ${C.borderSilver}` : 'none' }}>
                          <div style={{ width: 22, textAlign: 'center', color: C.goldText, fontFamily: 'Cormorant Garamond, serif', fontWeight: 700, fontSize: 16 }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: C.heading, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: C.secondary, fontFamily: 'monospace' }}>{t.slug}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, color: C.heading, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif' }}>{t.units}</div>
                            <div style={{ fontSize: 10, color: C.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Cinzel, serif' }}>units</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
