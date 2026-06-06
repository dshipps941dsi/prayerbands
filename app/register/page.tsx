'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6EF' }}>
      <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif', color: '#7A6A5A' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✝</div>
        <div style={{ fontStyle: 'italic' }}>Opening your band...</div>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: 40 }}>✝</div></div>}>
      <RegisterRedirect />
    </Suspense>
  )
}