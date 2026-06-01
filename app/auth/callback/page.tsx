'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    setTimeout(() => { router.push('/') }, 2000)
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
