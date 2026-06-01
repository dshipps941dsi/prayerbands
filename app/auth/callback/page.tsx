'use client'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallback() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = '/dashboard'
      } else {
        // Handle hash fragment tokens
        supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            window.location.href = '/dashboard'
          } else {
            window.location.href = '/signin'
          }
        })
      }
    })
  }, [])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#4a5568'}}>Signing you in...</div>
      </div>
    </div>
  )
}