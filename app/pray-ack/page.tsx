'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PrayerBandsLogo from '@/components/PrayerBandsLogo'

function PrayAckInner() {
  const searchParams = useSearchParams()
  const id = searchParams?.get('id')
const name = searchParams?.get('name')
const email = searchParams?.get('email')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [requesterName, setRequesterName] = useState('')

  useEffect(() => {
    if (!id || !email) { setStatus('error'); return }
    fetch('/api/pray-ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainPrayerId: id, acknowledgerName: name, acknowledgerEmail: email })
    })
      .then(r => r.json())
      .then(d => {
        setRequesterName(d.requesterName || 'your friend')
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [id, email, name])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F1E4', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ background: '#FFFDF8', borderRadius: 14, padding: '48px 40px', maxWidth: 440, width: '100%', border: '1px solid rgba(200,169,110,0.34)', boxShadow: '0 4px 24px rgba(10,22,40,0.08)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}><PrayerBandsLogo size={40} color="#C8A96E" /></div>
        {status === 'loading' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#C8A96E' }}>✝</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, color: '#5C6573' }}>Recording your prayer...</div>
          </div>
        )}
        {status === 'done' && (
          <div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🙏</div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, fontWeight: 600, color: '#15223B', marginBottom: 12 }}>Thank you for praying!</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#2A3344', lineHeight: 1.7, marginBottom: 24 }}>
              <strong>{requesterName}</strong> has been notified that you're standing with them in prayer. ✝
            </p>
            <div style={{ background: '#ECEEF1', borderRadius: 10, padding: '16px 20px', marginBottom: 24, border: '1px solid rgba(92,101,115,0.20)' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, color: '#2A3344', fontStyle: 'italic', margin: 0, lineHeight: 1.7 }}>
                "Again, truly I tell you that if two of you on earth agree about anything they ask for, it will be done for them by my Father in heaven." — Matthew 18:19
              </p>
            </div>
            <a href="https://prayerbands.com" style={{ display: 'inline-block', background: '#C8A96E', color: '#0A1628', padding: '13px 32px', borderRadius: 4, textDecoration: 'none', fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Visit Prayer Bands ✝
            </a>
          </div>
        )}
        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#C8A96E' }}>✝</div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 600, color: '#15223B', marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#5C6573' }}>This prayer acknowledgment link may have expired.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PrayAckPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cormorant Garamond, Georgia, serif', background: '#F6F1E4', color: '#C8A96E', fontSize: 48 }}>✝</div>}>
      <PrayAckInner />
    </Suspense>
  )
}
