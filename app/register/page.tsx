'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

function RegisterRedirect() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const id = searchParams?.get('id')
    if (id) {
      window.location.href = `/band/${id.toUpperCase()}`
    } else {
      window.location.href = '/'
    }
  }, [searchParams])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4' }}>
      <div style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", color: '#5C6573' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={42} color="#C8A96E" /></div>
        <div style={{ fontStyle: 'italic', fontSize: 14 }}>Opening your band...</div>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4' }}><div style={{ fontSize: 40, color: '#C8A96E' }}>✝</div></div>}>
      <RegisterRedirect />
    </Suspense>
  )
}
