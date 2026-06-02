'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function NFCRedirect() {
  const params = useParams()
  
  useEffect(() => {
    const bandId = params?.bandId
    if (bandId) {
      window.location.href = `/register?id=${bandId}`
    }
  }, [params])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f6ff',fontFamily:'sans-serif',textAlign:'center'}}>
      <div>
        <div style={{fontSize:'48px',color:'#f5a623',marginBottom:'16px'}}>✝</div>
        <div style={{fontSize:'16px',color:'#4a5568'}}>Opening your band...</div>
      </div>
    </div>
  )
}