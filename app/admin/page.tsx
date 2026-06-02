'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [markingShipped, setMarkingShipped] = useState<number | null>(null)
  const [assigningBands, setAssigningBands] = useState<number | null>(null)
  const [availableBands, setAvailableBands] = useState<string[]>([])
  const [selectedBands, setSelectedBands] = useState<{[orderId: number]: string[]}>({})
  const [stats, setStats] = useState({ total: 0, pending: 0, shipped: 0, revenue: 0 })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/signin'
        return
      }
      setAuthorized(true)
      loadData()
    }
    init()
  }, [])

  async function loadData() {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: bands } = await supabase
      .from('bands')
      .select('band_id')
      .eq('status', 'unregistered')
      .is('owner_id', null)
      .limit(500)

    if (orders) {
      setOrders(orders)
      const pending = orders.filter(o => o.status === 'pending').length
      const shipped = orders.filter(o => o.status === 'shipped').length
      const revenue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0)
      setStats({ total: orders.length, pending, shipped, revenue: revenue / 100 })
    }
    if (bands) setAvailableBands(bands.map(b => b.band_id))
    setLoading(false)
  }

  async function markShipped(order: Order) {
    setMarkingShipped(order.id)
    await supabase
      .from('orders')
      .update({ status: 'shipped' })
      .eq('id', order.id)

    // Send shipped email
    await fetch('/api/send-shipped', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.customer_email,
        name: order.customer_name,
        bandIds: selectedBands[order.id] || [],
        quantity: order.order_metadata?.quantity || '1',
      })
    })

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'shipped' } : o))
    setStats(prev => ({ ...prev, pending: prev.pending - 1, shipped: prev.shipped + 1 }))
    setMarkingShipped(null)
  }

  async function assignBands(orderId: number, quantity: number) {
    const toAssign = availableBands.slice(0, quantity)
    setSelectedBands(prev => ({ ...prev, [orderId]: toAssign }))
    setAvailableBands(prev => prev.slice(quantity))
    setAssigningBands(null)

    // Update bands in database
    for (const bandId of toAssign) {
      await supabase
        .from('bands')
        .update({ status: 'assigned' })
        .eq('band_id', bandId)
    }
  }

  const filtered = orders.filter(o => filter === 'all' ? true : o.status === filter)

  const formatAddress = (addr: any) => {
    if (!addr) return 'No address'
    return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
      .filter(Boolean).join(', ')
  }

  if (!authorized || loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0c10',fontFamily:'sans-serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#e8b84b',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#6e7f94'}}>Loading admin panel...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0a0c10',color:'#c9d1d9',fontFamily:'sans-serif',fontSize:'14px'}}>

      {/* Nav */}
      <nav style={{background:'#0f1217',borderBottom:'1px solid #21293a',padding:'0 32px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#e8b84b',display:'flex',alignItems:'center',gap:'8px'}}>✝ PrayerBands Admin</div>
        <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
          <a href="/prayer-wall" style={{fontSize:'12px',color:'#6e7f94',textDecoration:'none'}}>Prayer Wall</a>
          <a href="/shop" style={{fontSize:'12px',color:'#6e7f94',textDecoration:'none'}}>Shop</a>
          <a href="/dashboard" style={{fontSize:'12px',color:'#6e7f94',textDecoration:'none'}}>Dashboard</a>
        </div>
      </nav>

      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'32px 24px'}}>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'28px'}}>
          {[
            {label:'Total Orders', value:stats.total, color:'#4a9eff'},
            {label:'Pending', value:stats.pending, color:'#fb923c'},
            {label:'Shipped', value:stats.shipped, color:'#4ade80'},
            {label:'Revenue', value:`$${stats.revenue.toFixed(2)}`, color:'#e8b84b'},
          ].map((k,i) => (
            <div key={i} style={{background:'#0f1217',border:'1px solid #21293a',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#3d4f63',marginBottom:'8px'}}>{k.label}</div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'32px',color:k.color,fontWeight:'700'}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Available bands */}
        <div style={{background:'#0f1217',border:'1px solid #21293a',borderRadius:'10px',padding:'16px 20px',marginBottom:'20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#3d4f63',marginBottom:'4px'}}>Unassigned Band IDs in Database</div>
            <div style={{fontFamily:'Georgia,serif',fontSize:'24px',color:'#4ade80'}}>{availableBands.length} bands ready</div>
          </div>
          <div style={{fontSize:'13px',color:'#6e7f94',fontStyle:'italic'}}>These will be assigned to orders when you click "Assign Bands"</div>
        </div>

        {/* Filter tabs */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          {['pending','shipped','all'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?'#e8b84b':'transparent',color:filter===f?'#0a0c10':'#6e7f94',border:filter===f?'none':'1px solid #21293a',padding:'7px 18px',borderRadius:'100px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'sans-serif',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {f} {f==='pending'?`(${stats.pending})`:f==='shipped'?`(${stats.shipped})`:``}
            </button>
          ))}
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',background:'#0f1217',borderRadius:'10px',border:'1px solid #21293a'}}>
            <div style={{fontSize:'32px',marginBottom:'12px',opacity:0.4}}>✝</div>
            <div style={{color:'#6e7f94'}}>No {filter} orders</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {filtered.map(order => {
              const qty = parseInt(order.order_metadata?.quantity || '1')
              const type = order.order_metadata?.type || 'standard'
              const assigned = selectedBands[order.id] || []
              const amount = (order.amount_total / 100).toFixed(2)

              return (
                <div key={order.id} style={{background:'#0f1217',border:`1px solid ${order.status==='shipped'?'#1a3a1a':order.status==='pending'?'#3a2a0a':'#21293a'}`,borderRadius:'10px',overflow:'hidden'}}>

                  {/* Order header */}
                  <div style={{padding:'16px 20px',borderBottom:'1px solid #21293a',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
                    <div style={{fontFamily:'Georgia,serif',fontSize:'18px',color:'#e8b84b'}}>Order #{order.id}</div>
                    <div style={{fontSize:'12px',color:'#6e7f94'}}>{new Date(order.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'10px'}}>
                      <span style={{background:order.status==='shipped'?'rgba(74,222,128,0.1)':order.status==='pending'?'rgba(251,146,60,0.1)':'rgba(74,158,255,0.1)',color:order.status==='shipped'?'#4ade80':order.status==='pending'?'#fb923c':'#4a9eff',padding:'4px 12px',borderRadius:'100px',fontSize:'11px',fontWeight:'700',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                        {order.status}
                      </span>
                      <span style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#e8b84b',fontWeight:'700'}}>${amount}</span>
                    </div>
                  </div>

                  {/* Order body */}
                  <div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'20px'}}>

                    {/* Customer */}
                    <div>
                      <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#3d4f63',marginBottom:'8px'}}>Customer</div>
                      <div style={{fontWeight:'700',color:'#f0f4f8',marginBottom:'4px'}}>{order.customer_name || 'N/A'}</div>
                      <div style={{fontSize:'13px',color:'#6e7f94',marginBottom:'4px'}}>{order.customer_email}</div>
                      <div style={{fontSize:'12px',color:'#4a9eff',marginTop:'8px',lineHeight:'1.6'}}>{formatAddress(order.shipping_address)}</div>
                    </div>

                    {/* Order details */}
                    <div>
                      <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#3d4f63',marginBottom:'8px'}}>Order Details</div>
                      <div style={{marginBottom:'4px'}}><span style={{color:'#6e7f94'}}>Type:</span> <span style={{color:'#f0f4f8',fontWeight:'600',textTransform:'capitalize'}}>{type}</span></div>
                      <div style={{marginBottom:'4px'}}><span style={{color:'#6e7f94'}}>Quantity:</span> <span style={{color:'#f0f4f8',fontWeight:'600'}}>{qty} band{qty>1?'s':''}</span></div>
                      {order.order_metadata?.customMessage && (
                        <div style={{marginTop:'8px',padding:'8px 12px',background:'rgba(232,184,75,0.08)',border:'1px solid rgba(232,184,75,0.2)',borderRadius:'6px',fontSize:'13px',color:'#c9d1d9',fontStyle:'italic'}}>
                          "{order.order_metadata.customMessage}"
                        </div>
                      )}
                      {order.order_metadata?.verse && (
                        <div style={{marginTop:'6px',fontSize:'12px',color:'#2dd4bf'}}>📖 {order.order_metadata.verse}</div>
                      )}
                    </div>

                    {/* Band assignment + actions */}
                    <div>
                      <div style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#3d4f63',marginBottom:'8px'}}>Band Assignment</div>

                      {assigned.length > 0 ? (
                        <div style={{marginBottom:'12px'}}>
                          {assigned.map(b => (
                            <div key={b} style={{fontFamily:'monospace',fontSize:'13px',color:'#e8b84b',marginBottom:'3px'}}>✝ {b}</div>
                          ))}
                        </div>
                      ) : (
                        <div style={{fontSize:'13px',color:'#3d4f63',marginBottom:'12px',fontStyle:'italic'}}>No bands assigned yet</div>
                      )}

                      {order.status === 'pending' && (
                        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                          {assigned.length === 0 && (
                            <button
                              onClick={() => assignBands(order.id, qty)}
                              disabled={availableBands.length < qty}
                              style={{background:'rgba(74,158,255,0.1)',color:'#4a9eff',border:'1px solid rgba(74,158,255,0.3)',padding:'8px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'sans-serif',letterSpacing:'0.06em'}}
                            >
                              Assign {qty} Band{qty>1?'s':''} →
                            </button>
                          )}
                          <button
                            onClick={() => markShipped(order)}
                            disabled={markingShipped === order.id}
                            style={{background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.3)',padding:'8px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'sans-serif',letterSpacing:'0.06em'}}
                          >
                            {markingShipped === order.id ? 'Marking...' : '✓ Mark as Shipped'}
                          </button>
                        </div>
                      )}

                      {order.status === 'shipped' && (
                        <div style={{fontSize:'12px',color:'#4ade80',fontWeight:'700'}}>✓ Shipped</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}