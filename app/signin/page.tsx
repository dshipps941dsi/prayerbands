'use client'
import { useState } from 'react'

export default function SignIn() {
  const [loading, setLoading] = useState(false)

  async function signInWithGoogle() {
    setLoading(true)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://prayerbands.com/' }
    })
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#e8f4fd,#fdf6e3)',fontFamily:'sans-serif'}}>
      <div style={{background:'#fff',borderRadius:'20px',padding:'48px 40px',maxWidth:'400px',width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(26,95,160,0.15)'}}>
        <div style={{fontSize:'44px',marginBottom:'16px'}}>✝</div>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'28px',color:'#1a5fa0',marginBottom:'8px'}}>Welcome to PrayerBands</h1>
        <p style={{fontSize:'15px',color:'#8896a8',fontStyle:'italic',marginBottom:'36px',lineHeight:'1.6'}}>Sign in to track your bands and watch your ministry grow.</p>
        <button onClick={signInWithGoogle} disabled={loading} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',background:'#fff',border:'2px solid #e2eaf4',padding:'14px 20px',borderRadius:'12px',fontSize:'16px',fontWeight:'700',color:'#1e2a38',cursor:'pointer'}}>
          {loading ? 'Redirecting...' : 'Continue with Google ✝'}
        </button>
        <p style={{fontSize:'12px',color:'#b0bec5',marginTop:'20px'}}>We never sell your data or show ads.</p>
      </div>
    </div>
  )
}
