'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function NFCRedirect() {
  const params = useParams()

  useEffect(() => {
    const bandId = params?.bandId as string
    if (bandId) window.location.href = `/band/${bandId}`
  }, [params])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6EF' }}>
      <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', color: '#7A6A5A' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✝</div>
        <div style={{ fontStyle: 'italic' }}>Opening your band...</div>
      </div>
    </div>
  )
}