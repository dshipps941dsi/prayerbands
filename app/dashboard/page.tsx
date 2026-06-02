'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#4a5568'}}>Loading your ministry...</div>
      </div>
    </div>
  )

  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/signin'
    return null
  }

  return (
    <div style={{minHeight:'100vh',background:'#f0f6ff',fontFamily:'sans-serif'}}>
      {/* Nav */}
      <nav style={{background:'#0d3d6e',padding:'0 40px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:'Georgia,serif',fontSize:'20px',color:'#f5a623',display:'flex',alignItems:'center',gap:'8px'}}>✝ PrayerBands</div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{fontSize:'14px',color:'rgba(255,255,255,0.7)'}}>{user.email}</span>
          <button onClick={async () => {
  const { createBrowserClient } = await import('@supabase/ssr')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  await supabase.auth.signOut()
  window.location.href = '/'
}} style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',background:'none',border:'none',cursor:'pointer',fontFamily:'sans-serif'}}>
  Sign out
</button>
        </div>
      </nav>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'40px 24px'}}>

        {/* Welcome */}
        <div style={{background:'linear-gradient(135deg,#0d3d6e,#1aabaa)',borderRadius:'20px',padding:'36px 40px',color:'#fff',marginBottom:'28px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',right:'40px',top:'50%',transform:'translateY(-50%)',fontSize:'160px',opacity:'0.05',lineHeight:'1'}}>✝</div>
          <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.2em',textTransform:'uppercase',opacity:'0.6',marginBottom:'8px'}}>Welcome back</div>
          <div style={{fontFamily:'Georgia,serif',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>
            {user.user_metadata?.full_name || user.email?.split('@')[0]} ✝
          </div>
          <div style={{fontSize:'15px',opacity:'0.75',fontStyle:'italic'}}>Your ministry dashboard — track your bands and their impact.</div>
        </div>

        {/* Quick stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'28px'}}>
          {[
            {icon:'📿',num:'0',label:'My Bands',color:'#2b7bc4'},
            {icon:'🌍',num:'0',label:'Countries',color:'#1aabaa'},
            {icon:'🙏',num:'0',label:'Prayers',color:'#4caf7d'},
            {icon:'👤',num:'0',label:'People Reached',color:'#f5a623'},
          ].map((s,i) => (
            <div key={i} style={{background:'#fff',borderRadius:'14px',padding:'22px',border:'1.5px solid #e2eaf4',boxShadow:'0 2px 8px rgba(26,95,160,0.08)'}}>
              <div style={{fontSize:'28px',marginBottom:'10px'}}>{s.icon}</div>
              <div style={{fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:'700',color:s.color,lineHeight:'1',marginBottom:'4px'}}>{s.num}</div>
              <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.1em',textTransform:'uppercase',color:'#8896a8'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'28px'}}>
          <a href="/register" style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1.5px solid #e2eaf4',boxShadow:'0 2px 8px rgba(26,95,160,0.08)',textDecoration:'none',display:'flex',alignItems:'center',gap:'16px',transition:'all 0.2s'}}>
            <div style={{fontSize:'36px'}}>📿</div>
            <div>
              <div style={{fontSize:'16px',fontWeight:'700',color:'#1a5fa0',marginBottom:'4px'}}>Register a Band</div>
              <div style={{fontSize:'14px',color:'#8896a8'}}>Add a new band to your journey</div>
            </div>
          </a>
          <a href="/shop" style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1.5px solid #e2eaf4',boxShadow:'0 2px 8px rgba(26,95,160,0.08)',textDecoration:'none',display:'flex',alignItems:'center',gap:'16px'}}>
            <div style={{fontSize:'36px'}}>🛍️</div>
            <div>
              <div style={{fontSize:'16px',fontWeight:'700',color:'#1a5fa0',marginBottom:'4px'}}>Order More Bands</div>
              <div style={{fontSize:'14px',color:'#8896a8'}}>Standard $5 · Custom $10</div>
            </div>
          </a>
        </div>

        {/* Empty state */}
        <div style={{background:'#fff',borderRadius:'14px',padding:'48px',border:'1.5px solid #e2eaf4',textAlign:'center',boxShadow:'0 2px 8px rgba(26,95,160,0.08)'}}>
          <div style={{fontSize:'48px',marginBottom:'16px',opacity:'0.4'}}>✝</div>
          <div style={{fontFamily:'Georgia,serif',fontSize:'22px',color:'#1a5fa0',marginBottom:'8px'}}>Your Ministry Starts Here</div>
          <p style={{fontSize:'15px',color:'#8896a8',maxWidth:'400px',margin:'0 auto 24px',lineHeight:'1.7'}}>Order your first bands, register them, and pass them on. Every band you give out becomes a prayer that travels the world.</p>
          <a href="/shop" style={{background:'#2b7bc4',color:'#fff',padding:'14px 32px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',textDecoration:'none',display:'inline-block'}}>Get Your First Bands ✝</a>
        </div>

      </div>
    </div>
  )
}