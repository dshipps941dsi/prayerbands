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

  const bandId = (params?.bandId as string) || ''

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#15223B' }}>
      <div style={{ textAlign: 'center', fontFamily: 'Cormorant Garamond, Georgia, serif', color: '#B9C2D0' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={42} color="#C8A96E" /></div>
        <div style={{ fontStyle: 'italic', color: '#F6F1E4' }}>Opening your band...</div>
        {/* Fallback if the JS redirect doesn't fire (JS disabled / slow device). */}
        {bandId && (
          <a href={`/band/${bandId}`} style={{ display: 'inline-block', marginTop: 14, color: '#C8A96E', fontStyle: 'italic', fontSize: 14 }}>
            Tap here if your band doesn&apos;t open
          </a>
        )}
      </div>
    </div>
  )
}