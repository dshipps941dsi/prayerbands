'use client'
import { useEffect, useState, Suspense } from 'react'

function OrderSuccessInner() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1500)
  }, [])

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#4a5568'}}>Confirming your order...</div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#e8f4fd,#fdf6e3)',fontFamily:'sans-serif',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'#fff',borderRadius:'20px',padding:'48px 36px',maxWidth:'520px',width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(26,95,160,0.15)',border:'2px solid #4caf7d'}}>
        <div style={{fontSize:'56px',color:'#4caf7d',marginBottom:'16px'}}>✝</div>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'28px',color:'#1a5fa0',marginBottom:'8px'}}>Order Confirmed!</h1>
        <p style={{fontSize:'16px',color:'#4a5568',fontStyle:'italic',marginBottom:'8px',lineHeight:'1.7'}}>Your PrayerBands are on their way.</p>
        <p style={{fontSize:'14px',color:'#8896a8',marginBottom:'32px',lineHeight:'1.7'}}>Each band comes pre-programmed with a unique NFC chip. When you give one away, the recipient just taps their phone to register and see your prayer.</p>

        <div style={{background:'#e8f4fd',borderRadius:'12px',padding:'20px',marginBottom:'28px',textAlign:'left'}}>
          <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'0.15em',textTransform:'uppercase',color:'#2b7bc4',marginBottom:'12px'}}>What Happens Next</div>
          {['You receive a confirmation email','Your bands ship within 3-5 business days','Each band arrives NFC-programmed and ready','Give them away — someone will be prayed over'].map((s,i) => (
            <div key={i} style={{display:'flex',gap:'10px',alignItems:'flex-start',marginBottom:'8px',fontSize:'14px',color:'#4a5568'}}>
              <span style={{color:'#2b7bc4',fontWeight:'700',flexShrink:0}}>{i+1}.</span>{s}
            </div>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <a href="/dashboard" style={{display:'block',background:'#2b7bc4',color:'#fff',padding:'14px 24px',borderRadius:'10px',textDecoration:'none',fontWeight:'700',fontSize:'15px'}}>Go to Dashboard ✝</a>
          <a href="/store" style={{display:'block',border:'2px solid #e2eaf4',color:'#8896a8',padding:'12px 24px',borderRadius:'10px',textDecoration:'none',fontWeight:'700',fontSize:'14px'}}>Order More Bands</a>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccess() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'48px'}}>✝</div></div>}>
      <OrderSuccessInner />
    </Suspense>
  )
}