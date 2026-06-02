'use client'
import { useState } from 'react'

export default function Shop() {
  const [loading, setLoading] = useState<string | null>(null)
  const [customQty, setCustomQty] = useState(1)
  const [standardQty, setStandardQty] = useState(1)
  const [customMessage, setCustomMessage] = useState('')
  const [verse, setVerse] = useState('')
  const [color, setColor] = useState('blue')

  async function checkout(type: string, quantity: number) {
    setLoading(type)
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        quantity,
        customMessage: type === 'custom' ? customMessage : '',
        verse: type === 'custom' ? verse : '',
        color: type === 'custom' ? color : 'blue',
      })
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  const colors = [
    { id: 'blue', label: 'Ocean Blue', hex: '#2b7bc4' },
    { id: 'teal', label: 'Teal', hex: '#1aabaa' },
    { id: 'black', label: 'Midnight', hex: '#1a1a2e' },
    { id: 'red', label: 'Crimson', hex: '#c0392b' },
    { id: 'green', label: 'Sage', hex: '#4caf7d' },
    { id: 'purple', label: 'Royal', hex: '#7c5cbf' },
  ]

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#e8f4fd,#fdf6e3)',fontFamily:'sans-serif'}}>
      <nav style={{background:'rgba(255,255,255,0.95)',borderBottom:'2px solid #c8e6f7',padding:'0 40px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <a href="/" style={{fontFamily:'Georgia,serif',fontSize:'20px',fontWeight:'700',color:'#1a5fa0',textDecoration:'none'}}>✝ PrayerBands</a>
        <a href="/register" style={{fontSize:'13px',color:'#2b7bc4',textDecoration:'none',fontWeight:'600'}}>Register a Band</a>
      </nav>

      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'48px 24px 80px'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.25em',textTransform:'uppercase',color:'#1aabaa',marginBottom:'12px'}}>Ministry Store</div>
          <h1 style={{fontFamily:'Georgia,serif',fontSize:'clamp(32px,5vw,52px)',color:'#1a5fa0',marginBottom:'12px',fontWeight:'300'}}>Give the Gift of Prayer</h1>
          <p style={{fontSize:'18px',color:'#4a5568',maxWidth:'520px',margin:'0 auto',lineHeight:'1.8',fontStyle:'italic'}}>"Go into all the world and preach the gospel." — Mark 16:15</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>

          {/* STANDARD */}
          <div style={{background:'#fff',borderRadius:'20px',overflow:'hidden',boxShadow:'0 8px 32px rgba(26,95,160,0.12)',border:'1.5px solid #e2eaf4'}}>
            <div style={{background:'linear-gradient(135deg,#0d3d6e,#2b7bc4)',padding:'32px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'160px',opacity:'0.05'}}>✝</div>
              <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'3px solid rgba(255,255,255,0.3)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px'}}>📿</div>
              <h2 style={{fontFamily:'Georgia,serif',fontSize:'26px',color:'#fff',marginBottom:'4px',fontWeight:'400'}}>Standard Band</h2>
              <div style={{fontFamily:'Georgia,serif',fontSize:'42px',color:'#f5a623',fontWeight:'700',lineHeight:'1'}}>$5</div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.6)',marginTop:'4px'}}>per band</div>
            </div>

            <div style={{padding:'28px'}}>
              <ul style={{listStyle:'none',padding:0,margin:'0 0 24px'}}>
                {['Unique PB-XXXXX laser engraved ID','NFC chip — tap to register instantly','PrayerBands.com ✝ on exterior','Prayer chain notifications','Full journey tracking & map'].map((f,i) => (
                  <li key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',marginBottom:'10px',fontSize:'14px',color:'#4a5568'}}>
                    <span style={{color:'#4caf7d',fontWeight:'700',flexShrink:0}}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Quantity</label>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <button onClick={()=>setStandardQty(Math.max(1,standardQty-1))} style={{width:'36px',height:'36px',borderRadius:'50%',border:'2px solid #e2eaf4',background:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontFamily:'Georgia,serif',fontSize:'24px',fontWeight:'700',color:'#1a5fa0',minWidth:'32px',textAlign:'center'}}>{standardQty}</span>
                  <button onClick={()=>setStandardQty(standardQty+1)} style={{width:'36px',height:'36px',borderRadius:'50%',border:'2px solid #e2eaf4',background:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <span style={{fontSize:'14px',color:'#8896a8'}}>${(5*standardQty).toFixed(2)} total</span>
                </div>
              </div>

              <button
                onClick={()=>checkout('standard', standardQty)}
                disabled={loading==='standard'}
                style={{width:'100%',background:'linear-gradient(135deg,#2b7bc4,#1aabaa)',color:'#fff',border:'none',padding:'16px',borderRadius:'12px',fontSize:'16px',fontWeight:'700',cursor:'pointer',boxShadow:'0 4px 20px rgba(43,123,196,0.3)'}}
              >
                {loading==='standard'?'Redirecting…':`Order ${standardQty} Band${standardQty>1?'s':''} ✝`}
              </button>
            </div>
          </div>

          {/* CUSTOM */}
          <div style={{background:'#fff',borderRadius:'20px',overflow:'hidden',boxShadow:'0 8px 32px rgba(26,95,160,0.2)',border:'2px solid #f5a623',position:'relative'}}>
            <div style={{position:'absolute',top:'16px',right:'16px',background:'#f5a623',color:'#fff',fontSize:'10px',fontWeight:'700',padding:'4px 10px',borderRadius:'100px',letterSpacing:'0.1em',zIndex:1}}>MOST POPULAR</div>

            <div style={{background:'linear-gradient(135deg,#7a4500,#f5a623)',padding:'32px',textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'160px',opacity:'0.05'}}>✝</div>
              <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'3px solid rgba(255,255,255,0.3)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px'}}>✨</div>
              <h2 style={{fontFamily:'Georgia,serif',fontSize:'26px',color:'#fff',marginBottom:'4px',fontWeight:'400'}}>Custom Band</h2>
              <div style={{fontFamily:'Georgia,serif',fontSize:'42px',color:'#fff',fontWeight:'700',lineHeight:'1'}}>$10</div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.7)',marginTop:'4px'}}>per band</div>
            </div>

            <div style={{padding:'28px'}}>
              <ul style={{listStyle:'none',padding:0,margin:'0 0 20px'}}>
                {['Everything in Standard','Your personal prayer message','Your chosen scripture verse','Custom band color','Ships with gift packaging'].map((f,i) => (
                  <li key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',marginBottom:'10px',fontSize:'14px',color:'#4a5568'}}>
                    <span style={{color:'#f5a623',fontWeight:'700',flexShrink:0}}>✓</span>{f}
                  </li>
                ))}
              </ul>

              {/* Color picker */}
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Band Color</label>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {colors.map(c => (
                    <button key={c.id} onClick={()=>setColor(c.id)} title={c.label} style={{width:'28px',height:'28px',borderRadius:'50%',background:c.hex,border:color===c.id?'3px solid #1a5fa0':'2px solid transparent',cursor:'pointer',boxShadow:color===c.id?'0 0 0 2px #fff,0 0 0 4px #1a5fa0':'none'}}/>
                  ))}
                </div>
              </div>

              {/* Custom message */}
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Your Prayer Message <span style={{color:'#b0bec5',fontWeight:'400'}}>(optional)</span></label>
                <textarea value={customMessage} onChange={e=>setCustomMessage(e.target.value)} placeholder="A prayer for whoever receives this band…" style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'10px 12px',borderRadius:'8px',fontFamily:'Georgia,serif',fontSize:'14px',fontStyle:'italic',outline:'none',resize:'vertical',minHeight:'72px',lineHeight:'1.6',boxSizing:'border-box'}}/>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Scripture Verse <span style={{color:'#b0bec5',fontWeight:'400'}}>(optional)</span></label>
                <input value={verse} onChange={e=>setVerse(e.target.value)} placeholder='e.g. "John 3:16"' style={{width:'100%',background:'#f7f3ee',border:'2px solid #e2eaf4',color:'#1e2a38',padding:'10px 12px',borderRadius:'8px',fontFamily:'sans-serif',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#8896a8',marginBottom:'8px'}}>Quantity</label>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <button onClick={()=>setCustomQty(Math.max(1,customQty-1))} style={{width:'36px',height:'36px',borderRadius:'50%',border:'2px solid #e2eaf4',background:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontFamily:'Georgia,serif',fontSize:'24px',fontWeight:'700',color:'#1a5fa0',minWidth:'32px',textAlign:'center'}}>{customQty}</span>
                  <button onClick={()=>setCustomQty(customQty+1)} style={{width:'36px',height:'36px',borderRadius:'50%',border:'2px solid #e2eaf4',background:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <span style={{fontSize:'14px',color:'#8896a8'}}>${(10*customQty).toFixed(2)} total</span>
                </div>
              </div>

              <button
                onClick={()=>checkout('custom', customQty)}
                disabled={loading==='custom'}
                style={{width:'100%',background:'linear-gradient(135deg,#f5a623,#e8891a)',color:'#fff',border:'none',padding:'16px',borderRadius:'12px',fontSize:'16px',fontWeight:'700',cursor:'pointer',boxShadow:'0 4px 20px rgba(245,166,35,0.4)'}}
              >
                {loading==='custom'?'Redirecting…':`Order ${customQty} Custom Band${customQty>1?'s':''} ✝`}
              </button>
            </div>
          </div>

        </div>

        {/* Trust badges */}
        <div style={{display:'flex',gap:'24px',justifyContent:'center',marginTop:'40px',flexWrap:'wrap'}}>
          {['🔒 Secure checkout via Stripe','✈ Ships within 3-5 days','✝ Every purchase funds ministry','💌 NFC pre-programmed & ready'].map((b,i) => (
            <div key={i} style={{fontSize:'13px',color:'#8896a8',display:'flex',alignItems:'center',gap:'4px'}}>{b}</div>
          ))}
        </div>

      </div>
    </div>
  )
}