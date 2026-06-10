'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

export default function NFCRedirect() {
  const params = useParams()

  useEffect(() => {
    const bandId = params?.bandId as string
    if (bandId) window.location.href = `/band/${bandId}`
  }, [params])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4' }}>
      <div style={{ textAlign: 'center', fontFamily: 'Cormorant Garamond, Georgia, serif', color: '#5C6573' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={42} color="#C8A96E" /></div>
        <div style={{ fontStyle: 'italic', color: '#15223B' }}>Opening your band...</div>
      </div>
    </div>
  )
}