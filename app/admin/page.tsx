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
    await supabase.from('orders').update({ status: 'shipped' }).eq('id', order.id)
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
    for (const bandId of toAssign) {
      await supabase.from('bands').update({ status: 'assigned' }).eq('band_id', bandId)
    }
  }

  const filtered = orders.filter(o => filter === 'all' ? true : o.status === filter)

  const formatAddress = (addr: any) => {
    if (!addr) return null
    return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ')
  }

  if (!authorized || loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FDFAF5',fontFamily:'Georgia,serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#C8A96E',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#9B7B62',fontFamily:'Lato,sans-serif'}}>Loading admin panel...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FDFAF5',fontFamily:'Georgia,serif',color:'#2C1A0E'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
        .playfair { font-family: 'Playfair Display', serif; }
        .lato { font-family: 'Lato', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <nav style={{background:'#2C1A0E',padding:'0 40px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'#C8A96E',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#fff'}}>✝</div>
          <span className="playfair" style={{fontSize:17,fontWeight:600,color:'#FDFAF5'}}>PrayerBands</span>
          <span className="lato" style={{fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'#C8A96E',marginLeft:8}}>Admin</span>
        </div>
        <div style={{display:'flex',gap:20}}>
          {['/', '/prayer-wall', '/store', '/dashboard'].map((href, i) => (
            <a key={i} href={href} className="lato" style={{fontSize:12,letterSpacing:'0.1em',textTransform:'uppercase',color:'rgba(253,250,245,0.5)',textDecoration:'none'}}>
              {['Home','Prayer Wall','Store','Dashboard'][i]}
            </a>
          ))}
        </div>
      </nav>

      <div style={{maxWidth:'1160px',margin:'0 auto',padding:'40px 32px'}}>

        {/* Page title */}
        <div style={{marginBottom:'32px'}}>
          <span className="lato" style={{fontSize:11,letterSpacing:'0.25em',textTransform:'uppercase',color:'#C8A96E',display:'block',marginBottom:8}}>Ministry Operations</span>
          <h1 className="playfair" style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:700,lineHeight:1.15,marginBottom:4}}>Order Management</h1>
          <div style={{width:40,height:2,background:'#C8A96E'}}/>
        </div>

        {/* KPI cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'28px'}}>
          {[
            {label:'Total Orders', value:stats.total, color:'#7B8FAE'},
            {label:'Pending', value:stats.pending, color:'#C8A96E'},
            {label:'Shipped', value:stats.shipped, color:'#7BAE8E'},
            {label:'Revenue', value:`$${stats.revenue.toFixed(2)}`, color:'#AE7B7B'},
          ].map((k,i) => (
            <div key={i} style={{background:'#fff',border:'1px solid #E8DFD0',borderTop:`3px solid ${k.color}`,borderRadius:'10px',padding:'20px 22px'}}>
              <div className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',marginBottom:'8px'}}>{k.label}</div>
              <div className="playfair" style={{fontSize:'32px',color:k.color,fontWeight:'700',lineHeight:1}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Band inventory */}
        <div style={{background:'#fff',border:'1px solid #E8DFD0',borderLeft:'4px solid #7BAE8E',borderRadius:'10px',padding:'16px 20px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',marginBottom:'4px'}}>Available Band IDs</div>
            <div className="playfair" style={{fontSize:'24px',color:'#7BAE8E',fontWeight:'700'}}>{availableBands.length} bands ready to assign</div>
          </div>
          <div className="lato" style={{fontSize:'13px',color:'#C8B49A',fontStyle:'italic'}}>Click "Assign Bands" on any order to assign IDs from inventory</div>
        </div>

        {/* Filter tabs */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          {[
            {id:'pending', label:`Pending (${stats.pending})`},
            {id:'shipped', label:`Shipped (${stats.shipped})`},
            {id:'all', label:'All Orders'},
          ].map(f => (
            <button key={f.id} onClick={()=>setFilter(f.id)} className="lato" style={{background:filter===f.id?'#2C1A0E':'transparent',color:filter===f.id?'#FDFAF5':'#9B7B62',border:filter===f.id?'1px solid #2C1A0E':'1px solid #E8DFD0',padding:'8px 18px',borderRadius:'100px',fontSize:'12px',fontWeight:'700',cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',transition:'all 0.2s'}}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px',background:'#fff',borderRadius:'10px',border:'1px solid #E8DFD0'}}>
            <div style={{fontSize:'32px',marginBottom:'12px',opacity:0.3}}>✝</div>
            <div className="lato" style={{color:'#9B7B62',fontSize:'14px'}}>No {filter} orders</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {filtered.map(order => {
              const qty = parseInt(order.order_metadata?.quantity || '1')
              const type = order.order_metadata?.type || 'standard'
              const assigned = selectedBands[order.id] || []
              const amount = (order.amount_total / 100).toFixed(2)
              const address = formatAddress(order.shipping_address)
              const statusColor = order.status === 'shipped' ? '#7BAE8E' : order.status === 'pending' ? '#C8A96E' : '#7B8FAE'

              return (
                <div key={order.id} style={{background:'#fff',border:'1px solid #E8DFD0',borderTop:`3px solid ${statusColor}`,borderRadius:'10px',overflow:'hidden',boxShadow:'0 2px 12px rgba(44,26,14,0.05)'}}>

                  {/* Header */}
                  <div style={{padding:'16px 24px',borderBottom:'1px solid #F5EFE4',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap',background:'#FDFAF5'}}>
                    <div className="playfair" style={{fontSize:'18px',fontWeight:'600',color:'#2C1A0E'}}>Order #{order.id}</div>
                    <div className="lato" style={{fontSize:'12px',color:'#C8B49A'}}>{new Date(order.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                    <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'12px'}}>
                      <span className="lato" style={{background:`${statusColor}18`,color:statusColor,border:`1px solid ${statusColor}44`,padding:'4px 12px',borderRadius:'100px',fontSize:'11px',fontWeight:'700',letterSpacing:'0.08em',textTransform:'uppercase'}}>
                        {order.status}
                      </span>
                      <span className="playfair" style={{fontSize:'22px',fontWeight:'700',color:'#C8A96E'}}>${amount}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'24px'}}>

                    {/* Customer */}
                    <div>
                      <div className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',marginBottom:'10px'}}>Customer</div>
                      <div className="playfair" style={{fontSize:'17px',fontWeight:'600',marginBottom:'4px'}}>{order.customer_name || 'N/A'}</div>
                      <div className="lato" style={{fontSize:'13px',color:'#9B7B62',marginBottom:'8px'}}>{order.customer_email}</div>
                      {address ? (
                        <div className="lato" style={{fontSize:'12px',color:'#7B8FAE',lineHeight:'1.6',background:'#F5EFE4',padding:'8px 12px',borderRadius:'6px'}}>{address}</div>
                      ) : (
                        <div className="lato" style={{fontSize:'12px',color:'#C8B49A',fontStyle:'italic'}}>No address on file</div>
                      )}
                    </div>

                    {/* Order details */}
                    <div>
                      <div className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',marginBottom:'10px'}}>Order Details</div>
                      <div className="lato" style={{fontSize:'14px',marginBottom:'6px'}}><span style={{color:'#9B7B62'}}>Type:</span> <strong style={{textTransform:'capitalize'}}>{type}</strong></div>
                      <div className="lato" style={{fontSize:'14px',marginBottom:'12px'}}><span style={{color:'#9B7B62'}}>Quantity:</span> <strong>{qty} band{qty>1?'s':''}</strong></div>
                      {order.order_metadata?.customMessage && (
                        <div className="playfair" style={{fontSize:'14px',fontStyle:'italic',color:'#4A2E1A',padding:'10px 14px',background:'rgba(200,169,110,0.06)',borderLeft:'3px solid #C8A96E',borderRadius:'0 6px 6px 0',marginBottom:'8px'}}>
                          "{order.order_metadata.customMessage}"
                        </div>
                      )}
                      {order.order_metadata?.verse && (
                        <div className="lato" style={{fontSize:'12px',color:'#7BAE8E',fontWeight:'700'}}>📖 {order.order_metadata.verse}</div>
                      )}
                    </div>

                    {/* Band assignment */}
                    <div>
                      <div className="lato" style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',color:'#9B7B62',marginBottom:'10px'}}>Band Assignment</div>

                      {assigned.length > 0 ? (
                        <div style={{marginBottom:'12px'}}>
                          {assigned.map(b => (
                            <div key={b} className="lato" style={{fontFamily:'monospace',fontSize:'13px',color:'#C8A96E',marginBottom:'4px',letterSpacing:'0.1em'}}>✝ {b}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="lato" style={{fontSize:'13px',color:'#C8B49A',marginBottom:'12px',fontStyle:'italic'}}>No bands assigned yet</div>
                      )}

                      {order.status === 'pending' && (
                        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                          {assigned.length === 0 && (
                            <button
                              onClick={() => assignBands(order.id, qty)}
                              disabled={availableBands.length < qty}
                              className="lato"
                              style={{background:'#F5EFE4',color:'#6B4C35',border:'1px solid #E8DFD0',padding:'9px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:'700',cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',transition:'all 0.2s'}}
                            >
                              Assign {qty} Band{qty>1?'s':''} →
                            </button>
                          )}
                          <button
                            onClick={() => markShipped(order)}
                            disabled={markingShipped === order.id}
                            className="lato"
                            style={{background:'#2C1A0E',color:'#FDFAF5',border:'none',padding:'9px 14px',borderRadius:'6px',fontSize:'12px',fontWeight:'700',cursor:'pointer',letterSpacing:'0.08em',textTransform:'uppercase',transition:'all 0.2s'}}
                          >
                            {markingShipped === order.id ? 'Marking...' : '✓ Mark as Shipped'}
                          </button>
                        </div>
                      )}

                      {order.status === 'shipped' && (
                        <div className="lato" style={{fontSize:'13px',color:'#7BAE8E',fontWeight:'700'}}>✓ Shipped successfully</div>
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