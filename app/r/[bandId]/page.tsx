'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function NFCRedirect() {
  const params = useParams()

  useEffect(() => {
    const bandId = params?.bandId as string
    if (!bandId) return

    // Check if this device has registered this band before
    const key = `registered_${bandId}`
    const hasRegistered = localStorage.getItem(key)

    if (hasRegistered) {
      // Returning wearer — show daily blessing
      window.location.href = `/blessing/${bandId}`
    } else {
      // New registration
      window.location.href = `/register?id=${bandId}`
    }
  }, [params])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fdf8f0',fontFamily:'sans-serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#C8A96E',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#9B7B62'}}>Opening your band...</div>
      </div>
    </div>
  )
}